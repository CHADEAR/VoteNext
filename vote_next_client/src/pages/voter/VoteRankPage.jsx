// src/pages/voter/VoteRankPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getLiveRankBySlug } from "../../api/rank.api";
import "./VoteRankPage.css";

export default function VoteRankPage() {
  const { publicSlug } = useParams();
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState([]);

  const fetchRank = async () => {
    try {
      const res = await getLiveRankBySlug(publicSlug);
      let data = res?.data?.data || [];

      // Sort by backend rank (safety)
      data = data.sort((a, b) => (a.rank || 999) - (b.rank || 999));
      setRankings(data);
    } catch (err) {
      console.error("Failed to load rank", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRank();
    const timer = setInterval(fetchRank, 3000);
    return () => clearInterval(timer);
  }, [publicSlug]);

  if (loading) return <div className="rank-loading">Loading...</div>;

  const top3 = rankings.filter((r) => r.rank <= 3);
  const rest = rankings.filter((r) => r.rank > 3);
  // Podium order (2 | 1 | 3)
  const podiumOrder = [
    top3.find(r => r.rank === 2),
    top3.find(r => r.rank === 1),
    top3.find(r => r.rank === 3),
  ].filter(Boolean);


  const isFinal = rankings.some((r) => r.total_score != null);
  const scoreLabel = (r) =>
    isFinal
      ? `${Number(r.total_score || 0)} Score`
      : `${Number(r.live_score || 0)} Vote`;

  return (
    <div className="rank-page">
      <div className="rank-logo">VOTE NEXT</div>

{/* Podium */}
      <div className="rank-podium">
        {podiumOrder.map((c) => (
          <div key={c.id} className={`podium-item podium-r${c.rank}`}>
            <div className="podium-rank-badge">
              {c.rank === 1 ? "1" : c.rank}
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
        {rest.map((c) => (
          <div key={c.id} className="rank-row">
            <span className="rank-index">{c.rank}</span>

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
