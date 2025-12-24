// vote_next_server/src/modules/rooms/rooms.service.js
const { pool } = require("../../config/db");
const { ensureRoundIsUpToDate } = require("../rounds/rounds.service");

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
  const base = FRONTEND_BASE_URL.replace(/\/+$/, "");
  return `${base}/vote/${slug}`;
}

// แปลง relative URL เป็น absolute URL
function ensureAbsoluteUrl(url, req) {
  if (!url) return url;
  if (/^https?:\/\//.test(url)) return url;
  if (url.startsWith("/")) {
    const protocol = req ? req.protocol : "http";
    const host = req ? req.get("host") : "localhost:3000";
    return `${protocol}://${host}${url}`;
  }
  return url;
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

    // 2) สร้าง contestants
    const contestantRows = [];
    for (let index = 0; index < contestants.length; index++) {
      const c = contestants[index];
      const orderNumber = index + 1;

      const result = await client.query(
        `INSERT INTO contestants (show_id, stage_name, image_url, order_number, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, show_id, stage_name, image_url, order_number, description, created_at`,
        [show.id, c.stage_name, c.image_url || null, orderNumber, c.description || ""]
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
      if (check.rowCount === 0) isUnique = true;
    }

    // 4) สร้าง round
    const roundResult = await client.query(
      `INSERT INTO rounds
       (show_id, round_name, description, start_time, end_time, status, created_by, public_slug, vote_mode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, show_id, round_name, description, status, start_time, end_time, created_by, created_at, public_slug, vote_mode`,
      [
        show.id,
        title,
        description,
        startTime || null,
        endTime || null,
        "pending",
        null,
        slug,
        voteMode,
      ]
    );

    const round = roundResult.rows[0];
    await client.query("COMMIT");

    return {
      round_id: round.id,
      show_id: show.id,
      title: round.round_name,
      description: round.description,
      status: round.status,
      start_time: round.start_time,
      end_time: round.end_time,
      vote_mode: round.vote_mode,
      public_slug: round.public_slug,
      public_url: buildPublicUrl(round.public_slug),
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

// ==============================
// ดึงรายการ rooms (rounds)
// ==============================
async function getRoomsWithContestants() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        r.id AS round_id,
        r.round_name,
        r.description AS round_description,
        r.status,
        r.start_time,
        r.end_time,
        r.public_slug,
        r.vote_mode,
        r.created_at AS round_created_at,

        s.id AS show_id,
        s.title AS show_title,
        s.description AS show_description,

        c.id AS contestant_id,
        c.stage_name,
        c.image_url,
        c.order_number,
        c.description AS contestant_description
      FROM rounds r
      JOIN shows s ON r.show_id = s.id
      LEFT JOIN contestants c ON c.show_id = s.id
      ORDER BY r.created_at DESC, c.order_number ASC;
    `);

    const map = new Map();

    for (const row of result.rows) {
      if (!map.has(row.round_id)) {
        map.set(row.round_id, {
          round_id: row.round_id,
          show_id: row.show_id,
          title: row.round_name || row.show_title,
          description: row.round_description || row.show_description || "",
          status: row.status,
          start_time: row.start_time,
          end_time: row.end_time,
          vote_mode: row.vote_mode,
          public_slug: row.public_slug,
          public_url: buildPublicUrl(row.public_slug),
          created_at: row.round_created_at,
          contestants: [],
        });
      }

      if (row.contestant_id) {
        map.get(row.round_id).contestants.push({
          id: row.contestant_id,
          stage_name: row.stage_name,
          image_url: row.image_url,
          order_number: row.order_number,
          description: row.contestant_description || "",
        });
      }
    }

    return Array.from(map.values());
  } finally {
    client.release();
  }
}

// ==============================
// ดึง room ตาม public_slug
// (STEP 2.1: auto-close by time)
// ==============================
async function getRoomBySlug(slug, req) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `
      SELECT
        r.id AS round_id,
        r.round_name,
        r.description AS round_description,
        r.status,
        r.start_time,
        r.end_time,
        r.public_slug,
        r.vote_mode,

        s.title AS show_title,
        s.description AS show_description,

        c.id AS contestant_id,
        c.stage_name,
        c.image_url,
        c.order_number,
        c.description AS contestant_description
      FROM rounds r
      JOIN shows s ON r.show_id = s.id
      LEFT JOIN contestants c ON c.show_id = s.id
      WHERE r.public_slug = $1
      ORDER BY c.order_number ASC;
      `,
      [slug]
    );

    if (result.rowCount === 0) return null;

    const rows = result.rows;
    const first = rows[0];

    // ✅ STEP 2.1: ensure round status is up to date
    const updatedRound = await ensureRoundIsUpToDate({
      id: first.round_id,
      status: first.status,
      end_time: first.end_time,
    });

    const data = {
      round_id: first.round_id,
      title: first.round_name || first.show_title,
      description: first.round_description || first.show_description || "",
      status: updatedRound.status,
      start_time: first.start_time,
      end_time: first.end_time,
      vote_mode: first.vote_mode,
      public_slug: first.public_slug,
      public_url: buildPublicUrl(first.public_slug),
      contestants: [],
    };

    rows.forEach((row) => {
      if (!row.contestant_id) return;
      data.contestants.push({
        id: row.contestant_id,
        stage_name: row.stage_name,
        description: row.contestant_description || "",
        image_url: ensureAbsoluteUrl(row.image_url, req),
        order_number: row.order_number,
      });
    });

    return data;
  } finally {
    client.release();
  }
}

// ==============================
// update room + contestants
// ==============================
async function updateRoomWithContestants({
  roundId,
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

    const roundResult = await client.query(
      `SELECT r.id, r.show_id FROM rounds r WHERE r.id = $1`,
      [roundId]
    );
    if (roundResult.rowCount === 0) {
      throw new Error("ไม่พบรอบโหวตนี้");
    }

    const { show_id } = roundResult.rows[0];

    await client.query(
      `UPDATE shows SET title = $1, description = $2 WHERE id = $3`,
      [title, description, show_id]
    );

    await client.query(
      `UPDATE rounds
       SET round_name = $1,
           description = $2,
           vote_mode = $3,
           start_time = $4,
           end_time = $5
       WHERE id = $6`,
      [title, description, voteMode, startTime || null, endTime || null, roundId]
    );

    await client.query(`DELETE FROM contestants WHERE show_id = $1`, [show_id]);

    for (let i = 0; i < contestants.length; i++) {
      const c = contestants[i];
      await client.query(
        `INSERT INTO contestants (show_id, stage_name, image_url, order_number, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [show_id, c.stage_name, c.image_url || null, i + 1, c.description || ""]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createRoomWithContestants,
  getRoomsWithContestants,
  getRoomBySlug,
  updateRoomWithContestants,
};
