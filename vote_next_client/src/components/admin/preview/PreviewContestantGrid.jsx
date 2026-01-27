import React, { useState } from "react";

export default function PreviewContestantGrid({ contestants = [] }) {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (contestantId) => {
    setImageErrors(prev => ({
      ...prev,
      [contestantId]: true
    }));
  };

  // Only show contestants that have actual information (stage_name or image_url)
  const validContestants = contestants.filter(c => 
    c.stage_name && c.stage_name.trim() !== ''
  );

  return (
    <div className="preview-contestant-grid">
      {validContestants.map((c, i) => (
        <div className="preview-contestant-card" key={c.id || i}>
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
                {/* No fallback content, just grey background */}
              </div>
            )}
          </div>
          <div className="preview-name">{c.stage_name || 'ชื่อ'}</div>
          <button className="preview-vote-btn">โหวต</button>
        </div>
      ))}
    </div>
  );
}
