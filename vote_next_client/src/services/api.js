import axios from 'axios';

const API_BASE_URL = 'http://localhost:4000/api';

// Update the createVotePoll function to handle file uploads
export const createVotePoll = async (pollData) => {
  try {
    // Create FormData to handle file uploads
    const formData = new FormData();
    
    // Add basic poll data
    formData.append('title', pollData.title);
    formData.append('description', pollData.description || '');
    formData.append('voteMode', pollData.modeType === 'online+remote' ? 'hybrid' : pollData.modeType);

    // Add choices
    pollData.choices
      .filter(choice => choice.label.trim() !== '')
      .forEach((choice, index) => {
        formData.append(`contestants[${index}][stage_name]`, choice.label);
        formData.append(`contestants[${index}][description]`, choice.description || '');
        if (choice.image) {
          formData.append(`contestants[${index}][image]`, choice.image);
        }
        formData.append(`contestants[${index}][order_number]`, index + 1);
      });

    // Add start_time and end_time if counter is auto
    if (pollData.counterType === 'auto') {
      // ใช้วันที่จาก startDate เสมอ (ในฟอร์มมี date picker แค่ตัวเดียว)
      if (pollData.startDate && pollData.startTime) {
        const startDateTime = new Date(`${pollData.startDate}T${pollData.startTime}`);
        formData.append('start_time', startDateTime.toISOString());
      }

      // ถ้าไม่ได้ระบุ endDate ให้ใช้วันเดียวกับ startDate
      const endDate = pollData.endDate || pollData.startDate;
      if (endDate && pollData.endTime) {
        const endDateTime = new Date(`${endDate}T${pollData.endTime}`);
        formData.append('end_time', endDateTime.toISOString());
      }
    }

    console.log('Sending form data:', Object.fromEntries(formData));
    
    const response = await axios.post(`${API_BASE_URL}/rooms`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating vote poll:', error);
    throw error;
  }
};

export default {
  createVotePoll,
};
