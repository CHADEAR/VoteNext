// src/modules/public/public.service.js
const { pool } = require("../../config/db");

/**
 * Get round id + show_id by public slug (for verify-email and vote token)
 */
exports.getRoundAndShowBySlug = async (publicSlug) => {
  const r = await pool.query(
    `SELECT id AS round_id, show_id FROM rounds WHERE public_slug = $1`,
    [publicSlug]
  );
  if (r.rowCount === 0) return null;
  return r.rows[0];
};

/**
 * Verify email for voting: format, MX, Hunter, และยังไม่เคยโหวตใน round นี้
 * Returns { roundId, showId, email } for JWT payload on success.
 */
exports.verifyEmailForVote = async (publicSlug, email, hunterApiKey) => {
  const emailVerification = require("./emailVerification.service");
  const trimmed = email.trim().toLowerCase();

  if (!emailVerification.checkFormat(trimmed)) {
    throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
  }

  const roundAndShow = await exports.getRoundAndShowBySlug(publicSlug);
  if (!roundAndShow) {
    throw new Error("ไม่พบโพลนี้");
  }

  const hasVoted = await exports.hasVotedInRound(roundAndShow.round_id, trimmed);
  if (hasVoted) {
    throw new Error("อีเมลนี้เคยโหวตในรอบนี้แล้ว");
  }

  const mxOk = await emailVerification.checkMx(trimmed);
  if (!mxOk) {
    throw new Error("ไม่พบ MX record ของโดเมนอีเมล");
  }

  await emailVerification.checkHunter(trimmed, hunterApiKey);

  return {
    roundId: roundAndShow.round_id,
    showId: roundAndShow.show_id,
    email: trimmed,
  };
};

/**
 * เช็คว่า email นี้เคยโหวตใน round นี้หรือยัง (ตาราง votes)
 */
exports.hasVotedInRound = async (roundId, email) => {
  const r = await pool.query(
    `SELECT 1 FROM votes WHERE round_id = $1 AND email = $2 LIMIT 1`,
    [roundId, email.trim().toLowerCase()]
  );
  return r.rowCount > 0;
};

/**
 * Submit online vote (email from JWT voteToken; also insert into votes for round-level uniqueness)
 */
exports.submitOnlineVote = async ({ roundId, contestantId, email }) => {
  if (!roundId || !contestantId || !email) {
    throw new Error("roundId, contestantId and email are required");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) load round w/ locking (need show_id for votes table)
    const r = await client.query(
      `SELECT id, show_id, status AS db_status, start_time, end_time, counter_type
       FROM rounds
       WHERE id=$1
       FOR UPDATE`,
      [roundId]
    );

    if (r.rowCount === 0) {
      throw new Error("Round not found");
    }

    const round = r.rows[0];
    const showId = round.show_id;

    // 2) compute voting status
    const now = new Date();
    let status = round.db_status;

    if (round.counter_type === "auto" && round.start_time && round.end_time) {
      const start = new Date(round.start_time);
      const end = new Date(round.end_time);

      if (now < start) status = "pending";
      else if (now >= start && now < end) status = "voting";
      else if (now >= end) status = "closed";
    }

    // 3) auto sync status closed to DB
    if (status === "closed" && round.db_status !== "closed") {
      await client.query(
        `UPDATE rounds SET status='closed' WHERE id=$1`,
        [roundId]
      );
    }

    // 4) final guard for voting
    if (status !== "voting") {
      throw new Error("Voting is not open");
    }

    // 5) contestant validation
    const contestantRes = await client.query(
      `SELECT 1 FROM round_contestants
       WHERE round_id=$1 AND contestant_id=$2`,
      [roundId, contestantId]
    );

    if (contestantRes.rowCount === 0) {
      throw new Error("Contestant is not in this round");
    }

    const emailLower = email.trim().toLowerCase();

    // 6) insert into votes (round_id, email) - กันโหวตซ้ำต่อ round
    await client.query(
      `INSERT INTO votes (round_id, email) VALUES ($1, $2)`,
      [roundId, emailLower]
    );

    // 7) insert into online_votes
    await client.query(
      `INSERT INTO online_votes (round_id, contestant_id, voter_email)
       VALUES ($1, $2, $3)`,
      [roundId, contestantId, emailLower]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      const isVotes = err.constraint && err.constraint.includes("votes");
      throw new Error(
        isVotes
          ? "อีเมลนี้เคยโหวตในรายการนี้แล้ว"
          : "This email has already voted in this round"
      );
    }

    throw err;
  } finally {
    client.release();
  }
};


