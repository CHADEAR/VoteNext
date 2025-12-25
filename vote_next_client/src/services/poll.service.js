import { createRoom } from '../api/rooms.api';
import apiClient from '../api/apiClient';

export const createVotePoll = async (pollData) => {
  const formData = new FormData();

  // show data
  formData.append("title", pollData.title);
  formData.append("description", pollData.description || "");
  formData.append(
    "voteMode",
    pollData.modeType === "online+remote" ? "hybrid" : pollData.modeType
  );

  // contestants
  pollData.choices
    .filter(c => c.label.trim() !== "")
    .forEach((c, i) => {
      formData.append(`contestants[${i}][stage_name]`, c.label);
      formData.append(`contestants[${i}][description]`, c.description || "");
      if (c.image) {
        formData.append(`contestants[${i}][image]`, c.image);
      } else if (c.imageUrl) {
        formData.append(`contestants[${i}][image_url]`, c.imageUrl);
      }
    });

  // ✅ call backend แค่ครั้งเดียวพอ
  const createResponse = await createRoom(formData);

 const showId = createResponse.data?.data?.show?.id;
 const roundId = createResponse.data?.data?.round?.id;

  if (!showId || !roundId) {
    throw new Error("Create poll failed");
  }

  // 🔥 ไม่ต้องสร้าง round ซ้ำแล้ว
  return createResponse.data;
};
