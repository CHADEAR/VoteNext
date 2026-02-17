// src/pages/admin/AdminPreviewVotePollPage.jsx

import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import PreviewPollCard from "../../components/admin/preview/PreviewPollCard";
import PreviewContestantGrid from "../../components/admin/preview/PreviewContestantGrid";
import PreviewTimeSetting from "../../components/admin/preview/PreviewTimeSetting";
import PreviewShareBox from "../../components/admin/preview/PreviewShareBox";
import Navbar from "../../components/layout/Navbar";
import { io } from "socket.io-client";
import apiClient from "../../api/apiClient";
import "./AdminPreviewVotePollPage.css";

export default function AdminPreviewVotePollPage() {
  const params = useParams();
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
      ? 'http://localhost:4000'
      : 'https://vote-next-backend.vercel.app'; // Replace with your backend URL
    
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
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("votenext_admin");
    navigate("/admin/login");
  };

  // Determine counter type
  const counterType =
    round.start_time && round.end_time ? "auto" : "manual";

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
    id: c.id || index,
    stage_name: c.stage_name,
    description: c.description || "",
    image_url: c.image_url || "",
  }));

  return (
  <div>
    <Navbar showProfile onLogout={handleLogout} />
    <div className="preview-container">
      
      <h1 className="preview-title">Preview & Start Vote Poll</h1>

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
          manualStartTime={round.start_time}
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
    </div>
  </div>
  );
}
