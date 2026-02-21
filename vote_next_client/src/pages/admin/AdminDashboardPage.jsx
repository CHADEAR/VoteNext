import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRooms } from "../../services/rooms.service";
import { deleteRoom } from "../../api/rooms.api";
import { clearAdminSession } from "../../services/auth.service";
import { FiEye, FiShare2, FiEdit, FiTrash2 } from "react-icons/fi";
import { FaSearch } from "react-icons/fa";
import Navbar from "../../components/layout/Navbar";
import "./AdminDashboard.css";

const MODE_LABEL = {
  all: "All",
  online: "Online",
  remote: "Remote",
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modeFilter, setModeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openStatus, setOpenStatus] = useState(false);
  const [openMode, setOpenMode] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ ต้องอยู่ระดับ component เพื่อให้เรียกซ้ำได้
  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await getRooms(); // backend คืน array
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("ไม่สามารถดึงรายการโพลได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return rooms.filter((room) => {
      const matchMode =
        modeFilter === "all" || room.vote_mode === modeFilter;
      const matchStatus =
        statusFilter === "all" || room.status === statusFilter;
      const titleText = String(room.title || "").toLowerCase();
      const matchSearch = !query || titleText.startsWith(query);
      return matchMode && matchStatus && matchSearch;
    });
  }, [rooms, modeFilter, statusFilter, searchQuery]);

  const applySearch = () => {
    setSearchQuery(searchInput);
  };

  const handleShare = (room) => {
    const url =
      room.public_url ||
      `${window.location.origin}/vote/${room.public_slug || room.round_id}`;
    setShareLink(url);
    if (navigator.clipboard && url) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  const handleView = (room) => {
    // shape ให้ตรงกับ Preview
    const previewData = {
      success: true,
      data: {
        show: {
          id: room.show_id,
          title: room.title,
          description: room.description,
          created_at: room.created_at,
        },
        round: {
          id: room.round_id,
          start_time: room.start_time,
          end_time: room.end_time,
          public_slug: room.public_slug,
          vote_mode: room.vote_mode,
          status: room.status,
        },
        contestants: room.contestants || [],
      },
    };

    navigate(`/admin/preview/${room.round_id}`, {
      state: { room: previewData },
    });
  };

  const handleEdit = (room) => {
    if (room.status !== "pending") return;
    navigate("/admin/create-poll", { state: { room } });
  };

  // ✅ hard delete + refresh จาก backend
  const handleDelete = async (room) => {
    const ok = window.confirm(`ลบโพล "${room.title}" หรือไม่?`);
    if (!ok) return;

    try {
      await deleteRoom(room.round_id); // 🔥 ลบจริง
      await fetchRooms();              // 🔁 reload จาก DB
    } catch (err) {
      console.error(err);
      alert("ลบไม่สำเร็จ");
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    navigate("/admin/login");
  };

  if (loading) {
    return <div className="admin-dashboard__empty">กำลังโหลด...</div>;
  }

  return (
    <div className="dashboard">
      <Navbar showProfile onLogout={handleLogout} />

      <main className="dashboard-content">
        <h1 className="page-title">Vote Poll</h1>

        {/* Controls */}
        <div className="controls">
          <div className="search-box">
            <input
              placeholder="search box"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
            />
             <button
              type="button"
              className="search-icon-btn"
              onClick={applySearch}
              aria-label="Search"
            >
              <FaSearch color="#F2E16B" />
            </button>
          </div>

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
                {["all", "pending", "voting", "closed"].map((item) => (
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

        {error && <div className="error">{error}</div>}

        {filteredRooms.length === 0 ? (
          <div className="admin-dashboard__empty">ยังไม่มีโพล</div>
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
