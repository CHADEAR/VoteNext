import { getRooms as getRoomsApi } from "../api/rooms.api";

// Business logic for rooms (polls)
export async function getRooms() {
  const res = await getRoomsApi();
  // Controller returns { success, data }
  return res.data?.data || [];
}

async function deleteRoom(roundId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) หา show_id จาก round
    const roundRes = await client.query(
      `SELECT show_id FROM rounds WHERE id = $1`,
      [roundId]
    );

    if (roundRes.rowCount === 0) {
      throw new Error('Round not found');
    }

    const showId = roundRes.rows[0].show_id;

    // 2) ลบ show → cascade ทุก table ที่เกี่ยวข้อง
    await client.query(
      `DELETE FROM shows WHERE id = $1`,
      [showId]
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

export default {
  getRooms,
  deleteRoom,
};

