import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRooms } from "../../services/rooms.service";
import "./AdminDashboard.css";

const MODE_LABEL = {
  online: "Online",
  remote: "Remote",
  hybrid: "Online + Remote",
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
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

  const filteredRooms = useMemo(() => {
    if (filter === "all") return rooms;
    return rooms.filter((r) => r.vote_mode === filter);
  }, [filter, rooms]);

  const handleShare = (room) => {
    const url = room.public_url || `${window.location.origin}/vote/${room.public_slug || room.round_id}`;
    setShareLink(url);
    if (navigator.clipboard && url) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const handleView = (room) => {
    const url = room.public_slug
      ? `/vote/${room.public_slug}`
      : `/vote/${room.round_id || room.show_id}`;
    navigate(url);
  };

  const handleEdit = (room) => {
    if (room.status !== "pending") return;
    console.log("room", room);
    navigate("/admin/create-poll", { state: { room } });
  };

  const handleDelete = (room) => {
    const ok = window.confirm(`ลบโพล "${room.title}" หรือไม่? (ยังไม่มี API ลบ จะลบเฉพาะในหน้านี้)`);
    if (!ok) return;
    setRooms((prev) => prev.filter((r) => r.round_id !== room.round_id));
  };

  const renderEmpty = () => (
    <div className="admin-dashboard__empty">
      <p>ยังไม่มีโพล</p>
      <button className="primary" onClick={() => navigate("/admin/create-poll")}>
        Create Poll
      </button>
    </div>
  );

  const renderList = () => (
    <div className="admin-dashboard__list">
      {filteredRooms.map((room) => (
        <div key={room.round_id} className="poll-card">
          <div className="poll-card__main">
            <div className="poll-card__title">{room.title || "Untitled poll"}</div>
            <div className="poll-card__meta">
              <span>{MODE_LABEL[room.vote_mode] || room.vote_mode}</span>
              {room.created_at && (
                <span>
                  {new Date(room.created_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <div className="poll-card__actions">
            <button onClick={() => handleView(room)} title="View">👁</button>
            <button onClick={() => handleShare(room)} title="Share">🔗</button>
            {room.status === "pending" && (
              <button onClick={() => handleEdit(room)} title="Edit">✏️</button>
            )}
            <button onClick={() => handleDelete(room)} title="Delete">🗑</button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <div>
          <div className="logo">StageLink</div>
          <h2>My Vote Poll</h2>
        </div>
        <div className="admin-dashboard__controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Online + Remote</option>
          </select>
          <button className="primary" onClick={() => navigate("/admin/create-poll")}>
            Create Poll
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="admin-dashboard__empty">กำลังโหลด...</div>
      ) : filteredRooms.length === 0 ? (
        renderEmpty()
      ) : (
        renderList()
      )}

      {shareLink && (
        <div className="share-hint">
          ลิงก์ถูกคัดลอกแล้ว: {shareLink}
        </div>
      )}
    </div>
  );
}
