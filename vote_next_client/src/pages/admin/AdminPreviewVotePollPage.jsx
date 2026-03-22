//vote_next_client/src/pages/admin/AdminPreviewVotePollPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation, Navigate } from "react-router-dom";
import PreviewPollCard from "../../components/admin/preview/PreviewPollCard";
import PreviewContestantGrid from "../../components/admin/preview/PreviewContestantGrid";
import PreviewTimeSetting from "../../components/admin/preview/PreviewTimeSetting";
import PreviewShareBox from "../../components/admin/preview/PreviewShareBox";
import Navbar from "../../components/layout/Navbar";
import { io } from "socket.io-client";
import apiClient from "../../api/apiClient";
import { clearAdminSession } from "../../services/auth.service";
import "./AdminPreviewVotePollPage.css";

export default function AdminPreviewVotePollPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const room = location.state?.room;
  const roundId = String(
    params.pollId ||
      params.id ||
      params.roundId ||
      room?.data?.round?.id ||
      room?.data?.round?.round_id ||
      ""
  );

  // Safety guard
  if (!room || !room.data || !room.data.show || !room.data.round) {
    return <Navigate to="/" replace />;
  }

  const [show, setShow] = useState(room.data.show);

  // Local states
  const [round, setRound] = useState(room.data.round);
  const [contestants, setContestants] = useState(room.data.contestants || []);

  // GET round from backend (auto/manual update)
  const fetchRound = async () => {
    try {
      const res = await apiClient.get("/rooms");
      const rows = res?.data?.data || res?.data || [];

      const found = (Array.isArray(rows) ? rows : []).find(
        (item) => String(item.round_id || item.id || item.roundId || "") === roundId
      );

      if (!found) {
        console.warn("Preview poll not found:", roundId);
        return;
      }

      setRound((prev) => ({
        ...prev,
        id: found.round_id || found.id || prev?.id,
        round_id: found.round_id || found.id || prev?.round_id,
        title: found.title || prev?.title,
        description: found.description || prev?.description,
        status: found.status || prev?.status,
        start_time: found.start_time || prev?.start_time,
        end_time: found.end_time || prev?.end_time,
        public_slug: found.public_slug || prev?.public_slug,
        vote_mode: found.vote_mode || prev?.vote_mode,
        counter_type: found.counter_type || prev?.counter_type,
      }));

      if (found.show_id || found.title || found.description) {
        setShow((prev) => ({
          ...prev,
          id: found.show_id || prev?.id,
          title: found.title || prev?.title,
          description: found.description || prev?.description,
        }));
      }

      setContestants(Array.isArray(found.contestants) ? found.contestants : []);
    } catch (err) {
      console.error("Failed to refresh round:", err);
    }
  };


  // Socket.IO connection for realtime updates
  useEffect(() => {
    // Initial fetch
    fetchRound();
    
    // Setup Socket.IO connection
    console.log('🔌 Admin initializing Socket.IO connection...');
    
    // Use different URLs for development vs production
    const socketUrl = window.location.hostname === 'localhost' 
      ? "http://localhost:4000"
      : "https://votenext.onrender.com"; // Replace with your backend URL
    
    const socket = io(socketUrl, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      timeout: 10000,
      forceNew: false, // Don't force new connection to avoid conflicts
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socket.on('vote_update', (data) => {
      console.log('📨 Admin received vote update:', data);
      fetchRound(); // Fetch updated round data when vote occurs
    });
    
    socket.on('connect', () => {
      console.log('🔌 Admin connected to realtime voting');
    });
    
    socket.on('connect_error', (error) => {
      console.error('🔌 Admin socket connection error:', error);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Admin disconnected from realtime voting:', reason);
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Admin reconnected, attempt:', attemptNumber);
    });
    
    return () => {
      console.log('🔌 Admin cleaning up Socket.IO connection...');
      socket.disconnect();
    };
  }, [roundId]);

  const handleLogout = () => {
    clearAdminSession();
    navigate("/admin/login");
  };

  // Determine counter type
  const counterType =
    round.counter_type || (round.start_time && round.end_time ? "auto" : "manual");

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


  const mappedContestants = contestants.map((c, index) => ({
    id:
      c.id ||
      c.contestant_id ||
      c.candidate_id ||
      c.contestant?.id ||
      index,
    stage_name:
      c.stage_name ||
      c.name ||
      c.label ||
      c.contestant?.stage_name ||
      c.contestant?.name ||
      "",
    description:
      c.description ||
      c.contestant?.description ||
      "",
    image_url:
      c.image_url ||
      c.imageUrl ||
      c.photo_url ||
      c.photoUrl ||
      c.contestant?.image_url ||
      c.contestant?.imageUrl ||
      "",
  }));

  return (
  <div>
    <Navbar showProfile onLogout={handleLogout} />
    <div className="preview-container">
      
      <h1 className="preview-title">Preview & Start Vote Poll</h1>

      <PreviewPollCard
        title={round.title || show.title}
        description={round.description || show.description}
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
          status={round.status}
          roundId={String(round.id || round.round_id || roundId || "")}
          onRefresh={fetchRound}
          manualStartTime={round.start_time}
        />
      </div>

      <div className="preview-actions admin-page-actions">
        <button
          className="btn-secondary admin-page-action-btn admin-page-action-btn--back"
          onClick={() => navigate(-1)}
        >
          Back
        </button>

        <button
          className="btn-primary admin-page-action-btn admin-page-action-btn--primary"
          onClick={() =>
            navigate(`/admin/rounds/${String(round.id || round.round_id || roundId || "")}`)
          }
        >
          View Results
        </button>
      </div>
    </div>
  </div>
  );
}
