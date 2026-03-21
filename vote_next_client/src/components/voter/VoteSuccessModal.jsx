import React from "react";

export default function VoteSuccessModal({ open, onClose, onViewResult }) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>Vote Submitted</h3>
        <div className="modal__desc">+ 1 vote</div>

        <div className="modal__actions">
          <button className="btn-primary" onClick={onViewResult}>
            View Results
          </button>

          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
