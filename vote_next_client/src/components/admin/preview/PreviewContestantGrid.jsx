import React from "react";

export default function PreviewContestantGrid({ contestants = [] }) {
  return (
    <div className="preview-contestant-grid">
      {contestants.map((c, i) => (
        <div className="preview-contestant-card" key={i}>
          <div className="preview-img">
            {c.image_url ? (
              <img src={c.image_url} alt={c.stage_name} />
            ) : (
              "img"
            )}
          </div>
          <div className="preview-name">{c.stage_name}</div>
          <button className="preview-vote-btn">โหวต</button>
        </div>
      ))}
    </div>
  );
}
