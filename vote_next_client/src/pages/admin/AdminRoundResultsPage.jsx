// src/page/admin/AdminRoundResultsPage.jsx

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  computeRoundResults, 
  createNextRound, 
  finalizeShow, 
  getRound 
} from "../../api/rounds.api";
import { toast } from "react-toastify";
import "./AdminRoundResultsPage.css";

export default function AdminRoundResultsPage() {
  const { roundId } = useParams();
  const navigate = useNavigate();
  
  const [round, setRound] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [judgeScores, setJudgeScores] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Load round data
  useEffect(() => {
    const loadRound = async () => {
      try {
        setIsLoading(true);
        const response = await getRound(roundId);

        const data = response?.data?.data || response?.data || null;
        setRound(data);

        if (Array.isArray(data?.contestants)) {
          setContestants(data.contestants);
        } else {
          setContestants([]);
        }
      } catch (error) {
        console.error("Failed to load round:", error);
        toast.error("Failed to load round data");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRound();
  }, [roundId]);

  // Check if results have been computed (backend-driven)
  const hasComputed = Boolean(round?.results_computed) || contestants.some(c => c.rank > 0);

  const isFinalRound = round?.is_final || false;

  const rankedForModal = [...contestants]
    .sort((a, b) => (Number(b.total_score) || 0) - (Number(a.total_score) || 0));

  // Compute Scores and save to backend
  const handleCompute = async () => {
    try {
      setIsLoading(true);
      
      // Prepare judge scores for backend
      const scores = Object.entries(judgeScores).map(([contestantId, score]) => ({
        contestantId,
        score: Number(score) || 0
      }));

      // Call backend to compute results with judge scores
      const response = await computeRoundResults(roundId, scores);
      const data = response?.data?.data || response?.data;
      
      if (data && Array.isArray(data)) {
        setContestants(data);
      }
      
      toast.success("Results computed successfully!");
    } catch (error) {
      console.error("Failed to compute results:", error);
      toast.error(error.response?.data?.message || "Failed to compute results");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNextRound = async (data) => {
    try {
      setIsLoading(true);

      const response = await createNextRound(roundId, {
        mode: 'advanced',
        takeTop: data.takeTop,
        wildcards: data.wildcards,
        removes: data.removes,
        roundName: `Round ${parseInt(round.round_name.match(/\d+/)?.[0] || 0) + 1}`
      });

      const info = response?.data?.data || response?.data;
      navigate(`/`);
      toast.success("Next round created successfully");

    } catch (error) {
      console.error("Failed to create next round:", error);
      toast.error(error.response?.data?.message || "Failed to create next round");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeShow = async (data) => {
    try {
      setIsFinalizing(true);
      await finalizeShow(roundId, {
        debut: data.debut,
        target: data.takeTop
      });

      toast.success("Show finalized successfully!");
      const resp = await getRound(roundId);
      const info = resp?.data?.data || resp?.data;
      setRound(info);

    } catch (error) {
      console.error("Failed to finalize show:", error);
      toast.error(error.response?.data?.message || "Failed to finalize show");
    } finally {
      setIsFinalizing(false);
      setShowModal(false);
    }
  };

  return (
    <div className="round-results">
      <h2 className="round-results__title">{round?.show_title || 'Loading...'}</h2>
      <div className="round-results__meta">
        {round?.round_name || 'Loading...'} — {round?.status?.toUpperCase() || 'LOADING'} |
        {contestants.length} Contestants
      </div>

      {isLoading && <div className="round-results__loading">Loading...</div>}

      {!isLoading && (
        <>
          {!hasComputed ? (
            <button
              onClick={handleCompute}
              className="round-results__action round-results__action--compute"
            >
              Compute Results
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              disabled={isLoading || isFinalizing}
              className={`round-results__action ${
                isFinalizing ? "round-results__action--disabled" : "round-results__action--next"
              }`}
            >
              {isFinalRound ? 'Finalize Show' : 'Create Next Round'}
            </button>
          )}
        </>
      )}

      <div className="round-results__section">
        <div className="round-results__grid">
          {hasComputed ? (
            // Show ranked results after compute
            contestants.map((c) => {
              const rankColors = {
                1: '#FFD700', // Gold
                2: '#C0C0C0', // Silver
                3: '#CD7F32'  // Bronze
              };
              
              return (
                <div
                  key={c.id}
                  className="rank-card"
                  style={{ border: `1px solid ${rankColors[c.rank] || '#E5E7EB'}` }}
                >
                  <div
                    className="rank-card__header"
                    style={{
                      background: rankColors[c.rank] || (c.rank <= 7 ? '#F9FAFB' : '#FFFFFF')
                    }}
                  >
                    <div
                      className="rank-badge"
                      style={{
                        background: rankColors[c.rank] || (c.rank <= 7 ? '#3B82F6' : '#E5E7EB'),
                        color: c.rank <= 3 ? '#000' : (c.rank <= 7 ? '#FFF' : '#6B7280')
                      }}
                    >
                      {c.rank <= 3 ? ['🥇', '🥈', '🥉'][c.rank - 1] : c.rank}
                    </div>
                    <div className="rank-card__body">
                      <div
                        className="rank-card__name"
                        style={{ color: c.rank <= 7 ? '#1F2937' : '#6B7280' }}
                      >
                        {c.name}
                      </div>
                      <div
                        className="rank-card__score"
                        style={{ color: c.rank <= 7 ? '#4B5563' : '#9CA3AF' }}
                      >
                        Total Score: <strong>{c.total_score ?? 0}</strong> points
                      </div>
                    </div>
                    {c.rank === 1 && (
                      <div
                        className="rank-card__winner"
                        style={{
                          background: 'rgba(255, 215, 0, 0.2)',
                          color: '#B45309'
                        }}
                      >
                        🏆 WINNER
                      </div>
                    )}
                  </div>
                  <div className="rank-card__stats">
                    <div className="rank-card__statlist">
                      <span>👥 <strong>{c.online_votes ?? 0}</strong> votes</span>
                      <span>📡 <strong>{c.remote_votes ?? 0}</strong> remote</span>
                      <span>⭐ <strong>{c.judge_score ?? 0}</strong> judge</span>
                    </div>
                    {c.rank <= 7 && (
                      <div
                        className="rank-card__status"
                        style={{ color: c.rank <= 3 ? '#10B981' : '#6B7280' }}
                      >
                        {c.rank <= 3 ? 'Advances to next round' : 'Eliminated'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            // Show input form before compute
            contestants.map((c) => (
              <div key={c.id} className="entry-card">
                <div>
                  <div className="entry-card__name">{c.name}</div>
                  <div className="entry-card__online">
                    Online: {c.online_votes || 0} votes
                  </div>
                </div>
                <div className="entry-card__controls">
                  <div className="entry-card__judge">
                    <span style={{ marginRight: '8px' }}>Judge:</span>
                    <input
                      type="number"
                      placeholder="0"
                      value={judgeScores[c.id] || ""}
                      disabled={hasComputed}
                      onChange={e =>
                        setJudgeScores({
                          ...judgeScores,
                          [c.id]: Number(e.target.value) || 0
                        })
                      }
                      className="entry-card__input"
                      style={{ background: hasComputed ? '#F3F4F6' : '#FFFFFF' }}
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showModal && hasComputed && (
        <AdvancedModal
          ranked={rankedForModal.map(c => ({ ...c, final: c.total_score }))}
          onClose={() => setShowModal(false)}
          onSubmit={isFinalRound ? handleFinalizeShow : handleCreateNextRound}
          isFinalRound={isFinalRound}
        />
      )}
    </div>
  );
}

function AdvancedModal({ ranked, onClose, onSubmit, isFinalRound=false }) {
  const [takeTop, setTakeTop] = useState(3);
  const [wildcards, setWildcards] = useState([]);
  const [removes, setRemoves] = useState([]);

  const toggleWildcard = id => setWildcards(w => w.includes(id) ? w.filter(x=>x!==id) : [...w,id]);
  const toggleRemove = id => setRemoves(r => r.includes(id) ? r.filter(x=>x!==id) : [...r,id]);

  const base = ranked.slice(0, takeTop).map(x=>x.id);
  const plus = wildcards.filter(id => !base.includes(id));
  const minus = removes;
  const nextIds = base.concat(plus).filter(id => !minus.includes(id));
  const next = ranked.filter(x => nextIds.includes(x.id));
  const valid = next.length >= 2;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3 className="modal__title">
          {isFinalRound ? 'Finalize Show' : 'Create Next Round'} (Advanced)
        </h3>

        <div className="modal__field">
          Take Top:
          <input
            type="number"
            min={2}
            max={ranked.length}
            value={takeTop}
            onChange={e => setTakeTop(Number(e.target.value))}
            className="modal__input"
          />
        </div>

        <div className="modal__section-title">Contestants</div>
        {ranked.map((c,i)=>{
          const rank=i+1;
          const isBase=i<takeTop;
          const isWildcard=wildcards.includes(c.id);
          const isRemove=removes.includes(c.id);
          return (
            <div
              key={c.id}
              className="modal__item"
              style={{ border: rank<=3 ? "2px solid #FFD872" : "1px solid #E6E1D9" }}
            >
              <div className="modal__item-row">
                <div className="modal__item-info">
                  {rank===1 && "🥇"}
                  {rank===2 && "🥈"}
                  {rank===3 && "🥉"}
                  {rank>3 && `#${rank}`}
                  <span>{c.name}</span>
                  <span className="modal__item-score">({c.final})</span>
                </div>

                <div className="modal__item-actions">
                  <button
                    onClick={()=>toggleWildcard(c.id)}
                    className="modal__chip"
                    style={{ background:isWildcard?"#E5D4FF":"#EDEDED" }}
                  >
                    Wildcard
                  </button>
                  <button
                    onClick={()=>toggleRemove(c.id)}
                    className="modal__chip"
                    style={{ background:isRemove?"#FFB8A5":"#EDEDED" }}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {isBase && <div className="modal__hint">Base Top {takeTop}</div>}
            </div>
          );
        })}

        <div className="modal__summary">
          <div className="modal__section-title">
            {isFinalRound ? 'Final Lineup:' : 'Next Round Participants:'}
          </div>
          <ul className="modal__summary-list">
            {next.map(x => <li key={x.id}>{x.name} ({x.final} pts)</li>)}
          </ul>
        </div>

        {!valid && <div className="modal__error">Must have at least 2 contestants</div>}

        <div className="modal__footer">
          <button
            onClick={onClose}
            className="modal__btn modal__btn--secondary"
          >
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => onSubmit({ takeTop, wildcards, removes, debut: next.map(x=>x.id) })}
            className="modal__btn modal__btn--primary"
            style={{
              background:valid?"#B6F3C1":"#DDD",
              border: "none",
              cursor:valid?"pointer":"default"
            }}
          >
            {isFinalRound ? 'Finalize Show' : 'Create Next Round'}
          </button>
        </div>
      </div>
    </div>
  );
}
