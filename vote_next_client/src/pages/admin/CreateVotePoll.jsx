import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createVotePoll } from '../../services/api';
import './CreateVotePoll.css';

const CreateVotePoll = () => {
  const location = useLocation();
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
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const buildImageUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
    const origin = apiBase.replace(/\/api\/?$/, '');
    return `${origin}${path}`;
  };

  useEffect(() => {
    const room = location.state?.room;
    if (!room) return;

    const toDate = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };
    const toTime = (iso) => {
      if (!iso) return '00:00';
      const d = new Date(iso);
      const pad = (n) => String(n).padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const modeType =
      room.vote_mode === 'hybrid'
        ? 'online+remote'
        : room.vote_mode || 'online';

    const mappedChoices =
      (room.contestants || [])
        .sort((a, b) => (a.order_number || 0) - (b.order_number || 0))
        .map((c, idx) => ({
          id: c.id || idx + 1,
          label: c.stage_name || '',
          description: c.description || c.detail || '',
          image: null,
          imagePreview: buildImageUrl(c.image_url),
          imageUrl: c.image_url || '',
        })) || [];

    setFormData({
      title: room.title || '',
      description: room.description || '',
      modeType,
      counterType: room.start_time || room.end_time ? 'auto' : 'manual',
      startDate: toDate(room.start_time),
      endDate: toDate(room.end_time),
      startTime: toTime(room.start_time),
      endTime: toTime(room.end_time),
      choices:
        mappedChoices.length > 0
          ? mappedChoices
          : [{ id: 1, label: '', description: '', image: null, imagePreview: null }],
    });
    setEditingId(room.round_id || room.id || null);
  }, [location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation in Thai
    if (!formData.title.trim()) {
      toast.error('กรุณาใส่ชื่อโพล');
      return;
    }

    // Filter out empty choices
    const validChoices = formData.choices.filter(choice => choice.label.trim() !== '');
    
    if (validChoices.length < 2) {
      toast.error('กรุณาเพิ่มตัวเลือกอย่างน้อย 2 ตัวเลือก');
      return;
    }

    // Check if any choice is missing required fields
    const hasIncompleteChoices = validChoices.some(choice => !choice.label.trim());
    if (hasIncompleteChoices) {
      toast.error('กรุณากรอกชื่อตัวเลือกให้ครบทุกช่อง');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Update form data with filtered choices
      const submitData = {
        ...formData,
        choices: formData.choices.filter(choice => choice.label.trim() !== '')
      };
      
      // Call the API to create the poll
      const response = await createVotePoll({ ...submitData, round_id: editingId });
      
      // Show success message in Thai
      toast.success('สร้างโพลสำเร็จ!');
      
      // Copy public URL to clipboard if available
      if (response.public_url) {
        try {
          await navigator.clipboard.writeText(response.public_url);
          toast.info('คัดลอกลิงก์โหวตไปยังคลิปบอร์ดแล้ว');
        } catch (err) {
          console.error('Failed to copy URL: ', err);
        }
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
      
    } catch (error) {
      console.error('Error creating poll:', error);
      let errorMessage = 'เกิดข้อผิดพลาดในการสร้างโพล กรุณาลองใหม่อีกครั้ง';
      
      if (error.response) {
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 400) {
          errorMessage = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลอีกครั้ง';
        } else if (error.response.status === 500) {
          errorMessage = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ กรุณาลองใหม่ในภายหลัง';
        }
      } else if (error.request) {
        errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  
  };

  return (
    <div className="create-vote-poll">
      <header className="header">
        <div className="logo">VoteNext</div>
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
                  <span className="date-label">Start date</span>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="date-input"
                  />
                </div>
                <div className="date-picker">
                  <span className="date-label">End date</span>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="date-input"
                  />
                </div>
                <div className="time-picker">
                  <span>Start time</span>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="time-input"
                  />              
                </div>
                <div className="time-picker">
                  <span>End time</span>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="time-input"
                  />
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
