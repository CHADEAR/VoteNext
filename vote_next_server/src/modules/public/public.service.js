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

    // 1) ตรวจสอบ round
    const roundRes = await client.query(
      `SELECT id, status
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

    // duplicate email
    if (err.code === "23505") {
      throw new Error("This email has already voted in this round");
    }

    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get live rank by public slug (online + remote raw score)
 */
exports.getLiveRankBySlug = async (publicSlug) => {
  // 1) หา round จาก slug
  const roundRes = await pool.query(
    `SELECT id
     FROM rounds
     WHERE public_slug = $1`,
    [publicSlug]
  );

  if (roundRes.rowCount === 0) {
    throw new Error("Round not found");
  }

  const roundId = roundRes.rows[0].id;

  // 2) ดึง live rank (raw score)
  const result = await pool.query(
    `
    SELECT
      c.id,
      c.stage_name,
      c.image_url,
      COUNT(DISTINCT ov.id) AS online_raw,
      COUNT(DISTINCT rv.id) AS remote_raw,
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
    GROUP BY c.id
    ORDER BY live_score DESC
    `,
    [roundId]
  );

  return result.rows;
};
