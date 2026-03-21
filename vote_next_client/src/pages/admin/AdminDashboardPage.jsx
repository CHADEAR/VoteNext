import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getRooms } from "../../services/rooms.service";
import { deleteRoom } from "../../api/rooms.api";
import { clearAdminSession } from "../../services/auth.service";
import { FiEye, FiShare2, FiEdit, FiTrash2, FiWifi } from "react-icons/fi";
import { FaSearch } from "react-icons/fa";
import { MdOutlineSettingsRemote } from "react-icons/md";
import Navbar from "../../components/layout/Navbar";
import "./AdminDashboard.css";

const MODE_LABEL = {
  all: "All",
  online: "Online",
  remote: "Remote",
};

const STATUS_LABEL = {
  all: "All",
  pending: "Pending",
  voting: "Voting",
  closed: "Closed",
  end: "Closed",
};

const renderVoteModeIcon = (voteMode) => {
  if (voteMode === "online") {
    return <FiWifi aria-label="Online mode" title="Online mode" />;
  }

  if (voteMode === "remote") {
    return (
      <MdOutlineSettingsRemote
        aria-label="Remote mode"
        title="Remote mode"
      />
    );
  }

  return null;
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

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const data = await getRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Unable to load poll list");
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
      const matchMode = modeFilter === "all" || room.vote_mode === modeFilter;
      const matchStatus = statusFilter === "all" || room.status === statusFilter;
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

  const handleDelete = async (room) => {
    const ok = window.confirm(`Delete poll "${room.title}"?`);
    if (!ok) return;

    try {
      await deleteRoom(room.round_id);
      await fetchRooms();
    } catch (err) {
      console.error(err);
      alert("Failed to delete poll");
    }
  };

  const handleLogout = () => {
    clearAdminSession();
    navigate("/admin/login");
  };

  if (loading) {
    return <div className="admin-dashboard__empty">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <Navbar showProfile onLogout={handleLogout} />

      <main className="dashboard-content">
        <h1 className="page-title">Vote Polls</h1>

        <div className="controls">
          <div className="search-box">
            <input
              placeholder="Search polls"
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
              {STATUS_LABEL[statusFilter] || statusFilter}
              <span>v</span>
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
                    {STATUS_LABEL[item] || item}
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
              <span>v</span>
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
            Create Poll
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        {filteredRooms.length === 0 ? (
          <div className="admin-dashboard__empty">No polls found</div>
        ) : (
          <div className="poll-list">
            {filteredRooms.map((room) => (
              <div className="poll-card" key={room.round_id}>
                <div className="poll-left">
                  <div className="mode-icon">
                    {renderVoteModeIcon(room.vote_mode)}
                  </div>

                  <div>
                    <div className="poll-title">
                      {room.title || "Untitled poll"}
                    </div>
                    <div className="poll-date">
                      Created at {new Date(room.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="poll-actions">
                  <span className={`status ${room.status}`}>
                    {STATUS_LABEL[room.status] || room.status}
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

        {shareLink && <div className="share-hint">Link copied: {shareLink}</div>}
      </main>
    </div>
  );
}
