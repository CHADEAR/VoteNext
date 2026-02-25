// vote_next_server/src/modules/rooms/rooms.service.js
const { pool } = require("../../config/db");

async function createRoomWithContestants({ title, description, contestants }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Create show
    const showResult = await client.query(
      `INSERT INTO shows (title, description)
       VALUES ($1, $2)
       RETURNING *`,
      [title, description || null]
    );
    const show = showResult.rows[0];

    // 2. Create contestants
    const createdContestants = [];
    for (let i = 0; i < contestants.length; i++) {
      const contestant = contestants[i];
      const result = await client.query(
        `INSERT INTO contestants 
         (show_id, stage_name, description, image_url, order_number)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          show.id,
          contestant.stage_name,
          contestant.description || '',
          contestant.image_url || null,
          contestant.order_number || i + 1
        ]
      );
      createdContestants.push(result.rows[0]);
    }

    await client.query("COMMIT");
    return { show, contestants: createdContestants };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==============================
// GET: Show with contestants
// ==============================
async function getShowWithContestants(showId) {
  const client = await pool.connect();
  try {
    // Get show
    const showRes = await client.query(
      `SELECT * FROM shows WHERE id = $1`,
      [showId]
    );

    if (showRes.rows.length === 0) {
      throw new Error('Show not found');
    }

    const show = showRes.rows[0];

    // Get contestants
    const contestantsRes = await client.query(
      `SELECT * FROM contestants 
       WHERE show_id = $1 
       ORDER BY order_number ASC`,
      [showId]
    );

    return {
      ...show,
      contestants: contestantsRes.rows
    };
  } finally {
    client.release();
  }
}

// ==============================
// UPDATE: Show and contestants
// ==============================
async function updateShowWithContestants(showId, { title, description, contestants }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Update show
    const showRes = await client.query(
      `UPDATE shows 
       SET title = $1, description = $2
       WHERE id = $3
       RETURNING *`,
      [title, description || null, showId]
    );

    if (showRes.rows.length === 0) {
      throw new Error('Show not found');
    }

    // 2. Delete existing contestants
    await client.query(
      `DELETE FROM contestants WHERE show_id = $1`,
      [showId]
    );

    // 3. Re-create contestants
    const createdContestants = [];
    for (let i = 0; i < contestants.length; i++) {
      const contestant = contestants[i];
      const result = await client.query(
        `INSERT INTO contestants 
         (show_id, stage_name, description, image_url, order_number)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          showId,
          contestant.stage_name,
          contestant.description || '',
          contestant.image_url || null,
          contestant.order_number || i + 1
        ]
      );
      createdContestants.push(result.rows[0]);
    }

    await client.query("COMMIT");
    return {
      show: showRes.rows[0],
      contestants: createdContestants
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ==============================
// GET: Rooms (Rounds + Show + Contestants)
// ==============================
async function getRoomsWithContestants() {
  const { rows: rounds } = await pool.query(`
    SELECT
  r.id            AS round_id,
  r.round_name,
  r.vote_mode,
  r.counter_type,
  r.status,
  r.start_time,
  r.end_time,
  r.created_at,
  r.public_slug,
  s.id            AS show_id,
  s.title,
  s.description
FROM rounds r
JOIN shows s ON s.id = r.show_id
ORDER BY r.created_at DESC

  `);

  if (rounds.length === 0) return [];

  const roundIds = rounds.map(r => r.round_id);

  const { rows: contestants } = await pool.query(`
    SELECT
      rc.round_id,
      c.id,
      c.stage_name,
      c.description,
      c.image_url,
      c.order_number
    FROM round_contestants rc
    JOIN contestants c ON c.id = rc.contestant_id
    WHERE rc.round_id = ANY($1::uuid[])
    ORDER BY c.order_number ASC
  `, [roundIds]);

  // group contestants by round_id
  const map = {};
  for (const c of contestants) {
    if (!map[c.round_id]) map[c.round_id] = [];
    map[c.round_id].push(c);
  }

  // shape response ให้ frontend ใช้ได้ทันที
return rounds.map(r => ({
  round_id: r.round_id,
  title: r.title,
  description: r.description,
  vote_mode: r.vote_mode,
  counter_type: r.counter_type,
  status: r.status,
  start_time: r.start_time,
  end_time: r.end_time,
  created_at: r.created_at,
  public_slug: r.public_slug,
  contestants: map[r.round_id] || []
}));

}

async function getRoomBySlug(slug) {
  const { rows } = await pool.query(
    `
    SELECT
      r.id,
      r.round_name,
      r.status AS db_status,
      r.start_time,
      r.end_time,
      r.public_slug,
      r.counter_type,
      s.title,
      s.description
    FROM rounds r
    JOIN shows s ON s.id = r.show_id
    WHERE r.public_slug = $1
    LIMIT 1
    `,
    [slug]
  );

  if (rows.length === 0) {
    throw new Error("Poll not found");
  }

  let round = rows[0];

  // compute status จาก server time
  const now = new Date();

  let computedStatus = round.db_status;

  // after computing computedStatus
if (round.counter_type === "auto" && round.start_time && round.end_time) {
  const start = new Date(round.start_time);
  const end = new Date(round.end_time);

  if (now < start) {
    computedStatus = "pending";
  } else if (now >= start && now < end) {
    computedStatus = "voting";
  } else if (now >= end) {
    computedStatus = "closed";

    // auto close sync to DB (only when DB is not closed yet)
    if (round.db_status !== "closed") {
      await pool.query(
        `UPDATE rounds SET status='closed' WHERE id=$1`,
        [round.id]
      );
      round.db_status = "closed";
    }
  }
}

  // โหลด contestants เดิม
  const { rows: contestants } = await pool.query(
    `
    SELECT
      c.id,
      c.stage_name,
      c.description,
      c.image_url,
      c.order_number
    FROM round_contestants rc
    JOIN contestants c ON c.id = rc.contestant_id
    WHERE rc.round_id = $1
    ORDER BY c.order_number ASC
    `,
    [round.id]
  );

  return {
    ...round,
    status: computedStatus,
    contestants
  };
}

  
async function deleteRoom(roundId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) ตรวจสอบว่า round มีอยู่จริง
    const roundRes = await client.query(
      `SELECT id FROM rounds WHERE id = $1`,
      [roundId]
    );

    if (roundRes.rowCount === 0) {
      throw new Error('Round not found');
    }

    // 2) ลบเฉพาะ round นี้ → cascade จะลบข้อมูลที่เกี่ยวข้องกับ round นี้เท่านั้น
    await client.query(
      `DELETE FROM rounds WHERE id = $1`,
      [roundId]
    );

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function applyContestantPatch(client, showId, roundId, patch) {
  if (!patch) return;

  const { add = [], update = [], remove = [] } = patch;

  // ------------------------------
  // ADD
  // ------------------------------
  for (const c of add) {
    const insertRes = await client.query(
      `
      INSERT INTO contestants (show_id, stage_name, description, image_url, order_number)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        showId,
        c.stage_name,
        c.description || "",
        c.image_url || null,
        c.order_number || null
      ]
    );

    const newId = insertRes.rows[0].id;

    // map to round
    await client.query(
      `
      INSERT INTO round_contestants (round_id, contestant_id)
      VALUES ($1, $2)
      `,
      [roundId, newId]
    );
  }


  // ------------------------------
  // UPDATE (merge)
  // ------------------------------
  for (const c of update) {
    const fields = [];
    const values = [];
    let idx = 1;

    if (c.stage_name !== undefined) {
      fields.push(`stage_name = $${idx++}`);
      values.push(c.stage_name);
    }
    if (c.description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(c.description);
    }
    if (c.image_url !== undefined) {
      fields.push(`image_url = $${idx++}`);
      values.push(c.image_url);
    }
    if (c.order_number !== undefined) {
      fields.push(`order_number = $${idx++}`);
      values.push(c.order_number);
    }

    if (fields.length > 0) {
      values.push(c.id);
      await client.query(
        `
        UPDATE contestants
        SET ${fields.join(", ")}
        WHERE id = $${idx}
        `,
        values
      );
    }
  }


  // ------------------------------
  // REMOVE (hard delete)
  // ------------------------------
  for (const id of remove) {
    // unmap from round
    await client.query(
      `DELETE FROM round_contestants WHERE round_id=$1 AND contestant_id=$2`,
      [roundId, id]
    );

    // delete contestant
    await client.query(
      `DELETE FROM contestants WHERE id=$1 AND show_id=$2`,
      [id, showId]
    );
  }
}

async function updatePollMeta(client, showId, roundId, poll) {
  if (!poll) return;

  const {
    title,
    description,
    vote_mode,
    counter_type,
    start_time,
    end_time
  } = poll;

  // update show partial
  if (title !== undefined || description !== undefined) {
    await client.query(
      `
      UPDATE shows
      SET title = COALESCE($1, title),
          description = COALESCE($2, description)
      WHERE id = $3
      `,
      [title || null, description || null, showId]
    );
  }

  // update round partial
  if (
    vote_mode !== undefined ||
    counter_type !== undefined ||
    start_time !== undefined ||
    end_time !== undefined
  ) {
    await client.query(
      `
      UPDATE rounds
      SET vote_mode = COALESCE($1, vote_mode),
          counter_type = COALESCE($2, counter_type),
          start_time = COALESCE($3::timestamptz, start_time),
          end_time = COALESCE($4::timestamptz, end_time)
      WHERE id = $5
      `,
      [
        vote_mode || null,
        counter_type || null,
        start_time || null,
        end_time || null,
        roundId
      ]
    );
  }
}


module.exports = {
  createRoomWithContestants,
  getShowWithContestants,
  updateShowWithContestants,
  getRoomsWithContestants,
  getRoomBySlug,
  deleteRoom,
  applyContestantPatch,
  updatePollMeta,
};