import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createVotePoll } from '../../services/api';
import './CreateVotePoll.css';

const CreateVotePoll = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    modeType: 'online',
    counterType: 'auto',
    startDate: '',
    endDate: '',
    startTime: '00:00',
    endTime: '00:00',
    choices: [
      { id: 1, label: '', description: '', image: null, imagePreview: null }
    ]
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleChoiceChange = (index, e) => {
    const { name, value } = e.target;
    const updatedChoices = [...formData.choices];
    updatedChoices[index] = {
      ...updatedChoices[index],
      [name]: value
    };
    setFormData(prev => ({
      ...prev,
      choices: updatedChoices
    }));
  };

  const handleImageChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedChoices = [...formData.choices];
        updatedChoices[index] = {
          ...updatedChoices[index],
          image: file,
          imagePreview: reader.result
        };
        setFormData(prev => ({
          ...prev,
          choices: updatedChoices
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addChoice = () => {
    setFormData(prev => ({
      ...prev,
      choices: [
        ...prev.choices,
        { id: Date.now(), label: '', description: '', image: null, imagePreview: null }
      ]
    }));
  };

  const removeChoice = (index) => {
    const updatedChoices = formData.choices.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      choices: updatedChoices
    }));
  };

  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim()) {
      toast.error('Please enter a title for the poll');
      return;
    }

    if (formData.choices.length < 2) {
      toast.error('Please add at least 2 choices');
      return;
    }

    // Check if all choices have a label
    const hasEmptyChoices = formData.choices.some(choice => !choice.label.trim());
    if (hasEmptyChoices) {
      toast.error('All choices must have a name');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Call the API to create the poll
      const response = await createVotePoll(formData);
      
      // Show success message
      toast.success('Vote poll created successfully!');
      
      // Redirect to the poll management page or show success message with link
      if (response.public_url) {
        // Copy the public URL to clipboard
        await navigator.clipboard.writeText(response.public_url);
        toast.info('Public URL copied to clipboard!');
      }
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        modeType: 'online',
        counterType: 'auto',
        startDate: '',
        endDate: '',
        startTime: '00:00',
        endTime: '00:00',
        choices: [
          { id: 1, label: '', description: '', image: null, imagePreview: null }
        ]
      });
      
      // Optionally navigate to the poll management page
      // navigate('/admin/polls');
      
    } catch (error) {
    console.error('Error creating poll:', error);
    let errorMessage = 'Failed to create poll. Please try again.';
    
    if (error.response) {
      if (error.response.data && error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.status === 400) {
        errorMessage = 'Invalid request. Please check your input.';
      } else if (error.response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      }
    } else if (error.request) {
      errorMessage = 'No response from server. Please check your connection.';
    } else {
      errorMessage = error.message || 'An unexpected error occurred.';
    }
    
    toast.error(errorMessage);
  } finally {
    setIsSubmitting(false);
  }
  
  };

  return (
    <div className="create-vote-poll">
      <header className="header">
        <div className="logo">StageLink</div>
        <nav>
          <a href="/" className="nav-link">Home</a>
          <a href="/profile" className="nav-link">
            <div className="profile-icon">👤</div>
          </a>
        </nav>
      </header>

      <main className="main-content">
        <h1>Create Vote Poll</h1>
        
        <form onSubmit={handleSubmit} className="vote-form">
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter poll title"
              required
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Enter poll description"
              rows="3"
            />
          </div>

          {/* Mode Type */}
          <div className="form-group">
            <label>Mode type</label>
            <div className="button-group">
              <button
                type="button"
                className={`mode-btn ${formData.modeType === 'online' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, modeType: 'online' }))}
              >
                Online
              </button>
              <button
                type="button"
                className={`mode-btn ${formData.modeType === 'remote' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, modeType: 'remote' }))}
              >
                Remote
              </button>
              <button
                type="button"
                className={`mode-btn ${formData.modeType === 'online+remote' ? 'active' : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, modeType: 'online+remote' }))}
              >
                Online + Remote
              </button>
            </div>
          </div>

          {/* Counter */}
          <div className="form-group">
            <label>Counter</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="counterType"
                  value="manual"
                  checked={formData.counterType === 'manual'}
                  onChange={handleInputChange}
                />
                Manual
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="counterType"
                  value="auto"
                  checked={formData.counterType === 'auto'}
                  onChange={handleInputChange}
                />
                Auto
              </label>
            </div>

            {formData.counterType === 'auto' && (
              <div className="date-time-picker">
                <div className="date-picker">
                  <span className="date-label">Select day</span>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="date-input"
                  />
                </div>
                <div className="time-picker">
                  <span>Start with</span>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="time-input"
                  />
                  <div className="ampm-buttons">
                    <button type="button" className="ampm-btn active">AM</button>
                    <button type="button" className="ampm-btn">PM</button>
                  </div>
                </div>
                <div className="time-picker">
                  <span>End with</span>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="time-input"
                  />
                  <div className="ampm-buttons">
                    <button type="button" className="ampm-btn active">AM</button>
                    <button type="button" className="ampm-btn">PM</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Image Choices */}
          <div className="form-group">
            <label>Image Choice</label>
            {formData.choices.map((choice, index) => (
              <div key={choice.id} className="image-choice">
                <div className="image-upload">
                  <label className="image-upload-label">
                    {choice.imagePreview ? (
                      <img src={choice.imagePreview} alt="Preview" className="image-preview" />
                    ) : (
                      <div className="image-placeholder">
                        <span>+</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageChange(index, e)}
                      className="image-input"
                    />
                  </label>
                </div>
                <div className="choice-details">
                  <input
                    type="text"
                    name="label"
                    value={choice.label}
                    onChange={(e) => handleChoiceChange(index, e)}
                    placeholder="Label"
                    className="choice-input"
                    required
                  />
                  <textarea
                    name="description"
                    value={choice.description}
                    onChange={(e) => handleChoiceChange(index, e)}
                    placeholder="Description"
                    className="choice-description"
                    rows="2"
                  />
                </div>
                {formData.choices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeChoice(index)}
                    className="remove-choice"
                    aria-label="Remove choice"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addChoice}
              className="add-choice-btn"
            >
              + Add Choice
            </button>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary">Previous</button>
            <button 
              type="submit" 
              className="create-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Poll'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateVotePoll;
