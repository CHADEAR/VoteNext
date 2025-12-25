// src/modules/public/public.service.js
const { pool } = require("../../config/db");

/**
 * Submit online vote (email required)
 * @param {Object} params
 * @param {string} params.roundId
 * @param {string} params.contestantId
 * @param {string} params.email
 */
async function submitOnlineVote({ roundId, contestantId, email }) {
  if (!roundId || !contestantId || !email) {
    throw new Error("roundId, contestantId and email are required");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) ตรวจสอบ round
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

    if (round.status !== "voting") {
      throw new Error("Voting is not open");
    }
    
    // 2) ตรวจสอบ contestant อยู่ใน round นี้จริง
    const contestantRes = await client.query(
      `SELECT 1
   FROM round_contestants
   WHERE round_id = $1
     AND contestant_id = $2`,
      [roundId, contestantId]
    );

    if (contestantRes.rowCount === 0) {
      throw new Error("Contestant is not in this round");
    }


    // 3) insert vote
    await client.query(
      `
      INSERT INTO online_votes (round_id, contestant_id, voter_email)
      VALUES ($1, $2, $3)
      `,
      [roundId, contestantId, email.toLowerCase()]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");

    // duplicate email (unique constraint)
    if (err.code === "23505") {
      throw new Error("This email has already voted in this round");
    }

    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  submitOnlineVote,
};
