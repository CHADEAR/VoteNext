// src/modules/public/public.service.js
const { pool } = require("../../config/db");

/**
 * Submit online vote (email required)
 */
exports.submitOnlineVote = async ({ roundId, contestantId, email }) => {
  if (!roundId || !contestantId || !email) {
    throw new Error("roundId, contestantId and email are required");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) load round w/ locking
    const r = await client.query(
      `SELECT id, status AS db_status, start_time, end_time, counter_type
       FROM rounds
       WHERE id=$1
       FOR UPDATE`,
      [roundId]
    );

    if (r.rowCount === 0) {
      throw new Error("Round not found");
    }

    const round = r.rows[0];

    // 2) compute hybrid status
    const now = new Date();
    let hybridStatus = round.db_status;

    if (round.counter_type === "auto" && round.start_time && round.end_time) {
      const start = new Date(round.start_time);
      const end = new Date(round.end_time);

      if (now < start) hybridStatus = "pending";
      else if (now >= start && now < end) hybridStatus = "voting";
      else if (now >= end) hybridStatus = "closed";
    }

    // 3) auto sync status closed to DB
    if (hybridStatus === "closed" && round.db_status !== "closed") {
      await client.query(
        `UPDATE rounds SET status='closed' WHERE id=$1`,
        [roundId]
      );
    }

    // 4) final guard for voting
    if (hybridStatus !== "voting") {
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

    // 6) insert vote
    await client.query(
      `INSERT INTO online_votes (round_id, contestant_id, voter_email)
       VALUES ($1, $2, $3)`,
      [roundId, contestantId, email.toLowerCase()]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      throw new Error("This email has already voted in this round");
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

  if (resultsComputed) {
    // Return final scoreboard
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
        AND rc.computed_at IS NOT NULL
      ORDER BY rc.rank ASC, rc.total_score DESC, c.stage_name ASC`,
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
