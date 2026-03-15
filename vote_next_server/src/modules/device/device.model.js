// vote_next_server/src/modules/device/device.model.js
const { pool } = require("../../config/db");

// หา "รอบที่กำลังโหวต" ของ show
async function getCurrentVotingRound(showId) {
  const sql = `
    SELECT id, show_id, round_name, description, status, start_time, end_time, created_at
    FROM rounds
    WHERE show_id = $1 AND status = 'voting'
    ORDER BY start_time DESC NULLS LAST, created_at DESC
    LIMIT 1
  `;
  const r = await pool.query(sql, [showId]);
  return r.rowCount ? r.rows[0] : null;
}

// เอาผู้เข้าแข่งขันของ show มาโชว์
// ถ้าส่ง limit มาเป็น number ค่อย limit
async function getContestantsByShow(showId, limit = null) {
  if (typeof limit === "number" && limit > 0) {
    const sql = `
      SELECT id, stage_name, image_url, order_number
      FROM contestants
      WHERE show_id = $1
      ORDER BY order_number ASC NULLS LAST, created_at ASC
      LIMIT $2
    `;
    const r = await pool.query(sql, [showId, limit]);
    return r.rows;
  }

  const sql = `
    SELECT id, stage_name, image_url, order_number
    FROM contestants
    WHERE show_id = $1
    ORDER BY order_number ASC NULLS LAST, created_at ASC
  `;
  const r = await pool.query(sql, [showId]);
  return r.rows;
}

// เอาผู้เข้าแข่งขัน “ตามรอบ”
// ถ้าส่ง limit มาเป็น number ค่อย limit
async function getContestantsByRound(roundId, limit = null) {
  if (typeof limit === "number" && limit > 0) {
    const sql = `
      SELECT c.id, c.stage_name, c.image_url, c.order_number
      FROM round_contestants rc
      JOIN contestants c ON c.id = rc.contestant_id
      WHERE rc.round_id = $1
      ORDER BY c.order_number ASC NULLS LAST, c.created_at ASC
      LIMIT $2
    `;
    const r = await pool.query(sql, [roundId, limit]);
    return r.rows;
  }

  const sql = `
    SELECT c.id, c.stage_name, c.image_url, c.order_number
    FROM round_contestants rc
    JOIN contestants c ON c.id = rc.contestant_id
    WHERE rc.round_id = $1
    ORDER BY c.order_number ASC NULLS LAST, c.created_at ASC
  `;
  const r = await pool.query(sql, [roundId]);
  return r.rows;
}

// ลงทะเบียน/อัปเดต device_id -> ได้ uuid ของ remote_devices
async function upsertRemoteDevice(deviceId, ownerLabel = null) {
  const sql = `
    INSERT INTO remote_devices (device_id, owner_label)
    VALUES ($1, $2)
    ON CONFLICT (device_id)
    DO UPDATE SET owner_label = COALESCE(EXCLUDED.owner_label, remote_devices.owner_label)
    RETURNING id, device_id, owner_label
  `;
  const r = await pool.query(sql, [deviceId, ownerLabel]);
  return r.rows[0];
}

async function findRemoteDeviceByDeviceId(deviceId) {
  const sql = `SELECT id, device_id, owner_label FROM remote_devices WHERE device_id = $1`;
  const r = await pool.query(sql, [deviceId]);
  return r.rowCount ? r.rows[0] : null;
}

// บันทึกโหวตรีโมท: 1 device = 1 vote / round
// contestant ต้องอยู่ใน round_contestants ด้วย
async function insertRemoteVote({ roundId, contestantId, remoteDeviceUuid }) {
  const sql = `
    INSERT INTO remote_votes (round_id, contestant_id, remote_device_id)
    SELECT $1, $2, $3
    WHERE EXISTS (
      SELECT 1
      FROM round_contestants
      WHERE round_id = $1 AND contestant_id = $2
    )
    ON CONFLICT (round_id, remote_device_id) DO NOTHING
    RETURNING id
  `;
  const r = await pool.query(sql, [roundId, contestantId, remoteDeviceUuid]);
  return r.rowCount ? r.rows[0] : null;
}

module.exports = {
  getCurrentVotingRound,
  getContestantsByShow,
  getContestantsByRound,
  upsertRemoteDevice,
  findRemoteDeviceByDeviceId,
  insertRemoteVote,
};