/**
 * Get rank by public slug (live or final based on results_computed)
 */
exports.getLiveRankBySlug = async (publicSlug) => {
  // 1) หา round จาก slug
  const roundRes = await pool.query(
    `SELECT id, results_computed
     FROM rounds
     WHERE public_slug = $1`,
    [publicSlug]
  );

  if (roundRes.rowCount === 0) {
    throw new Error("Round not found");
  }

  const roundId = roundRes.rows[0].id;
  const resultsComputed = roundRes.rows[0].results_computed;
  
  console.log(`Round ${roundId} results_computed:`, resultsComputed);
  console.log(`Type of results_computed:`, typeof resultsComputed);

  if (resultsComputed) {
    // Return final scoreboard - แสดงทุกคนไม่ว่าจะมีการคำนวณคะแนนหรือไม่
    const result = await pool.query(
      `SELECT
        c.id,
        c.stage_name,
        c.image_url,
        rc.online_votes,
        rc.remote_votes,
        rc.judge_score,
        rc.total_score,
        rc.rank
      FROM round_contestants rc
      JOIN contestants c ON c.id = rc.contestant_id
      WHERE rc.round_id = $1
      ORDER BY 
        CASE WHEN rc.rank IS NOT NULL THEN rc.rank ELSE 999999 END ASC, 
        CASE WHEN rc.total_score IS NOT NULL THEN rc.total_score ELSE 0 END DESC, 
        c.stage_name ASC`,
      [roundId]
    );
    return result.rows;
  } else {
    // Return live scoreboard
    const result = await pool.query(
      `SELECT
        c.id,
        c.stage_name,
        c.image_url,
        rc.rank,
        COUNT(DISTINCT ov.id) AS online_votes,
        COUNT(DISTINCT rv.id) AS remote_votes,
        COUNT(DISTINCT ov.id) + COUNT(DISTINCT rv.id) AS live_score
      FROM round_contestants rc
      JOIN contestants c ON c.id = rc.contestant_id
      LEFT JOIN online_votes ov
        ON ov.round_id = rc.round_id
       AND ov.contestant_id = rc.contestant_id
      LEFT JOIN remote_votes rv
        ON rv.round_id = rc.round_id
       AND rv.contestant_id = rc.contestant_id
      WHERE rc.round_id = $1
      GROUP BY c.id, rc.rank
      ORDER BY live_score DESC, c.stage_name ASC`,
      [roundId]
    );
    return result.rows;
  }
};

exports.getRoomBySlug = async (publicSlug) => {
  if (!publicSlug) {
    throw new Error("publicSlug is required");
  }

  // 1) load round
  const roundRes = await pool.query(
    `
    SELECT
      r.id,
      r.show_id,
      r.round_name,
      r.description,
      r.start_time,
      r.end_time,
      r.status,
      r.vote_mode,
      r.counter_type,
      r.public_slug,
      r.results_computed
    FROM rounds r
    WHERE r.public_slug = $1
    `,
    [publicSlug]
  );

  if (roundRes.rowCount === 0) {
    throw new Error("Round not found");
  }

  const round = roundRes.rows[0];

  // 2) load contestants in this round
  const contestantsRes = await pool.query(
    `
    SELECT
      c.id,
      c.stage_name,
      c.image_url,
      c.description,
      rc.rank,
      rc.online_votes,
      rc.remote_votes,
      rc.judge_score,
      rc.total_score
    FROM round_contestants rc
    JOIN contestants c ON c.id = rc.contestant_id
    WHERE rc.round_id = $1
    ORDER BY
      rc.rank NULLS LAST,
      c.stage_name ASC
    `,
    [round.id]
  );

  // 3) return combined object
  return {
    ...round,
    contestants: contestantsRes.rows,
  };
};

exports.checkIfUserVoted = async (publicSlug, email) => {
  const row = await exports.getRoundAndShowBySlug(publicSlug);
  if (!row) throw new Error("Round not found");
  return exports.hasVotedInRound(row.round_id, email);
};
