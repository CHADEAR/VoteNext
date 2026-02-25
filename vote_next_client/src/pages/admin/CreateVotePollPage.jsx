import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "../../components/layout/Navbar";
import "./CreateVotePoll.css";

import { createVotePoll } from "../../services/poll.service";
import { uploadImageToCloudinary } from "../../services/cloudinaryUpload.service";
import { patchRoom } from "../../api/rooms.api";
import { clearAdminSession } from "../../services/auth.service";

const CreateVotePoll = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // original for diff
  const [originalChoices, setOriginalChoices] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    modeType: "online",
    counterType: "auto",
    startDate: "",
    endDate: "",
    startTime: "00:00",
    endTime: "00:00",
    choices: [{ id: 1, label: "", description: "", image: null, imagePreview: null }],
  });

  const handleLogout = () => {
    clearAdminSession();
    navigate("/admin/login");
  };

  const buildImageUrl = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    const apiBase = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
    return apiBase.replace(/\/api\/?$/, "") + url;
  };

  const fixTZ = (date, time) => {
    if (!date || !time) return null;
    const t = time.includes(":") ? time : `${time}:00`;
    return `${date} ${t}+07`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleChoiceChange = (index, e) => {
    const { name, value } = e.target;
    const arr = [...formData.choices];
    arr[index][name] = value;
    setFormData((p) => ({ ...p, choices: arr }));
  };

  const handleImageChange = (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const arr = [...formData.choices];
      arr[idx].image = file;
      arr[idx].imagePreview = reader.result;
      setFormData((p) => ({ ...p, choices: arr }));
    };
    reader.readAsDataURL(file);
  };

  const addChoice = () => {
    setFormData((p) => ({
      ...p,
      choices: [
        ...p.choices,
        { id: Date.now(), label: "", description: "", image: null, imagePreview: null },
      ],
    }));
  };

  const removeChoice = (index) => {
    const arr = formData.choices.filter((_, i) => i !== index);
    setFormData((p) => ({ ...p, choices: arr }));
  };

  function buildContestantPatch(form, original) {
    const patch = { add: [], update: [], remove: [] };
    const map = new Map(original.map((c) => [c.id, c]));

    for (let i = 0; i < form.length; i++) {
      const f = form[i];
      const o = map.get(f.id);

      if (!o) {
        patch.add.push({
          stage_name: f.label,
          description: f.description || "",
          image_url: f.imageUrl || null,
          order_number: i + 1,
        });
        continue;
      }

      const diff = {};
      let changed = false;

      if (f.label !== o.stage_name) {
        diff.stage_name = f.label;
        changed = true;
      }
      if (f.description !== o.description) {
        diff.description = f.description;
        changed = true;
      }
      if (f.imageUrl !== o.image_url) {
        diff.image_url = f.imageUrl;
        changed = true;
      }
      const expected = i + 1;
      if (expected !== o.order_number) {
        diff.order_number = expected;
        changed = true;
      }

      if (changed) {
        diff.id = f.id;
        patch.update.push(diff);
      }

      map.delete(f.id);
    }

    for (const [id] of map) {
      patch.remove.push(id);
    }

    return patch;
  }

  useEffect(() => {
    const room = location.state?.room;
    if (!room) return;

    const raw = room.data || room;

    const toDate = (iso) => {
      if (!iso) return "";
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`;
    };

    const toTime = (iso) => {
      if (!iso) return "00:00";
      const d = new Date(iso);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };

    const modeType = raw.vote_mode || "online";

    const mapped = (raw.contestants || [])
      .sort((a, b) => (a.order_number || 0) - (b.order_number || 0))
      .map((c) => ({
        id: c.id,
        label: c.stage_name,
        description: c.description,
        image: null,
        imagePreview: buildImageUrl(c.image_url),
        imageUrl: c.image_url,
      }));

    setOriginalChoices(mapped);
    setEditingId(raw.round_id || raw.id);

    setFormData({
      title: raw.title || "",
      description: raw.description || "",
      modeType,
      counterType: raw.start_time || raw.end_time ? "auto" : "manual",
      startDate: toDate(raw.start_time),
      endDate: toDate(raw.end_time),
      startTime: toTime(raw.start_time),
      endTime: toTime(raw.end_time),
      choices: mapped.length ? mapped : [{ id: 1, label: "", description: "", image: null }],
    });
  }, [location.state?.room]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error("กรุณาใส่ชื่อโพล");
      return;
    }

    const valid = formData.choices.filter((c) => c.label.trim() !== "");
    if (valid.length < 2) {
      toast.error("กรุณาเพิ่มตัวเลือกอย่างน้อย 2 ตัวเลือก");
      return;
    }

    try {
      setIsSubmitting(true);

      const uploaded = await Promise.all(
        formData.choices.map(async (c, i) => {
          let imageUrl = c.imageUrl || null;
          if (c.image) {
            const up = await uploadImageToCloudinary(c.image, "contestants/temp");
            imageUrl = up.imageUrl;
          }
          return {
            id: c.id,
            stage_name: c.label,
            description: c.description,
            label: c.label, 
            image_url: imageUrl,
            order_number: i + 1,
          };
        })
      );

      if (editingId) {
        const payload = {
          poll: {
            title: formData.title,
            description: formData.description,
            vote_mode: formData.modeType,
            counter_type: formData.counterType,
          },
        };

        if (formData.counterType === "auto") {
          payload.poll.start_time = fixTZ(formData.startDate, formData.startTime);
          payload.poll.end_time = fixTZ(formData.endDate, formData.endTime);
        }

        const patch = buildContestantPatch(uploaded, originalChoices);
        if (patch.add.length || patch.update.length || patch.remove.length) {
          payload.contestants = patch;
        }

        await patchRoom(editingId, payload);
      
        console.log("PATCH payload =", JSON.stringify(payload, null, 2));
        toast.success("Updated poll successfully!");
        
      } else {
        const submit = {
          title: formData.title,
          description: formData.description,
          vote_mode: formData.modeType,
          counter_type: formData.counterType,
          contestants: uploaded,
        };
        if (formData.counterType === "auto") {
          submit.start_time = fixTZ(formData.startDate, formData.startTime);
          submit.end_time = fixTZ(formData.endDate, formData.endTime);
        }
        
        const r = await createVotePoll(submit);
        toast.success("สร้างโพลสำเร็จ!");

        navigate(`/admin/preview/${r.data.round.id}`, {
          state: { room: { data: r.data } },
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("Submit failed");
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
