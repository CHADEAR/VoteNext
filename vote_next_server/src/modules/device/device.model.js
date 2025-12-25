// vote_next_server/src/modules/device/device.model.js
const db = require("../../config/db");

// หา "รอบที่กำลังโหวต" ของ show
async function getCurrentVotingRound(showId) {
  const sql = `
    SELECT id, show_id, round_name, description, status, start_time, end_time, created_at
    FROM rounds
    WHERE show_id = $1 AND status = 'voting'
    ORDER BY start_time DESC NULLS LAST, created_at DESC
    LIMIT 1
  `;
  const r = await db.query(sql, [showId]);
  return r.rowCount ? r.rows[0] : null;
}

// เอาผู้เข้าแข่งขันของ show มาโชว์ (จำกัด 4 คนแบบรีโมท)
async function getContestantsByShow(showId, limit = 4) {
  // ใน migration ของคุณมี 001_add_contestant_description.sql
  // ถ้าคอลัมน์ description มีจริงให้ SELECT มาด้วย ไม่มีก็ไม่เป็นไร
  const sql = `
    SELECT id, stage_name, image_url, order_number
    FROM contestants
    WHERE show_id = $1
    ORDER BY order_number ASC NULLS LAST, created_at ASC
    LIMIT $2
  `;
  const r = await db.query(sql, [showId, limit]);
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
  const r = await db.query(sql, [deviceId, ownerLabel]);
  return r.rows[0];
}

async function findRemoteDeviceByDeviceId(deviceId) {
  const sql = `SELECT id, device_id, owner_label FROM remote_devices WHERE device_id = $1`;
  const r = await db.query(sql, [deviceId]);
  return r.rowCount ? r.rows[0] : null;
}

// บันทึกโหวตรีโมท: 1 device = 1 vote / round (ตาม UNIQUE)
async function insertRemoteVote({ roundId, contestantId, remoteDeviceUuid }) {
  const sql = `
    INSERT INTO remote_votes (round_id, contestant_id, remote_device_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (round_id, remote_device_id) DO NOTHING
    RETURNING id
  `;
  const r = await db.query(sql, [roundId, contestantId, remoteDeviceUuid]);
  return r.rowCount ? r.rows[0] : null; // null แปลว่าโหวตซ้ำ
}

module.exports = {
  getCurrentVotingRound,
  getContestantsByShow,
  upsertRemoteDevice,
  findRemoteDeviceByDeviceId,
  insertRemoteVote,
};
