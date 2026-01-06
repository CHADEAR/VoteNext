// src/pages/admin/AdminPreviewVotePollPage.jsx
import React from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import PreviewPollCard from "../../components/admin/preview/PreviewPollCard";
import PreviewContestantGrid from "../../components/admin/preview/PreviewContestantGrid";
import PreviewTimeSetting from "../../components/admin/preview/PreviewTimeSetting";
import PreviewShareBox from "../../components/admin/preview/PreviewShareBox";
import Navbar from "../../components/layout/Navbar";
import "./AdminPreviewVotePollPage.css";

/**
 * Expected data shape (confirmed by runtime logs):
 *
 * room = {
 *   success: true,
 *   data: {
 *     show: {
 *       id,
 *       title,
 *       description,
 *       created_at
 *     },
 *     round: {
 *       id,
 *       start_time,
 *       end_time,
 *       public_slug,
 *       vote_mode,
 *       status
 *     },
 *     contestants?: [
 *       { id, stage_name, description, image_url, order_number }
 *     ]
 *   }
 * }
 */

export default function AdminPreviewVotePollPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state?.room;

  // Safety guard: if data shape is invalid, go back to dashboard
  if (!room || !room.data || !room.data.show || !room.data.round) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const { show, round, contestants = [] } = room.data;

  const handleLogout = () => {
    localStorage.removeItem("votenext_admin");
    navigate("/admin/login");
  };

  // Determine counter type
  const counterType =
    round.start_time && round.end_time ? "auto" : "manual";

  // Helper: safely format date (YYYY-MM-DD)
  const toDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  };

  // Helper: safely format time (HH:mm)
  const toTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toISOString().slice(11, 16);
  };

  const mappedContestants = contestants.map((c, index) => ({
    id: c.id || index,
    stage_name: c.stage_name,
    description: c.description || "",
    image_url: c.image_url || "",
  }));

  return (
    <div className="preview-container">
      <Navbar showProfile onLogout={handleLogout} />

      <h1 className="preview-title">Preview Vote Poll</h1>

      <PreviewPollCard
        title={show.title}
        description={show.description}
      />

      <PreviewContestantGrid contestants={mappedContestants} />

      <div className="preview-bottom">
        <PreviewShareBox publicSlug={round.public_slug} />

        <PreviewTimeSetting
          counterType={counterType}
          startDate={toDate(round.start_time)}
          endDate={toDate(round.end_time)}
          startTime={toTime(round.start_time)}
          endTime={toTime(round.end_time)}
        />
      </div>

      <div className="preview-actions">
        <button
          className="btn-secondary"
          onClick={() => navigate(-1)}
        >
          Previous
        </button>

        <button
          className="btn-primary"
          onClick={() => alert("Start Vote (ขั้นตอนถัดไป)")}
        >
          Continue Start Vote
        </button>
      </div>
    </div>
  );
}
