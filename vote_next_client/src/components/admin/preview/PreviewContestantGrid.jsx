import React, { useState } from "react";

export default function PreviewContestantGrid({ contestants = [] }) {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (contestantId) => {
    setImageErrors(prev => ({
      ...prev,
      [contestantId]: true
    }));
  };

  return (
    <div className="preview-contestant-grid">
      {contestants.map((c, i) => (
        <div className="preview-contestant-card" key={i}>
          <div className="preview-img">
            {c.image_url && !imageErrors[c.id] ? (
              <img 
                src={c.image_url} 
                alt={c.stage_name} 
                onError={() => handleImageError(c.id)}
                loading="lazy"
              />
            ) : (
              <div className="preview-img-fallback">
                {c.stage_name ? c.stage_name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div className="preview-name">{c.stage_name || 'No Name'}</div>
          <button className="preview-vote-btn">โหวต</button>
        </div>
      ))}
    </div>
  );
}
