// src/pages/voter/VoteRankPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getLiveRankBySlug } from "../../api/rank.api";
import { io } from "socket.io-client";
import "./VoteRankPage.css";

export default function VoteRankPage() {
  const { publicSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState([]);

  const fetchRank = async () => {
    try {
      const res = await getLiveRankBySlug(publicSlug);
      let data = res?.data?.data || [];
      setRankings(data);
    } catch (err) {
      console.error("Failed to load rank", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchRank();
    
    // Setup Socket.IO connection for realtime updates
    console.log('🔌 Initializing Socket.IO connection...');
    const socket = io('http://localhost:4000', {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      timeout: 10000,
      forceNew: false, // Don't force new connection to avoid conflicts
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socket.on('vote_update', (data) => {
      console.log('📨 Received vote update:', data);
      fetchRank(); // Fetch updated rankings when vote occurs
    });
    
    socket.on('connect', () => {
      console.log('🔌 Connected to realtime voting');
    });
    
    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from realtime voting:', reason);
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Reconnected to realtime voting, attempt:', attemptNumber);
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔌 Reconnecting to realtime voting, attempt:', attemptNumber);
    });
    
    return () => {
      console.log('🔌 Cleaning up Socket.IO connection...');
      socket.disconnect();
    };
  }, [publicSlug]);

  if (loading) return <div className="rank-loading">Loading...</div>;

  const hasRanks = rankings.some(r => r.rank !== null);

  // ===========================================
  // 🔹 LIVE RANK GENERATION (shared rank map)
  // ===========================================
  let computed = rankings;

  if (!hasRanks) {
    // compute live score - แสดงทุกคนไม่ว่าจะมีคะแนนหรือไม่
    computed = rankings.map(r => ({
      ...r,
      live_score: Number(r.online_votes || 0) + Number(r.remote_votes || 0)
    }));

    // sort by live score desc - คนที่ไม่มีคะแนนจะอยู่ล่างสุด
    computed = computed.slice().sort((a, b) => b.live_score - a.live_score);

    // assign shared rank
    let prevScore = null;
    let prevRank = null;

    computed = computed.map((c, i) => {
      if (c.live_score === prevScore) {
        return { ...c, rank: prevRank };
      }
      const newRank = i + 1;
      prevScore = c.live_score;
      prevRank = newRank;
      return { ...c, rank: newRank };
    });
  }

  // ===========================================
  // 🔸 FINAL CASE (already rank from backend)
  // ===========================================
  const isFinal = rankings.some((r) => r.total_score != null);

  const scoreLabel = (r) =>
    isFinal
      ? `${Number(r.total_score || 0)} Score`
      : `${Number(r.live_score || 0)} Vote`;

  // ===========================================
  // 🎤 Podium (2 | 1 | 3) - แสดง 3 อันดับแรก
  // ===========================================
  const top3 = computed.slice(0, 3); // 3 อันดับแรกจากการเรียงลำดับ
  const rest = computed.slice(3); // ที่เหลือนับจากอันดับที่ 4 เป็นต้นไป

  const podiumOrder = [
    top3[1], // อันดับ 2 (index 1)
    top3[0], // อันดับ 1 (index 0) 
    top3[2], // อันดับ 3 (index 2)
  ].filter(Boolean); // กรองค่า undefined/null ออก

  return (
    <div className="rank-page">
      <div className="rank-logo">VOTE NEXT</div>

      {/* Podium */}
      <div className="rank-podium">
        {podiumOrder.map((c, index) => (
          <div key={c.id} className={`podium-item podium-r${index === 1 ? 1 : index === 0 ? 2 : 3}`}>
            <div className="podium-rank-badge">
              {index === 1 ? 1 : index === 0 ? 2 : 3}
            </div>

            <div className="podium-avatar">
              {c.image_url ? (
                <img src={c.image_url} alt={c.stage_name} />
              ) : (
                <div className="avatar-placeholder"></div>
              )}
            </div>

            <div className="podium-name">{c.stage_name}</div>

            <div className="podium-score">
              {scoreLabel(c)}
            </div>
          </div>
        ))}
      </div>

      {/* Rank List */}
      <div className="rank-list">
        {rest.map((c, index) => (
          <div key={c.id} className="rank-row">
            <span className="rank-index">{index + 4}</span>

            <div className="rank-avatar">
              {c.image_url ? (
                <img src={c.image_url} alt={c.stage_name} />
              ) : (
                <div className="avatar-placeholder"></div>
              )}
            </div>

            <span className="rank-name">{c.stage_name}</span>
            <span className="rank-score">{scoreLabel(c)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
