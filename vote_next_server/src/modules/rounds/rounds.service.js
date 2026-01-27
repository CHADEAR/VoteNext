// vote_next_server/src/modules/rounds/rounds.service.js
const { pool } = require("../../config/db");

function normalizeVoteMode(mode) {
  const s = String(mode || "").toLowerCase().trim();
  if (s === "online") return "online";
  if (s === "remote") return "remote";
  if (s === "hybrid") return "hybrid";
  if (s.includes("online") && s.includes("remote")) return "hybrid";
  return "online";
}

function normalizeCounterType(counter) {
  const s = String(counter || "").toLowerCase().trim();
  if (s === "manual" || s === "auto") return s;
  return null;
}

/**
 * ตรวจสอบสถานะ round และ auto-open/auto-close ถ้าถึงเวลา
 * NOTE: auto-start/auto-stop ทำงานเฉพาะ counter_type='auto'
 */
async function ensureRoundIsUpToDate(round) {
  const now = new Date();

  // ✅ ทำเฉพาะรอบ auto เท่านั้น
  if (round.counter_type === "auto") {
    if (round.status === "pending" && round.start_time) {
      if (now >= new Date(round.start_time)) {
        await startRoundAuto(round.id);
        return getRound(round.id);
      }
    }

    if (round.status === "voting" && round.end_time) {
      if (now >= new Date(round.end_time)) {
        await closeRound(round.id, "auto");
        return { ...round, status: "closed" };
      }
    }
  }

  return round;
}

async function getRound(roundId) {
  const result = await pool.query(
    `SELECT id, status, start_time, end_time, counter_type, vote_mode
     FROM rounds
     WHERE id = $1`,
    [roundId]
  );

  if (result.rowCount === 0) throw new Error("Round not found");
  return ensureRoundIsUpToDate(result.rows[0]);
}

/**
 * AUTO start ใช้เมื่อถึง start_time
 * กัน start ซ้ำด้วย WHERE status='pending'
 */
