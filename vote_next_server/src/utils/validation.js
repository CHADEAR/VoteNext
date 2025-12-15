// src/utils/validation.js
export const validatePollForm = (formData) => {
  const errors = {};

  // Title validation
  if (!formData.title?.trim()) {
    errors.title = 'Title is required';
  }

  // Date/Time validation for auto counter
  if (formData.counterType === 'auto') {
    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!formData.startTime) {
      errors.startTime = 'Start time is required';
    }
    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    }
    if (!formData.endTime) {
      errors.endTime = 'End time is required';
    }

    // Validate end time is after start time
    if (formData.startDate && formData.endDate && formData.startTime && formData.endTime) {
      const start = new Date(`${formData.startDate}T${formData.startTime}`);
      const end = new Date(`${formData.endDate}T${formData.endTime}`);
      
      if (end <= start) {
        errors.endTime = 'End time must be after start time';
      }
    }
  }

  // Choices validation
  const choiceErrors = [];
  formData.choices.forEach((choice, index) => {
    const choiceError = {};
    
    if (!choice.label?.trim()) {
      choiceError.label = 'Label is required';
    }
    
    if (!choice.image && !choice.imagePreview) {
      choiceError.image = 'Image is required';
    }
    
    if (Object.keys(choiceError).length > 0) {
      choiceErrors[index] = choiceError;
    }
  });

  if (choiceErrors.length > 0) {
    errors.choices = choiceErrors;
  }

  return errors;
};