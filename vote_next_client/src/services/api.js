import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api'; // Backend server runs on port 4000

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Update the createVotePoll function in api.js
export const createVotePoll = async (pollData) => {
  try {
    // Create base request data
    const requestData = {
      title: pollData.title,
      description: pollData.description,
      vote_mode: pollData.modeType === 'online+remote' ? 'hybrid' : pollData.modeType,
      contestants: pollData.choices
        .filter(choice => choice.label.trim() !== '') // Filter out empty choices
        .map((choice, index) => ({
          stage_name: choice.label,
          description: choice.description,
          image_url: choice.imagePreview || null,
          order_number: index + 1,
        })),
    };

    // Add start_time and end_time if counter is auto
    if (pollData.counterType === 'auto' && pollData.startDate && pollData.startTime) {
      // Combine date and time strings and convert to ISO format
      const startDateTime = new Date(`${pollData.startDate}T${pollData.startTime}`);
      requestData.start_time = startDateTime.toISOString();
      
      if (pollData.endDate && pollData.endTime) {
        const endDateTime = new Date(`${pollData.endDate}T${pollData.endTime}`);
        requestData.end_time = endDateTime.toISOString();
      }
    }

    console.log('Sending request data:', JSON.stringify(requestData, null, 2));
    
    const response = await api.post('/rooms', requestData);
    return response.data;
  } catch (error) {
    console.error('Error creating vote poll:', error);
    throw error;
  }
};

export default {
  createVotePoll,
};
