import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createVotePoll } from '../../services/api';
import { createRoom, updateRoom } from "../../api/rooms.api";
import Navbar from '../../components/layout/Navbar';
import './CreateVotePoll.css';
import { uploadImageToCloudinary } from "../../services/cloudinaryUpload.service";

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

  const handleLogout = () => {
    localStorage.removeItem("votenext_admin");
    navigate("/admin/login");
  };

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

    // FIX: normalize structure (Dashboard vs Preview)
    const raw = room?.data || room;  // Dashboard → room | Preview → room.data

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
      raw.vote_mode === 'hybrid'
        ? 'online+remote'
        : raw.vote_mode || 'online';

    const mappedChoices =
      (raw.contestants || [])
        .sort((a, b) => (a.order_number || 0) - (b.order_number || 0))
        .map((c, idx) => ({
          id: c.id || idx + 1,
          label: c.stage_name || '',
          description: c.description || '',
          image: null,
          imagePreview: buildImageUrl(c.image_url),
          imageUrl: c.image_url || '',
        }));

    setFormData({
      title: raw.title || '',
      description: raw.description || '',
      modeType,
      counterType: raw.start_time || raw.end_time ? 'auto' : 'manual',
      startDate: toDate(raw.start_time),
      endDate: toDate(raw.end_time),
      startTime: toTime(raw.start_time),
      endTime: toTime(raw.end_time),
      choices: mappedChoices.length > 0
        ? mappedChoices
        : [{ id: 1, label: '', description: '', image: null, imagePreview: null }],
    });

    // FIX: editingId fallback
    setEditingId(raw.round_id || raw.id || null);

    // FIX: dependency ให้ trigger เมื่อ room เปลี่ยน
  }, [location.state?.room]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('กรุณาใส่ชื่อโพล');
      return;
    }

    const validChoices = formData.choices.filter(choice => choice.label.trim() !== '');

    if (validChoices.length < 2) {
      toast.error('กรุณาเพิ่มตัวเลือกอย่างน้อย 2 ตัวเลือก');
      return;
    }

    const hasIncompleteChoices = validChoices.some(choice => !choice.label.trim());
    if (hasIncompleteChoices) {
      toast.error('กรุณากรอกชื่อตัวเลือกให้ครบทุกช่อง');
      return;
    }

    try {
      setIsSubmitting(true);

      const uploadedChoices = await Promise.all(
        formData.choices.map(async (choice, index) => {
          let imageUrl = choice.imageUrl || null;

          if (choice.image) {
            const uploadResult = await uploadImageToCloudinary(
              choice.image,
              "contestants/temp"
            );
            imageUrl = uploadResult.imageUrl;
          }

          return {
            stage_name: choice.label,
            description: choice.description,
            image_url: imageUrl,
            order_number: index + 1,
          };
        })
      );

      // convert date + time → postgres friendly timestamptz
      const fixTZ = (date, time) => {
        if (!date || !time) return null;
        const timeWithSeconds = time.includes(':') ? time : `${time}:00`;
        return `${date} ${timeWithSeconds}+07`;
      };

      const submitData = {
        title: formData.title,
        description: formData.description,
        vote_mode:
          formData.modeType === "online+remote"
            ? "hybrid"
            : formData.modeType,
        counter_type: formData.counterType,
        contestants: uploadedChoices,
      };

      // attach start/end only if auto mode
      if (formData.counterType === "auto") {
        submitData.start_time = fixTZ(formData.startDate, formData.startTime);
        submitData.end_time = fixTZ(formData.endDate, formData.endTime);
      }

      if (editingId) {
        await updateRoom(editingId, submitData);
        toast.success("อัปเดตโพลสำเร็จ!");
      } else {
        const result = await createVotePoll(submitData);
        toast.success("สร้างโพลสำเร็จ!");
        const show = result.data.show;
        const round = result.data.round;
        const contestants = result.data.contestants;

        navigate(`/admin/preview/${show.id}`, {
          state: {
            room: {
              data: {
                show,
                round,
                contestants,
              }
            }
          },
        });
      }

    } catch (err) {
      console.error(err);
      toast.error("อัปโหลดหรือบันทึกล้มเหลว");
    } finally {
      setIsSubmitting(false);
    }

  };

  return (
    <div className="create-vote-container">
      <Navbar showProfile onLogout={handleLogout} />

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
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(-1)}
            >
              previous
            </button>

            {/* Submit จริง */}
            <button
              type="submit"
              className={`create-btn ${editingId ? 'save-btn' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : editingId
                  ? 'Saved changes'
                  : 'Created poll'}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
};

export default CreateVotePoll;
