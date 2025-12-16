// vote_next_server/src/modules/rooms/rooms.service.js
const { pool } = require("../../config/db");

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || null;

// helper: สุ่ม slug สั้น ๆ เช่น 'a9f3x2b1'
function generateRandomSlug(length = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < length; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
}

function buildPublicUrl(slug) {
  if (!FRONTEND_BASE_URL) return null;
  // ตัด / ท้ายออกเพื่อกัน ///
  const base = FRONTEND_BASE_URL.replace(/\/+$/, "");
  return `${base}/vote/${slug}`;
}

/**
 * สร้าง Room ใหม่:
 * - สร้าง show
 * - สร้าง contestants
 * - สร้าง round พร้อม vote_mode + public_slug + start_time/end_time
 */
async function createRoomWithContestants({
  title,
  description,
  voteMode,
  contestants,
  startTime,
  endTime,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) สร้าง show ใหม่ (ตอนนี้ 1 room = 1 show)
    const showResult = await client.query(
      `INSERT INTO shows (title, description)
       VALUES ($1, $2)
       RETURNING id, title, description, created_at`,
      [title, description]
    );
    const show = showResult.rows[0];

    // 2) สร้าง contestants ตามที่ส่งมา
    const contestantRows = [];
    for (let index = 0; index < contestants.length; index++) {
      const c = contestants[index];
      const orderNumber = index + 1;

      const result = await client.query(
        `INSERT INTO contestants (show_id, stage_name, image_url, order_number)
         VALUES ($1, $2, $3, $4)
         RETURNING id, show_id, stage_name, image_url, order_number, created_at`,
        [show.id, c.stage_name, c.image_url || null, orderNumber]
      );

      contestantRows.push(result.rows[0]);
    }

    // 3) สร้าง slug ที่ไม่ซ้ำ
    let slug;
    let isUnique = false;

    while (!isUnique) {
      slug = generateRandomSlug(8);
      const check = await client.query(
        `SELECT 1 FROM rounds WHERE public_slug = $1`,
        [slug]
      );
      if (check.rowCount === 0) {
        isUnique = true;
      }
    }

    // 4) สร้าง round ผูกกับ show + vote_mode + slug + เวลาเริ่ม/จบโหวต
    const roundResult = await client.query(
      `INSERT INTO rounds (show_id, round_name, description, start_time, end_time, status, created_by, public_slug, vote_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, show_id, round_name, description, status, start_time, end_time, created_by, created_at, public_slug, vote_mode`,
      [
        show.id,
        title,          // ใช้ชื่อเดียวกับ room
        description,
        startTime || null,
        endTime || null,
        "pending", // เริ่มต้นยังไม่เปิดโหวต
        null, // created_by: ภายหลังค่อยใช้ admin id
        slug,
        voteMode,
      ]
    );

    const round = roundResult.rows[0];

    await client.query("COMMIT");

    const publicUrl = buildPublicUrl(round.public_slug);

    // structure response ที่ controller จะส่งออก
    return {
      round_id: round.id,
      show_id: show.id,
      title: round.round_name,
      description: round.description,
      status: round.status,
      vote_mode: round.vote_mode,
      public_slug: round.public_slug,
      public_url: publicUrl,

      show,
      contestants: contestantRows,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createRoomWithContestants,
};
