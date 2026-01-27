import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../../components/layout/Navbar";
import PreviewPollCard from "../../components/admin/preview/PreviewPollCard";
import PreviewContestantGrid from "../../components/admin/preview/PreviewContestantGrid";
import PreviewShareBox from "../../components/admin/preview/PreviewShareBox";
import PreviewTimeSetting from "../../components/admin/preview/PreviewTimeSetting";
import apiClient from "../../api/apiClient";
import "./AdminPreviewVotePollPage.css";

export default function AdminPreviewManualVotePollPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state?.room;

  // Safety guard
  if (!room || !room.data || !room.data.show || !room.data.round) {
    return <div className="admin-dashboard__empty">No room data available</div>;
  }

  const show = room.data.show;
  const contestants = room.data.contestants || [];
  const [round, setRound] = useState(room.data.round);

  // GET round from backend (auto/manual update)
  const fetchRound = async () => {
    try {
      const res = await apiClient.get(`/rounds/${round.id}`);
      const data = res.data?.data || res.data;

      // Update only round
      setRound((prev) => ({
        ...prev,
        ...data,
      }));
    } catch (err) {
      console.log("Backend API not available, using local data");
      // Don't update state if backend fails
    }
  };

  // Polling every 2s
  useEffect(() => {
    const interval = setInterval(fetchRound, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("votenext_admin");
    navigate("/admin/login");
  };

  const toDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  const toTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // Determine counter type (manual preview route should always show manual)
  const counterType = "manual";

  const mappedContestants = contestants
    .filter((c) => c.stage_name)
    .map((c) => ({
      id: c.id || Math.random(),
      stage_name: c.stage_name,
      description: c.description || "",
      image_url: c.image_url || "",
    }));

  return (
    <div className="preview-container">
      <Navbar showProfile onLogout={handleLogout} />

      <main className="main-content">
        <h1 className="preview-title">Preview Vote Poll</h1>

        <PreviewPollCard title={show.title} description={show.description} />

        <PreviewContestantGrid contestants={mappedContestants} />

        <div className="preview-bottom">
          <PreviewShareBox publicSlug={round.public_slug} />

          <PreviewTimeSetting
            counterType={counterType}
            startDate={toDate(round.start_time)}
            endDate={toDate(round.end_time)}
            startTime={toTime(round.start_time)}
            endTime={toTime(round.end_time)}
            status={round.status}
            roundId={round.id}
            onRefresh={fetchRound}
          />
        </div>

        <div className="preview-actions">
          <button className="btn-secondary" onClick={() => navigate(-1)}>
            Previous
          </button>

          <button
            className="btn-primary"
            onClick={() => navigate(`/admin/round-results`)}
          >
            view result
          </button>
        </div>
      </main>
    </div>
  );
}
