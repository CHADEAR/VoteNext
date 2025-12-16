import { getRooms as getRoomsApi } from "../api/rooms.api";

// Business logic for rooms (polls)
export async function getRooms() {
  const res = await getRoomsApi();
  // Controller returns { success, data }
  return res.data?.data || [];
}

export default {
  getRooms,
};

