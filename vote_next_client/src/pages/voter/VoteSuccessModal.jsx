import React from "react";
import "./VotePublicPage.css";

const fallbackImg =
  "https://via.placeholder.com/300x200.png?text=No+Image";

export default function VoteSuccessModal({ contestant, onClose }) {
  if (!contestant) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal__close" onClick={onClose}>
          ×
        </button>
        <h3>Voting Successful</h3>
        <div className="modal__image">
          <img
            src={contestant.image_url || fallbackImg}
            alt={contestant.stage_name}
          />
        </div>
        <div className="modal__desc">+1 Vote</div>
        <div className="modal__actions">
          <button className="btn-primary" onClick={onClose}>
            View All Results
          </button>
        </div>
      </div>
    </div>
  );
}

