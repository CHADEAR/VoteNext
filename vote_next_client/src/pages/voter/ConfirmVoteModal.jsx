import React from "react";
import "./VotePublicPage.css";

const fallbackImg =
  "https://via.placeholder.com/300x200.png?text=No+Image";

export default function ConfirmVoteModal({
  contestant,
  onConfirm,
  onClose,
}) {
  if (!contestant) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal__close" onClick={onClose}>
          ×
        </button>
        <div className="modal__image">
          <img
            src={contestant.image_url || fallbackImg}
            alt={contestant.stage_name}
          />
        </div>
        <h3>{contestant.stage_name}</h3>
        {contestant.description && (
          <p className="modal__desc">{contestant.description}</p>
        )}
        <div className="modal__actions">
          <button className="btn-primary" onClick={onConfirm}>
            Vote Now
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

