// vote_next_server/src/modules/rounds/rounds.service.js
const { pool } = require("../../config/db");

/**
 * ตรวจสอบสถานะ round และ auto-open/auto-close ถ้าถึงเวลา
 * @param {Object} round
 * @returns {Promise<Object>}
 */
async function ensureRoundIsUpToDate(round) {
  const now = new Date();

  // --- AUTO-START --- (pending -> voting)
  if (round.status === "pending" && round.start_time) {
    if (now >= new Date(round.start_time)) {
      // idempotent safe
      await startRoundAuto(round.id);
      // re-fetch for consistency
      return getRound(round.id);
    }
  }

  // --- AUTO-STOP --- (voting -> closed)
  if (round.status === "voting" && round.end_time) {
    if (now >= new Date(round.end_time)) {
      await closeRound(round.id, "auto");
      return { ...round, status: "closed" };
    }
  }

  return round;
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

    if (result.rowCount === 0) {
      throw new Error("Round not found");
    }

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
 * โหลด round พร้อม ensure
 */
async function getRound(roundId) {
  const result = await pool.query(
    `SELECT id, status, start_time, end_time   -- <== เพิ่ม start_time
     FROM rounds
     WHERE id = $1`,
    [roundId]
  );

  if (result.rowCount === 0) {
    throw new Error("Round not found");
  }

  return ensureRoundIsUpToDate(result.rows[0]);
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

    if (result.rowCount === 0) {
      throw new Error("Round not found");
    }

    const round = result.rows[0];

    if (round.status !== "pending") {
      throw new Error("Only pending round can be started");
    }

    const updated = await client.query(
      `UPDATE rounds
       SET status='voting',
           start_time = COALESCE(start_time, NOW())
       WHERE id = $1 AND status='pending'   -- <== กัน start ซ้ำ
       RETURNING id, status, start_time, end_time`,
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
  roundName = 'Round 1',
  startTime = null,
  endTime = null,
  createdBy = null
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) lock show
    const showRes = await client.query(
      `SELECT id FROM shows WHERE id = $1 FOR UPDATE`,
      [showId]
    );
    if (showRes.rowCount === 0) {
      throw new Error('Show not found');
    }

    // 2) prevent duplicate first round
    const dup = await client.query(
      `SELECT 1 FROM rounds WHERE show_id = $1`,
      [showId]
    );
    if (dup.rowCount > 0) {
      throw new Error('First round already exists');
    }

    // 3) get contestants
    const contestantsRes = await client.query(
      `SELECT id FROM contestants WHERE show_id = $1`,
      [showId]
    );
    if (contestantsRes.rowCount < 2) {
      throw new Error('At least 2 contestants required');
    }

    // 4) create round
    const roundRes = await client.query(
      `
      INSERT INTO rounds
        (show_id, round_name, status, start_time, end_time, created_by, counter_type)
      VALUES
        (
          $1,
          $2,
          'pending',
          $3::timestamptz,
          $4::timestamptz,
          $5::uuid,
          CASE
            WHEN $3 IS NOT NULL AND $4 IS NOT NULL THEN 'auto'
            ELSE 'manual'
          END
        )
      RETURNING *
      `,
      [showId, roundName, startTime, endTime, createdBy]
    );

    const round = roundRes.rows[0];

    // ✅ 4.1 set public_slug = round.id (ใช้ id ไปก่อน)
    await client.query(
      `UPDATE rounds SET public_slug = id::text WHERE id = $1`,
      [round.id]
    );

    // 5) map contestants → round_contestants
    const ids = contestantsRes.rows.map(r => r.id);
    await client.query(
      `
      INSERT INTO round_contestants (round_id, contestant_id)
      SELECT $1, unnest($2::uuid[])
      `,
      [round.id, ids]
    );

    await client.query('COMMIT');
    return { round, contestantCount: ids.length };

  } catch (e) {
    await client.query('ROLLBACK');
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
    await client.query('BEGIN');

    // 1) โหลด round เดิม + lock
    const r = await client.query(
      `SELECT * FROM rounds WHERE id = $1 FOR UPDATE`,
      [fromRoundId]
    );
    if (r.rowCount === 0) throw new Error('Round not found');
    const prevRound = r.rows[0];
    if (prevRound.status !== 'closed')
      throw new Error('Previous round must be closed');

    // 2) ห้ามมี round voting ใน show เดียวกัน
    const v = await client.query(
      `SELECT 1 FROM rounds WHERE show_id = $1 AND status = 'voting'`,
      [prevRound.show_id]
    );
    if (v.rowCount > 0)
      throw new Error('There is an active voting round');

    // 3) ดึงผลคะแนน
    const scores = await client.query(
      `SELECT contestant_id, final_score
       FROM round_results
       WHERE round_id = $1
       ORDER BY final_score DESC`,
      [fromRoundId]
    );
    if (scores.rowCount === 0)
      throw new Error('Round results not computed yet');

    // 4) เลือกผู้ผ่านเข้ารอบ
    let selected = [];
    if (mode === 'auto') {
      if (!takeTop || takeTop < 2)
        throw new Error('takeTop must be >= 2');
      selected = scores.rows.slice(0, takeTop).map(r => r.contestant_id);
    } else if (mode === 'advanced') {
      if (!takeTop || takeTop < 2)
        throw new Error('takeTop must be >= 2');
      const top = scores.rows.slice(0, takeTop).map(r => r.contestant_id);
      selected = [...new Set([...top, ...wildcards])]
        .filter(id => !removes.includes(id));
    } else {
      throw new Error('Invalid mode');
    }

    if (selected.length < 2)
      throw new Error('Next round must have at least 2 contestants');

    // 5) สร้าง round ใหม่
    const nr = await client.query(
      `INSERT INTO rounds
       (show_id, round_name, status, start_time, end_time)
       VALUES ($1, $2, 'pending', $3, $4)
       RETURNING *`,
      [
        prevRound.show_id,
        roundName || 'Next Round',
        startTime || null,
        endTime || null,
      ]
    );
    const newRound = nr.rows[0];

    // 6) ผูก contestants
    for (const cid of selected) {
      await client.query(
        `INSERT INTO round_contestants (round_id, contestant_id)
         VALUES ($1, $2)`,
        [newRound.id, cid]
      );
    }

    await client.query('COMMIT');
    return { round: newRound, contestants: selected };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function computeRoundResults(roundId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) โหลด round + lock
    const roundRes = await client.query(
      `SELECT id, status, show_id
       FROM rounds
       WHERE id = $1
       FOR UPDATE`,
      [roundId]
    );

    if (roundRes.rowCount === 0) {
      throw new Error("Round not found");
    }

    const round = roundRes.rows[0];

    if (round.status !== "closed") {
      throw new Error("Round must be closed before computing results");
    }

    // 2) กัน compute ซ้ำ
    const exists = await client.query(
      `SELECT 1 FROM round_results WHERE round_id = $1`,
      [roundId]
    );
    if (exists.rowCount > 0) {
      throw new Error("Round results already computed");
    }

    // 3) คำนวณผลจาก online_votes
    const insertRes = await client.query(
      `
  INSERT INTO round_results (
    round_id,
    contestant_id,
    online_raw,
    final_score
  )
  SELECT
    rc.round_id,
    rc.contestant_id,
    COUNT(ov.id) AS online_raw,
    COUNT(ov.id) AS final_score
  FROM round_contestants rc
  LEFT JOIN online_votes ov
    ON ov.contestant_id = rc.contestant_id
   AND ov.round_id = rc.round_id
  WHERE rc.round_id = $1
  GROUP BY rc.round_id, rc.contestant_id
  RETURNING *
  `,
      [roundId] // ✅ ส่งตัวเดียว
    );

    await client.query("COMMIT");

    return insertRes.rows;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
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
