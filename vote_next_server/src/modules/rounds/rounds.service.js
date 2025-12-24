// vote_next_server/src/modules/rounds/rounds.service.js
const { pool } = require("../../config/db");

/**
 * ตรวจสอบสถานะ round และ auto-close ถ้าหมดเวลา
 * @param {Object} round
 * @returns {Promise<Object>}
 */
async function ensureRoundIsUpToDate(round) {
  if (round.status !== "voting" || !round.end_time) {
    return round;
  }

  const now = new Date();
  if (now >= new Date(round.end_time)) {
    await closeRound(round.id, "auto");
    return { ...round, status: "closed" };
  }

  return round;
}

/**
 * ปิดรอบโหวต (manual / auto ใช้ร่วมกัน)
 * @param {string} roundId
 * @param {"auto"|"manual"} reason
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

    // ❗ ปิดรอบอย่างเดียว ไม่แก้ end_time
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
 * โหลด round ตาม id พร้อม ensure state
 */
async function getRound(roundId) {
  const result = await pool.query(
    `SELECT id, status, end_time
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
 * เปิดรอบโหวต (pending -> voting)
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
       SET status = 'voting',
           start_time = NOW()
       WHERE id = $1
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


module.exports = {
  ensureRoundIsUpToDate,
  closeRound,
  getRound,
  startRound,
  createNextRound,
};
