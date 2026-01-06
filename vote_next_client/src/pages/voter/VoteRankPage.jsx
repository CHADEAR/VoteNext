// src/pages/voter/VoteRankPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getLiveRankBySlug } from "../../api/rank.api";

export default function VoteRankPage() {
  const { publicSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState([]);

  const fetchRank = async () => {
    try {
      const res = await getLiveRankBySlug(publicSlug);
      setRankings(res.data.data || []);
    } catch (err) {
      console.error("Failed to load rank", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRank();
    const timer = setInterval(fetchRank, 3000); // ⏱ polling
    return () => clearInterval(timer);
  }, [publicSlug]);

  if (loading) return <div>Loading rank...</div>;

  return (
    <div className="vote-rank-page">
      {/* 🏆 TOP 3 */}
      <div className="podium">
        {rankings.slice(0, 3).map((c, idx) => (
          <div key={c.id} className={`podium-item rank-${idx + 1}`}>
            <div className="avatar" />
            <div className="name">{c.stage_name}</div>
            <div className="score">{c.live_score} Vote</div>
          </div>
        ))}
      </div>

      {/* 📋 RANK LIST */}
      <div className="rank-list">
        {rankings.slice(3).map((c, idx) => (
          <div key={c.id} className="rank-row">
            <span className="rank">{idx + 4}</span>
            <span className="name">{c.stage_name}</span>
            <span className="score">{c.live_score} Vote</span>
          </div>
        ))}
      </div>
    </div>
  );
}
