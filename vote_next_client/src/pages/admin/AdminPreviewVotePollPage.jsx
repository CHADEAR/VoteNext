import React from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";

import PreviewPollCard from "../../components/admin/preview/PreviewPollCard";
import PreviewContestantGrid from "../../components/admin/preview/PreviewContestantGrid";
import PreviewTimeSetting from "../../components/admin/preview/PreviewTimeSetting";
import PreviewShareBox from "../../components/admin/preview/PreviewShareBox";

import "./AdminPreviewVotePollPage.css";

export default function AdminPreviewVotePollPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const room = location.state?.room;

  // ❗️เข้าตรงโดยไม่มี state
  if (!room) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Determine counter type based on both start_time and end_time being present
  const counterType = (room.start_time && room.end_time) ? "auto" : "manual";

  // Helper function to safely format date
  const toDate = (iso) => {
    if (!iso) return "";
    try {
      const date = new Date(iso);
      return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
    } catch (e) {
      return "";
    }
  };

  // Helper function to safely format time
  const toTime = (iso) => {
    if (!iso) return "";
    try {
      const date = new Date(iso);
      return isNaN(date.getTime()) ? "" : date.toISOString().slice(11, 16);
    } catch (e) {
      return "";
    }
  };

  const contestants = (room.contestants || []).map((c, index) => ({
    id: c.id || index,
    stage_name: c.stage_name,
    description: c.description,
    image_url: c.image_url,
  }));

  return (
    <div className="preview-page">
      <h1 className="preview-title">Preview Vote Poll</h1>

      <PreviewPollCard
        title={room.title}
        description={room.description}
      />

      <PreviewContestantGrid contestants={contestants} />

      <div className="preview-bottom">
        <PreviewShareBox publicSlug={room.public_slug} />

        <PreviewTimeSetting
          counterType={counterType}
          startDate={toDate(room.start_time)}
          endDate={toDate(room.end_time)}
          startTime={toTime(room.start_time)}
          endTime={toTime(room.end_time)}
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
          onClick={() =>
            alert("Start Vote (ขั้นตอนถัดไป)")
          }
        >
          Continue Start Vote
        </button>
      </div>
    </div>
  );
}
