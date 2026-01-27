// src/pages/admin/AdminPreviewVotePollPage.jsx

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import apiClient from "../../api/apiClient";
import PreviewPollCard from "../../components/admin/preview/PreviewPollCard";
import PreviewContestantGrid from "../../components/admin/preview/PreviewContestantGrid";
import PreviewShareBox from "../../components/admin/preview/PreviewShareBox";
<<<<<<< Updated upstream
import PreviewQRCode from "../../components/admin/preview/PreviewQRCode";
=======
>>>>>>> Stashed changes
import PreviewTimeSetting from "../../components/admin/preview/PreviewTimeSetting";
import Navbar from "../../components/layout/Navbar";
import "./AdminPreviewVotePollPage.css";

export default function AdminPreviewVotePollPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state?.room;

  // Safety guard
  if (!room || !room.data || !room.data.show || !room.data.round) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const show = room.data.show;
  const contestants = room.data.contestants || [];

  // Local round state
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

  // Determine counter type (auto preview route should always show auto)
  const counterType = "auto";

  const toDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const toTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const hh = String(d.getHours()).padStart(2, "0");     // LOCAL +07
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  // Debug logging for date data
  console.log("Full room object:", room);
  console.log("Round data:", round);
  console.log("Round keys:", Object.keys(round));
  console.log("Start time raw:", round.start_time);
  console.log("End time raw:", round.end_time);
  console.log("Start date formatted:", toDate(round.start_time));
  console.log("End date formatted:", toDate(round.end_time));


  const mappedContestants = contestants.map((c, index) => ({
    id: c.id || index,
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
<<<<<<< Updated upstream
          
          <PreviewQRCode publicSlug={round.public_slug} />
=======
>>>>>>> Stashed changes

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
            onClick={() => navigate(`/admin/rounds/${round.id}`)}
          >
            view result
          </button>
        </div>
          <button
            className="btn-primary"
            onClick={() => navigate(`/admin/rounds/${round.id}`)}
          >
            view result
          </button>
        </div>
      </main>
    </div>
  );
}
