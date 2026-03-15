// src/components/admin/preview/PreviewContestantGrid.jsx
import React, { useState } from "react";

export default function PreviewContestantGrid({ contestants = [] }) {
  const [imageErrors, setImageErrors] = useState({});

  const handleImageError = (contestantId) => {
    setImageErrors((prev) => ({
      ...prev,
      [contestantId]: true,
    }));
  };

  return (
    <div className="preview-contestant-grid">
      {contestants.map((c, i) => {
        const imgSrc =
          c.image_url ||
          c.imageUrl ||
          c.photo_url ||
          c.photoUrl ||
          c.contestant?.image_url ||
          c.contestant?.imageUrl ||
          "";

        return (
          <div className="preview-contestant-card" key={c.id || i}>
            <div className="preview-img">
              {imgSrc && !imageErrors[c.id || i] ? (
                <img
                  src={imgSrc}
                  alt={c.stage_name || c.name || "contestant"}
                  onError={() => handleImageError(c.id || i)}
                />
              ) : (
                <div className="preview-img-fallback">
                  {(c.stage_name || c.name || "?").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="preview-name">
              {c.stage_name || c.name || "No Name"}
            </div>

            <button className="preview-vote-btn">โหวต</button>
          </div>
        );
      })}
    </div>
  );
}