async function startRoundAuto(roundId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE rounds
       SET status='voting',
           start_time = COALESCE(start_time, NOW())
       WHERE id = $1 AND status='pending'`,
      [roundId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * ปิดรอบโหวต (manual / auto ใช้ร่วมกัน)
 */
async function closeRound(roundId, reason) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT id, status
       FROM rounds
       WHERE id = $1
       FOR UPDATE`,
      [roundId]
    );

    if (result.rowCount === 0) throw new Error("Round not found");
    const round = result.rows[0];

    if (round.status === "closed") {
      await client.query("COMMIT");
      return;
    }

    await client.query(
      `UPDATE rounds
       SET status = 'closed'
       WHERE id = $1`,
      [roundId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Load round with contestants and their scores
 */
async function getRound(roundId) {
  const client = await pool.connect();
  try {
    // Get basic round info
    const roundResult = await client.query(
      `SELECT 
          r.*, 
          s.title as show_title,
          EXISTS (
            SELECT 1 FROM round_contestants 
            WHERE round_id = r.id AND computed_at IS NOT NULL
            LIMIT 1
          ) as results_computed
       FROM rounds r
       JOIN shows s ON r.show_id = s.id
       WHERE r.id = $1`,
      [roundId]
    );

    if (roundResult.rowCount === 0) {
      throw new Error("Round not found");
    }

    const round = await ensureRoundIsUpToDate(roundResult.rows[0]);

    // Get contestants with their scores
    const contestantsResult = await client.query(
      `WITH 
      online_votes AS (
        SELECT 
          contestant_id,
          COUNT(*) as count
        FROM online_votes
        WHERE round_id = $1
        GROUP BY contestant_id
      ),
      remote_votes AS (
        SELECT 
          contestant_id,
          COUNT(*) as count
        FROM remote_votes
        WHERE round_id = $1
        GROUP BY contestant_id
      ),
      judge_scores AS (
        SELECT 
          contestant_id,
          COALESCE(score, 0) as score
        FROM judge_scores
        WHERE round_id = $1
      )
      
      SELECT 
        c.id, 
        c.stage_name as name, 
        c.image_url,
        rc.rank,
        CASE 
          WHEN rc.computed_at IS NOT NULL THEN rc.online_votes
          ELSE COALESCE(ov.count, 0)
        END as online_votes,
        CASE 
          WHEN rc.computed_at IS NOT NULL THEN rc.remote_votes
          ELSE COALESCE(rv.count, 0)
        END as remote_votes,
        CASE 
          WHEN rc.computed_at IS NOT NULL THEN rc.judge_score
          ELSE COALESCE(js.score, 0)
        END as judge_score,
        CASE 
          WHEN rc.computed_at IS NOT NULL THEN rc.total_score
          ELSE (COALESCE(ov.count, 0) + COALESCE(rv.count, 0) + COALESCE(js.score, 0))
        END as total_score
      FROM contestants c
      JOIN round_contestants rc ON c.id = rc.contestant_id
      LEFT JOIN online_votes ov ON c.id = ov.contestant_id
      LEFT JOIN remote_votes rv ON c.id = rv.contestant_id
      LEFT JOIN judge_scores js ON c.id = js.contestant_id
      WHERE rc.round_id = $1
      ORDER BY total_score DESC, c.stage_name ASC`,
      [roundId]
    );

    // Add contestants to round object
    round.contestants = contestantsResult.rows.map(c => ({
      id: c.id,
      name: c.name,
      image_url: c.image_url,
      rank: c.rank,
      online_votes: Number(c.online_votes) || 0,
      remote_votes: Number(c.remote_votes) || 0,
      judge_score: Number(c.judge_score) || 0,
      total_score: Number(c.total_score) || 0
    }));

    return round;
  } finally {
    client.release();
  }
}

/**
 * MANUAL start (pending -> voting)
 * กดปุ่มจากหน้า admin
 */
async function startRound(roundId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT id, status
       FROM rounds
       WHERE id = $1
       FOR UPDATE`,
      [roundId]
    );

    if (result.rowCount === 0) throw new Error("Round not found");
    const round = result.rows[0];

    if (round.status !== "pending") {
      throw new Error("Only pending round can be started");
    }

    const updated = await client.query(
      `UPDATE rounds
       SET status='voting',
           start_time = COALESCE(start_time, NOW())
       WHERE id = $1 AND status='pending'
       RETURNING id, status, start_time, end_time, counter_type, vote_mode`,
      [roundId]
    );

    await client.query("COMMIT");
    return updated.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function createFirstRound({
  showId,
  roundName = "Round 1",
  startTime = null,
  endTime = null,
  createdBy = null,
  voteMode,
  counterType,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const showRes = await client.query(
      `SELECT id FROM shows WHERE id = $1 FOR UPDATE`,
      [showId]
    );
    if (showRes.rowCount === 0) throw new Error("Show not found");

    const dup = await client.query(
      `SELECT 1 FROM rounds WHERE show_id = $1`,
      [showId]
    );
    if (dup.rowCount > 0) throw new Error("First round already exists");

    const contestantsRes = await client.query(
      `SELECT id FROM contestants WHERE show_id = $1`,
      [showId]
    );
    if (contestantsRes.rowCount < 2) throw new Error("At least 2 contestants required");

    const resolvedVoteMode = normalizeVoteMode(voteMode);
    const normCounter = normalizeCounterType(counterType);

    // ถ้าไม่ได้ส่ง counterType มา -> ใช้เวลาเป็นตัวตัดสิน (เหมือนเดิม)
    const resolvedCounterType =
      normCounter ?? (startTime && endTime ? "auto" : "manual");

    // manual: ไม่ควรมี start/end (กัน auto-start)
    const st = resolvedCounterType === "auto" ? startTime : null;
    const et = resolvedCounterType === "auto" ? endTime : null;

    const roundRes = await client.query(
      `
      INSERT INTO rounds
        (show_id, round_name, status, start_time, end_time, created_by, counter_type, vote_mode)
      VALUES
        ($1, $2, 'pending', $3::timestamptz, $4::timestamptz, $5::uuid, $6, $7)
      RETURNING *
      `,
      [showId, roundName, st, et, createdBy, resolvedCounterType, resolvedVoteMode]
    );

    const round = roundRes.rows[0];

    await client.query(
      `UPDATE rounds SET public_slug = COALESCE(public_slug, id::text) WHERE id = $1`,
      [round.id]
    );

    const ids = contestantsRes.rows.map((r) => r.id);
    await client.query(
      `
      INSERT INTO round_contestants (round_id, contestant_id)
      SELECT $1, unnest($2::uuid[])
      `,
      [round.id, ids]
    );

    await client.query("COMMIT");
    return { round, contestantCount: ids.length };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function createNextRound({
  fromRoundId,
  mode,
  takeTop,
  wildcards = [],
  removes = [],
  roundName,
  startTime,
  endTime,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const r = await client.query(
      `SELECT * FROM rounds WHERE id = $1 FOR UPDATE`,
      [fromRoundId]
    );
    if (r.rowCount === 0) throw new Error("Round not found");
    const prevRound = r.rows[0];
    if (prevRound.status !== "closed") throw new Error("Previous round must be closed");

    const v = await client.query(
      `SELECT 1 FROM rounds WHERE show_id = $1 AND status = 'voting'`,
      [prevRound.show_id]
    );
    if (v.rowCount > 0) throw new Error("There is an active voting round");

    const scores = await client.query(
      `SELECT contestant_id, total_score, rank
       FROM round_contestants
       WHERE round_id = $1
         AND computed_at IS NOT NULL
       ORDER BY rank ASC, total_score DESC, contestant_id`,
      [fromRoundId]
    );
    if (scores.rowCount === 0) throw new Error("Round results not computed yet");

    let selected = [];
    if (mode === "auto") {
      if (!takeTop || takeTop < 2) throw new Error("takeTop must be >= 2");
      selected = scores.rows.slice(0, takeTop).map((r) => r.contestant_id);
    } else if (mode === "advanced") {
      if (!takeTop || takeTop < 2) throw new Error("takeTop must be >= 2");
      const top = scores.rows.slice(0, takeTop).map((r) => r.contestant_id);
      selected = [...new Set([...top, ...wildcards])].filter((id) => !removes.includes(id));
    } else {
      throw new Error("Invalid mode");
    }

    if (selected.length < 2) throw new Error("Next round must have at least 2 contestants");

    const resolvedCounterType = startTime && endTime ? "auto" : "manual";
    const st = resolvedCounterType === "auto" ? startTime : null;
    const et = resolvedCounterType === "auto" ? endTime : null;

    const nr = await client.query(
      `INSERT INTO rounds
       (show_id, round_name, status, start_time, end_time, vote_mode, counter_type)
       VALUES ($1, $2, 'pending', $3::timestamptz, $4::timestamptz, $5, $6)
       RETURNING *`,
      [
        prevRound.show_id,
        roundName || "Next Round",
        st,
        et,
        prevRound.vote_mode || "online",
        resolvedCounterType,
      ]
    );

    const newRound = nr.rows[0];

    // ✅ set public_slug = round.id (match first round behavior)
    await client.query(
      `UPDATE rounds SET public_slug = id::text WHERE id = $1`,
      [newRound.id]
    );

    // ✅ set public_slug = round.id (match first round behavior)
    await client.query(
      `UPDATE rounds SET public_slug = id::text WHERE id = $1`,
      [newRound.id]
    );

    await client.query(
      `UPDATE rounds SET public_slug = COALESCE(public_slug, id::text) WHERE id = $1`,
      [newRound.id]
    );

    for (const cid of selected) {
      await client.query(
        `INSERT INTO round_contestants (round_id, contestant_id)
         VALUES ($1, $2)`,
        [newRound.id, cid]
      );
    }

    await client.query("COMMIT");
    return { round: newRound, contestants: selected };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function computeRoundResults(roundId, judgeScores = []) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if round exists and is closed
    const roundResult = await client.query(
      `SELECT id, status, show_id 
       FROM rounds 
       WHERE id = $1 
       FOR UPDATE`,
      [roundId]
    );

    if (roundResult.rows.length === 0) {
      throw new Error('Round not found');
    }

    const round = roundResult.rows[0];

    if (round.status !== 'closed') {
      throw new Error('Cannot compute results for a round that is not closed');
    }

    // Save judge scores if provided
    if (Array.isArray(judgeScores) && judgeScores.length > 0) {
      for (const { contestantId, score } of judgeScores) {
        await client.query(
          `INSERT INTO judge_scores (round_id, contestant_id, score)
           VALUES ($1, $2, $3)
           ON CONFLICT (round_id, contestant_id) 
           DO UPDATE SET score = EXCLUDED.score`,
          [roundId, contestantId, score]
        );
      }
    }

    // Get show to check if it's already finalized
    const showResult = await client.query(
      `SELECT id, finalized FROM shows WHERE id = $1 FOR UPDATE`,
      [round.show_id]
    );

    if (showResult.rows.length === 0) {
      throw new Error('Show not found');
    }

    if (showResult.rows[0].finalized) {
      throw new Error('Show is already finalized');
    }

    // Get all contestants with online/remote/judge scores
    const result = await client.query(
      `WITH online_counts AS (
         SELECT 
           contestant_id,
           COUNT(*) as online_votes
         FROM online_votes
         WHERE round_id = $1
         GROUP BY contestant_id
       ),
       remote_counts AS (
         SELECT 
           contestant_id,
           COUNT(*) as remote_votes
         FROM remote_votes
         WHERE round_id = $1
         GROUP BY contestant_id
       ),
       judge_scores AS (
         SELECT 
           contestant_id,
           COALESCE(score, 0) as judge_score
         FROM judge_scores
         WHERE round_id = $1
       )
       SELECT 
         rc.contestant_id,
         c.stage_name as name,
         c.image_url,
         COALESCE(oc.online_votes, 0) as online_votes,
         COALESCE(rcount.remote_votes, 0) as remote_votes,
         COALESCE(js.judge_score, 0) as judge_score,
         (COALESCE(oc.online_votes, 0) + COALESCE(rcount.remote_votes, 0) + COALESCE(js.judge_score, 0)) as total_score
       FROM round_contestants rc
       JOIN contestants c ON rc.contestant_id = c.id
       LEFT JOIN online_counts oc ON oc.contestant_id = rc.contestant_id
       LEFT JOIN remote_counts rcount ON rcount.contestant_id = rc.contestant_id
       LEFT JOIN judge_scores js ON js.contestant_id = rc.contestant_id
       WHERE rc.round_id = $1
       ORDER BY 
         total_score DESC, 
         c.stage_name`,
      [roundId]
    );

    // Update the round_contestants with the computed scores and ranks
    // Handle ties by giving the same rank to contestants with the same score
    let currentRank = 1;
    let previousTotal = null;
    let rankToUse = 1;
    
    for (let i = 0; i < result.rows.length; i++) {
      const contestant = result.rows[i];
      
      // If this contestant has the same score as the previous one, they get the same rank
      if (previousTotal !== null && contestant.total_score === previousTotal) {
        // Same rank as previous contestant
      } else {
        rankToUse = currentRank;
      }

      await client.query(
        `UPDATE round_contestants 
         SET online_votes = $1,
             remote_votes = $2,
             judge_score = $3,
             total_score = $4,
             rank = $5,
             computed_at = NOW()
         WHERE round_id = $6 AND contestant_id = $7`,
        [
          contestant.online_votes,
          contestant.remote_votes,
          contestant.judge_score,
          contestant.total_score,
          rankToUse,
          roundId,
          contestant.contestant_id
        ]
      );

      // Update previous values for next iteration
      previousTotal = contestant.total_score;
      currentRank++;
    }

    // Mark round as results_computed=true
    await client.query(
      `UPDATE rounds 
       SET results_computed = true
       WHERE id = $1`,
      [roundId]
    );

    await client.query('COMMIT');
  
    // Return the results with the computed ranks
    const finalResults = await client.query(
      `SELECT 
         rc.contestant_id as id,
         c.stage_name as name,
         c.image_url,
         rc.online_votes,
         rc.remote_votes,
         rc.judge_score,
         rc.total_score,
         rc.rank
       FROM round_contestants rc
       JOIN contestants c ON rc.contestant_id = c.id
       WHERE rc.round_id = $1
       ORDER BY rc.rank, rc.total_score DESC, c.stage_name`,
      [roundId]
    );
  
    return finalResults.rows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Finalize the show with the final lineup
 * @param {string} roundId - The ID of the final round
 * @param {string[]} lineup - Array of contestant IDs in final lineup
 * @param {number} target - Target number of contestants to debut
 * @returns {Promise<Object>} The updated show with final lineup
 */
async function finalizeShow(roundId, lineup, target) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Get the round with show_id
    const roundResult = await client.query(
      `SELECT show_id, status FROM rounds WHERE id = $1 FOR UPDATE`,
      [roundId]
    );

    if (roundResult.rows.length === 0) {
      throw new Error('Round not found');
    }

    const round = roundResult.rows[0];

    // Verify round is closed and computed
    if (round.status !== 'closed') {
      throw new Error('Cannot finalize show: round is not closed');
    }

    // Verify show is not already finalized
    const showResult = await client.query(
      `SELECT id, finalized FROM shows WHERE id = $1 FOR UPDATE`,
      [round.show_id]
    );

    if (showResult.rows.length === 0) {
      throw new Error('Show not found');
    }

    const show = showResult.rows[0];

    if (show.finalized) {
      throw new Error('Show is already finalized');
    }

    // Verify all contestants in lineup exist and are in the round
    if (lineup && lineup.length > 0) {
      const contestantResult = await client.query(
        `SELECT id FROM contestants WHERE id = ANY($1::uuid[])`,
        [lineup]
      );
      
      if (contestantResult.rows.length !== lineup.length) {
        throw new Error('One or more contestants not found');
      }

      // Verify contestants are in the round
      const roundContestantsResult = await client.query(
        `SELECT contestant_id 
         FROM round_contestants 
         WHERE round_id = $1 AND contestant_id = ANY($2::uuid[])`,
        [roundId, lineup]
      );

      if (roundContestantsResult.rows.length !== lineup.length) {
        throw new Error('One or more contestants are not in this round');
      }
    }

    // Update show with final lineup and mark as finalized
    const updateShowResult = await client.query(
      `UPDATE shows 
       SET finalized = true, 
           final_lineup = $1
       WHERE id = $2
       RETURNING *`,
      [lineup, round.show_id]
    );

    await client.query('COMMIT');
    
    return {
      ...updateShowResult.rows[0],
      target_debut: target || lineup?.length || 0
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  ensureRoundIsUpToDate,
  closeRound,
  getRound,
  startRound,
  createFirstRound,
  createNextRound,
  computeRoundResults,
};
