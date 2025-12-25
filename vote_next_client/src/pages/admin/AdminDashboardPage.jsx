// src/pages/admin/AdminDashboard.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getRooms } from "../../services/rooms.service";
import "./AdminDashboard.css";
import { FiEye, FiShare2, FiEdit, FiTrash2 } from "react-icons/fi";
import logo from '../../assets/Black_White_Modern_Bold_Design_Studio_Logo-removebg-preview.png';
import { FaSearch } from "react-icons/fa";
import { CgProfile } from "react-icons/cg";
import { IoCamera } from "react-icons/io5";


const MODE_LABEL = {
  all: "All",
  online: "Online",
  remote: "Remote",
  hybrid: "ทั้ง 2",
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [openProfile, setOpenProfile] = useState(false);

  const profileRef = useRef(null);

  const fileInputRef = useRef(null);

  const [profileImage, setProfileImage] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modeFilter, setModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [openStatus, setOpenStatus] = useState(false);
  const [openMode, setOpenMode] = useState(false);

  const [shareLink, setShareLink] = useState("");

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setLoading(true);
        const data = await getRooms();
        setRooms(data || []);
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถดึงรายการโพลได้");
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  // ปิดเมื่อคลิกนอกกล่อง
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setOpenProfile(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchMode =
        modeFilter === "all" || room.vote_mode === modeFilter;
      const matchStatus =
        statusFilter === "all" || room.status === statusFilter;
      return matchMode && matchStatus;
    });
  }, [rooms, modeFilter, statusFilter]);

  const handleShare = (room) => {
    const url =
      room.public_url ||
      `${window.location.origin}/vote/${room.public_slug || room.round_id}`;
    setShareLink(url);
    if (navigator.clipboard && url) {
      navigator.clipboard.writeText(url).catch(() => { });
    }
  };

  const handleView = (room) => {
    navigate(`/admin/preview/${room.round_id}`, {
      state: { room }
    });
  };

  const handleEdit = (room) => {
    if (room.status !== "pending") return;
    navigate("/admin/create-poll", { state: { room } });
  };

  const handleDelete = (room) => {
    const ok = window.confirm(`ลบโพล "${room.title}" หรือไม่?`);
    if (!ok) return;
    setRooms((prev) =>
      prev.filter((r) => r.round_id !== room.round_id)
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const size = Math.min(img.width, img.height);
          canvas.width = size;
          canvas.height = size;
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
          const resizedDataUrl = canvas.toDataURL('image/jpeg');
          setProfileImage(resizedDataUrl);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return <div className="admin-dashboard__empty">กำลังโหลด...</div>;
  }

  return (
    <div className="dashboard">
      {/* Topbar */}
      <header className="topbar">
        <img src={logo} alt="logo" className="logo-img" />

        {/* Profile */}
        <div className="profile-wrapper" ref={profileRef}>
          <button
            className="profile-btn"
            onClick={() => setOpenProfile(!openProfile)}
          >
            {profileImage ? <img src={profileImage} alt="profile" className="profile-img" /> : <CgProfile size={40} className="person-icon-small" />}
          </button>

          {openProfile && (
            <div className="profile-dropdown">
              <div className="profile-avatar">
                {!profileImage && <CgProfile size={90} className="person-icon" />}
                {profileImage && <img src={profileImage} alt="avatar" className="avatar-img" />}
                <span className="camera" onClick={() => fileInputRef.current.click()}><IoCamera /></span>
              </div>

              <div className="profile-email">
                admin1@gmail.com
              </div>

              <button
                className="logout-btn"
                onClick={() => {
                  localStorage.removeItem("votenext_admin");
                  navigate("/admin/login");
                }}
              >
                LOGOUT
              </button>
            </div>
          )}
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{display: 'none'}} accept="image/*" />
      </header>

      <main className="dashboard-content">
        <h1 className="page-title">My Vote Poll</h1>

        {/* Controls */}
        <div className="controls">
          <div className="search-box">
            <FaSearch color="#F2E16B" />
            <input placeholder="search box" />
          </div>

          {/* Status dropdown */}
          <div className="dropdown">
            <button
              className="dropdown-btn"
              onClick={() => setOpenStatus(!openStatus)}
            >
              {statusFilter}
              <span>⌄</span>
            </button>

            {openStatus && (
              <div className="dropdown-menu">
                {["all", "pending", "ending"].map((item) => (
                  <div
                    key={item}
                    className={`dropdown-item ${
                      statusFilter === item ? "active" : ""
                    }`}
                    onClick={() => {
                      setStatusFilter(item);
                      setOpenStatus(false);
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mode dropdown */}
          <div className="dropdown">
            <button
              className="dropdown-btn"
              onClick={() => setOpenMode(!openMode)}
            >
              {MODE_LABEL[modeFilter]}
              <span>⌄</span>
            </button>

            {openMode && (
              <div className="dropdown-menu">
                {Object.keys(MODE_LABEL).map((key) => (
                  <div
                    key={key}
                    className={`dropdown-item ${
                      modeFilter === key ? "active" : ""
                    }`}
                    onClick={() => {
                      setModeFilter(key);
                      setOpenMode(false);
                    }}
                  >
                    {MODE_LABEL[key]}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            className="create-btn"
            onClick={() => navigate("/admin/create-poll")}
          >
            Create Poll ↗
          </button>
        </div>

        {/* Error */}
        {error && <div className="error">{error}</div>}

        {/* List */}
        {filteredRooms.length === 0 ? (
          <div className="admin-dashboard__empty">
            ยังไม่มีโพล
          </div>
        ) : (
          <div className="poll-list">
            {filteredRooms.map((room) => (
              <div className="poll-card" key={room.round_id}>
                <div className="poll-left">
                  <div className="mode-icon">
                    {room.vote_mode === "online" ? "📶" : "⬛"}
                  </div>

                  <div>
                    <div className="poll-title">
                      {room.title || "Untitled poll"}
                    </div>
                    <div className="poll-date">
                      created at{" "}
                      {new Date(room.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="poll-actions">
                  <span className={`status ${room.status}`}>
                    {room.status}
                  </span>

                  <button
                    className="action-btn"
                    onClick={() => handleView(room)}
                    title="Preview"
                  >
                    <FiEye />
                  </button>

                  <button
                    className="action-btn"
                    onClick={() => handleShare(room)}
                    title="Share"
                  >
                    <FiShare2 />
                  </button>

                  <button
                    className="action-btn"
                    onClick={() => handleEdit(room)}
                    title="Edit"
                    disabled={room.status !== "pending"}
                  >
                    <FiEdit />
                  </button>

                  <button
                    className="action-btn danger"
                    onClick={() => handleDelete(room)}
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {shareLink && (
          <div className="share-hint">
            ลิงก์ถูกคัดลอกแล้ว: {shareLink}
          </div>
        )}
      </main>
    </div>
  );
}
