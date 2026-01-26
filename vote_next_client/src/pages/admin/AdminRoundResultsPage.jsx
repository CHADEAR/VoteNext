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
    <div style={{ minHeight: "100vh", background:"#F7F4EF", padding:"24px", fontFamily:"sans-serif" }}>
      <h2 style={{ fontSize:"20px", fontWeight:600 }}>{round?.show_title || 'Loading...'}</h2>
      <div style={{ opacity:0.7, marginTop:4 }}>
        {round?.round_name || 'Loading...'} — {round?.status?.toUpperCase() || 'LOADING'} |
        {contestants.length} Contestants
      </div>

      {isLoading && <div style={{ marginTop: 16 }}>Loading...</div>}

      {!isLoading && (
        <>
          {!hasComputed ? (
            <button
              onClick={handleCompute}
              style={{
                marginTop:16,
                padding:"8px 16px",
                background:"#CDE7FF",
                borderRadius:8,
                border:"none",
                fontWeight:500,
                cursor:"pointer"
              }}
            >
              Compute Results
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              disabled={isLoading || isFinalizing}
              style={{
                marginTop:16,
                padding:"8px 16px",
                background: isFinalizing ? "#DDD" : "#B6F3C1",
                borderRadius:8,
                border:"none",
                fontWeight:500,
                cursor:(isLoading || isFinalizing) ? "not-allowed" : "pointer"
              }}
            >
              {isFinalRound ? 'Finalize Show' : 'Create Next Round'}
            </button>
          )}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{ 
          display: 'grid', 
          gap: '12px',
          marginBottom: '24px'
        }}>
          {hasComputed ? (
            // Show ranked results after compute
            contestants.map((c) => {
              const rankColors = {
                1: '#FFD700', // Gold
                2: '#C0C0C0', // Silver
                3: '#CD7F32'  // Bronze
              };
              
              return (
                <div key={c.id} style={{
                  background: '#FFF',
                  borderRadius: '8px',
                  border: `1px solid ${rankColors[c.rank] || '#E5E7EB'}`,
                  overflow: 'hidden',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: rankColors[c.rank] || (c.rank <= 7 ? '#F9FAFB' : '#FFFFFF'),
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: rankColors[c.rank] || (c.rank <= 7 ? '#3B82F6' : '#E5E7EB'),
                      color: c.rank <= 3 ? '#000' : (c.rank <= 7 ? '#FFF' : '#6B7280'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      fontWeight: 'bold',
                      fontSize: '16px'
                    }}>
                      {c.rank <= 3 ? ['🥇', '🥈', '🥉'][c.rank - 1] : c.rank}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '16px', 
                        fontWeight: '600',
                        color: c.rank <= 7 ? '#1F2937' : '#6B7280'
                      }}>
                        {c.name}
                      </div>
                      <div style={{ 
                        fontSize: '14px', 
                        color: c.rank <= 7 ? '#4B5563' : '#9CA3AF',
                        marginTop: '2px'
                      }}>
                        Total Score: <strong>{c.total_score ?? 0}</strong> points
                      </div>
                    </div>
                    {c.rank === 1 && (
                      <div style={{
                        background: 'rgba(255, 215, 0, 0.2)',
                        color: '#B45309',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        🏆 WINNER
                      </div>
                    )}
                  </div>
                  <div style={{ 
                    padding: '10px 16px',
                    background: '#F9FAFB',
                    fontSize: '14px',
                    color: '#4B5563',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span>👥 <strong>{c.online_votes ?? 0}</strong> votes</span>
                      <span>📡 <strong>{c.remote_votes ?? 0}</strong> remote</span>
                      <span>⭐ <strong>{c.judge_score ?? 0}</strong> judge</span>
                    </div>
                    {c.rank <= 7 && (
                      <div style={{
                        fontSize: '12px',
                        color: c.rank <= 3 ? '#10B981' : '#6B7280',
                        fontWeight: '500'
                      }}>
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
              <div key={c.id} style={{
                background: '#FFF',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>{c.name}</div>
                  <div style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                    Online: {c.online_votes || 0} votes
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
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
                      style={{
                        width: '80px',
                        padding: '6px 8px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        textAlign: 'right',
                        background: hasComputed ? '#F3F4F6' : '#FFFFFF'
                      }}
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
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.3)",
      display:"flex", justifyContent:"center", alignItems:"center"
    }}>
      <div style={{
        width:"700px", background:"#FFF", borderRadius:12,
        padding:24, maxHeight:"80vh", overflowY:"auto"
      }}>
        <h3 style={{ fontSize:18, fontWeight:600 }}>
          {isFinalRound ? 'Finalize Show' : 'Create Next Round'} (Advanced)
        </h3>

        <div style={{ marginTop:12 }}>
          Take Top:
          <input
            type="number"
            min={2}
            max={ranked.length}
            value={takeTop}
            onChange={e => setTakeTop(Number(e.target.value))}
            style={{ width:60, marginLeft:8, border:"1px solid #DDD", borderRadius:6, padding:"4px" }}
          />
        </div>

        <div style={{ marginTop:18, fontWeight:600 }}>Contestants</div>
        {ranked.map((c,i)=>{
          const rank=i+1;
          const isBase=i<takeTop;
          const isWildcard=wildcards.includes(c.id);
          const isRemove=removes.includes(c.id);
          return (
            <div key={c.id} style={{
              background:"#FAFAFA",
              padding:10,
              borderRadius:8,
              marginTop:6,
              border: rank<=3 ? "2px solid #FFD872" : "1px solid #E6E1D9"
            }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div style={{ display:"flex", gap:8, fontSize:14 }}>
                  {rank===1 && "🥇"}
                  {rank===2 && "🥈"}
                  {rank===3 && "🥉"}
                  {rank>3 && `#${rank}`}
                  <span>{c.name}</span>
                  <span style={{ opacity:0.7 }}>({c.final})</span>
                </div>

                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>toggleWildcard(c.id)}
                    style={{
                      padding:"2px 8px", borderRadius:6, border:"none",
                      background:isWildcard?"#E5D4FF":"#EDEDED", cursor:"pointer"
                    }}>
                    Wildcard
                  </button>
                  <button onClick={()=>toggleRemove(c.id)}
                    style={{
                      padding:"2px 8px", borderRadius:6, border:"none",
                      background:isRemove?"#FFB8A5":"#EDEDED", cursor:"pointer"
                    }}>
                    Remove
                  </button>
                </div>
              </div>

              {isBase && <div style={{ fontSize:12, opacity:0.7, marginTop:2 }}>Base Top {takeTop}</div>}
            </div>
          );
        })}

        <div style={{ marginTop:24 }}>
          <div style={{ fontWeight:600 }}>
            {isFinalRound ? 'Final Lineup:' : 'Next Round Participants:'}
          </div>
          <ul style={{ marginTop:6, paddingLeft:16 }}>
            {next.map(x => <li key={x.id}>{x.name} ({x.final} pts)</li>)}
          </ul>
        </div>

        {!valid && <div style={{ color:"#E55", marginTop:6 }}>Must have at least 2 contestants</div>}

        <div style={{ display:"flex", gap:12, marginTop:24 }}>
          <button onClick={onClose}
            style={{ padding:"6px 12px", borderRadius:6, border:"1px solid #DDD", background:"#FFF", cursor:"pointer" }}>
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => onSubmit({ takeTop, wildcards, removes, debut: next.map(x=>x.id) })}
            style={{
              background:valid?"#B6F3C1":"#DDD",
              padding:"6px 12px", borderRadius:6,
              border:"none", cursor:valid?"pointer":"default"
            }}
          >
            {isFinalRound ? 'Finalize Show' : 'Create Next Round'}
          </button>
        </div>
      </div>
    </div>
  );
}
