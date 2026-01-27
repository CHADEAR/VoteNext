// vote_next_client/src/services/poll.service.js
import apiClient from "../api/apiClient";

export const createVotePoll = async (pollData) => {
  try {
    const response = await apiClient.post("/rooms", pollData);
    return response.data;
  } catch (error) {
    console.log("Backend API not available, using mock data for poll creation");
    
    // Mock data fallback
    const mockRound = {
      id: Date.now(),
      round_name: "Round 1",
      start_time: pollData.start_time || null,
      end_time: pollData.end_time || null,
      status: "pending",
      public_slug: `mock-${Date.now()}`,
      counter_type: pollData.counter_type || "manual"
    };

    const mockShow = {
      title: pollData.title,
      description: pollData.description,
      vote_mode: pollData.vote_mode || "online"
    };

    return {
      success: true,
      data: {
        round: mockRound,
        show: mockShow,
        contestants: pollData.contestants || []
      }
    };
  }
};

export const updateVotePoll = async (id, pollData) => {
  const response = await apiClient.put(`/rooms/${id}`, pollData);
  return response.data;
};
