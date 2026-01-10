import React, { useState, useMemo } from "react";

const mockContestants = [
  { id: "c1", name: "Arin",   online: 1480, remote: 960, judge: 8.4 },
  { id: "c2", name: "Belle",  online: 1320, remote: 880, judge: 7.8 },
  { id: "c3", name: "Chanon", online: 1180, remote: 790, judge: 7.1 },
  { id: "c4", name: "Dew",    online: 1120, remote: 760, judge: 6.8 },
  { id: "c5", name: "Faye",   online: 940,  remote: 680, judge: 6.1 },
  { id: "c6", name: "Gun",    online: 760,  remote: 580, judge: 5.9 },
  { id: "c7", name: "Mew",    online: 700,  remote: 540, judge: 5.5 },
  { id: "c8", name: "Nan",    online: 680,  remote: 520, judge: 5.4 },
];

export default function AdminRoundResultsPage() {
  const [data, setData] = useState(mockContestants);
  const [computed, setComputed] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const maxOnline = Math.max(...data.map(x => x.online));
  const maxRemote = Math.max(...data.map(x => x.remote));

  const scored = useMemo(() => {
    return data.map(x => {
      const onlinePct = (x.online / maxOnline) * 10;
      const remotePct = (x.remote / maxRemote) * 10;
      const final = (x.judge * 0.4) + (remotePct * 0.3) + (onlinePct * 0.3);
      return { ...x, final: Number(final.toFixed(2)) };
    }).sort((a,b) => b.final - a.final);
  }, [data, maxOnline, maxRemote]);

  const handleJudgeChange = (id, v) => {
    if (computed) return;
    setData(d => d.map(x => x.id === id ? { ...x, judge: Number(v) } : x));
  };

  return (
    <div style={{ minHeight: "100vh", background:"#F7F4EF", padding:"24px", fontFamily:"sans-serif" }}>
      <h2 style={{ fontSize:"20px", fontWeight:600 }}>The Ultimate Talent Show</h2>
      <div style={{ opacity:0.7, marginTop:4 }}>Quarter Final — CLOSED | 8 Contestants</div>

      {!computed && (
        <button
          onClick={()=>setComputed(true)}
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
      )}

      {computed && (
        <button
          onClick={()=>setShowModal(true)}
          style={{
            marginTop:16,
            padding:"8px 16px",
            background:"#B6F3C1",
            borderRadius:8,
            border:"none",
            fontWeight:500,
            cursor:"pointer"
          }}
        >
          Create Next Round
        </button>
      )}

      <div style={{ marginTop:24 }}>
        {scored.map((c, i) => {
          const rank = i + 1;
          return (
            <div
              key={c.id}
              style={{
                background:"#FFF",
                borderRadius:12,
                padding:"16px",
                marginBottom:"12px",
                border: rank <= 3 ? "2px solid #FFD872" : "1px solid #E6E1D9",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:"16px", fontWeight:600, display:"flex", gap:"6px" }}>
                  {rank === 1 && "🥇"}
                  {rank === 2 && "🥈"}
                  {rank === 3 && "🥉"}
                  {rank > 3 && `#${rank}`}
                  <span>{c.name}</span>
                </div>
                <div style={{ fontSize:"16px", fontWeight:600 }}>
                  {c.final.toFixed(2)}
                </div>
              </div>

              <div style={{ fontSize:"13px", opacity:0.7, marginTop:6, display:"flex", gap:"16px" }}>
                <div>Online: {c.online}</div>
                <div>Remote: {c.remote}</div>
              </div>

              <div style={{ marginTop:8, fontSize:"14px" }}>
                Judges:{" "}
                {!computed ? (
                  <input
                    type="number"
                    step="0.1"
                    value={c.judge}
                    onChange={e=>handleJudgeChange(c.id, e.target.value)}
                    style={{
                      width:60,
                      padding:"4px 6px",
                      borderRadius:6,
                      border:"1px solid #E0DDD7",
                      background:"#FAFAFA"
                    }}
                  />
                ) : (
                  <span style={{ fontWeight:500 }}>{c.judge}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <AdvancedModal ranked={scored} onClose={()=>setShowModal(false)} />
      )}
    </div>
  );
}



function AdvancedModal({ ranked, onClose }) {
  const [takeTop, setTakeTop] = useState(3);
  const [wildcards, setWildcards] = useState([]);
  const [removes, setRemoves] = useState([]);

  const toggleWildcard = id => {
    setWildcards(w => w.includes(id) ? w.filter(x=>x!==id) : [...w, id]);
  };

  const toggleRemove = id => {
    setRemoves(r => r.includes(id) ? r.filter(x=>x!==id) : [...r, id]);
  };

  const base = ranked.slice(0, takeTop).map(x=>x.id);
  const plus = wildcards.filter(id=>!base.includes(id));
  const minus = removes;

  const nextIds = base.concat(plus).filter(id=>!minus.includes(id));
  const next = ranked.filter(x=>nextIds.includes(x.id));
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
        <h3 style={{ fontSize:"18px", fontWeight:600 }}>Create Next Round (Advanced)</h3>

        <div style={{ marginTop:12 }}>
          Take Top:
          <input
            type="number"
            min={2}
            max={ranked.length}
            value={takeTop}
            onChange={e=>setTakeTop(Number(e.target.value))}
            style={{
              width:60, marginLeft:8,
              border:"1px solid #DDD", borderRadius:6, padding:"4px"
            }}
          />
        </div>

        <div style={{ marginTop:18, fontWeight:600 }}>Contestants</div>
        {ranked.map((c,i)=>{
          const rank = i + 1;
          const isBase = i < takeTop;
          const isWildcard = wildcards.includes(c.id);
          const isRemove = removes.includes(c.id);
          return (
            <div key={c.id} style={{
              background:"#FAFAFA",
              padding:10,
              borderRadius:8,
              marginTop:6,
              border: rank <= 3 ? "2px solid #FFD872" : "1px solid #E6E1D9"
            }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <div style={{ display:"flex", gap:"8px", fontSize:"14px" }}>
                  {rank===1 && "🥇"}
                  {rank===2 && "🥈"}
                  {rank===3 && "🥉"}
                  {rank>3 && `#${rank}`}
                  <span>{c.name}</span>
                  <span style={{ opacity:0.7 }}>({c.final})</span>
                </div>

                <div style={{ display:"flex", gap:"6px" }}>
                  <button
                    onClick={()=>toggleWildcard(c.id)}
                    style={{
                      padding:"2px 8px",
                      borderRadius:6,
                      border:"none",
                      background: isWildcard ? "#E5D4FF" : "#EDEDED",
                      cursor:"pointer"
                    }}
                  >
                    Wildcard
                  </button>
                  <button
                    onClick={()=>toggleRemove(c.id)}
                    style={{
                      padding:"2px 8px",
                      borderRadius:6,
                      border:"none",
                      background: isRemove ? "#FFB8A5" : "#EDEDED",
                      cursor:"pointer"
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {isBase && (
                <div style={{ fontSize:"12px", opacity:0.7, marginTop:2 }}>
                  Base Top {takeTop}
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginTop:24 }}>
          <div style={{ fontWeight:600 }}>Next Round Participants:</div>
          <ul style={{ marginTop:6, paddingLeft:16 }}>
            {next.map(x=>(
              <li key={x.id}>
                {x.name} ({x.final})
              </li>
            ))}
          </ul>
        </div>

        {!valid && (
          <div style={{ color:"#E55", marginTop:6 }}>ต้องมีผู้เข้าแข่งขันอย่างน้อย 2 คน</div>
        )}

        <div style={{ display:"flex", gap:12, marginTop:24 }}>
          <button onClick={onClose}>Cancel</button>
          <button
            disabled={!valid}
            style={{
              background: valid ? "#B6F3C1" : "#DDD",
              padding:"6px 12px",
              borderRadius:6,
              border:"none",
              cursor: valid ? "pointer" : "default"
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
