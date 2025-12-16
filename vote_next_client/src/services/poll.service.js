import { createRoom } from "../api/rooms.api";

// Business logic: prepare formData for creating vote poll
export const createVotePoll = async (pollData) => {
  // Create FormData to handle file uploads
  const formData = new FormData();

  // Basic poll data
  formData.append("title", pollData.title);
  formData.append("description", pollData.description || "");
  formData.append(
    "voteMode",
    pollData.modeType === "online+remote" ? "hybrid" : pollData.modeType
  );

  // Choices
  pollData.choices
    .filter((choice) => choice.label.trim() !== "")
    .forEach((choice, index) => {
      formData.append(`contestants[${index}][stage_name]`, choice.label);
      formData.append(
        `contestants[${index}][description]`,
        choice.description || ""
      );
      if (choice.image) {
        formData.append(`contestants[${index}][image]`, choice.image);
      }
      formData.append(`contestants[${index}][order_number]`, index + 1);
    });

  // Auto counter times
  if (pollData.counterType === "auto") {
    if (pollData.startDate && pollData.startTime) {
      const startDateTime = new Date(
        `${pollData.startDate}T${pollData.startTime}`
      );
      formData.append("start_time", startDateTime.toISOString());
    }

    // Default endDate to startDate if not provided
    const endDate = pollData.endDate || pollData.startDate;
    if (endDate && pollData.endTime) {
      const endDateTime = new Date(`${endDate}T${pollData.endTime}`);
      formData.append("end_time", endDateTime.toISOString());
    }
  }

  const response = await createRoom(formData);
  return response.data;
};

export default {
  createVotePoll,
};

