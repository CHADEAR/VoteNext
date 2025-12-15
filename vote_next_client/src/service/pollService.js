// src/services/pollService.js
const API_BASE_URL = '/api'; // Update this with your actual API base URL

export const createPoll = async (pollData) => {
  const formData = new FormData();
  
  // Append basic fields
  formData.append('title', pollData.title);
  formData.append('description', pollData.description || '');
  formData.append('modeType', pollData.modeType);
  formData.append('counterType', pollData.counterType);
  
  if (pollData.counterType === 'auto') {
    formData.append('startTime', `${pollData.startDate}T${pollData.startTime}`);
    formData.append('endTime', `${pollData.endDate}T${pollData.endTime}`);
  }

  // Append choices with images
  pollData.choices.forEach((choice, index) => {
    formData.append(`choices[${index}][label]`, choice.label);
    formData.append(`choices[${index}][description]`, choice.description || '');
    if (choice.image) {
      formData.append(`choices[${index}][image]`, choice.image);
    }
  });

  const response = await fetch(`${API_BASE_URL}/polls`, {
    method: 'POST',
    // Don't set Content-Type header when using FormData
    // The browser will set it with the correct boundary
    headers: {
      // 'Authorization': `Bearer ${localStorage.getItem('token')}` // Add auth if needed
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create poll');
  }

  return response.json();
};

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  return response.json();
};