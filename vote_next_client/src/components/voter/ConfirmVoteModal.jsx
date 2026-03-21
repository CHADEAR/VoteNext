import React from "react";

export default function ConfirmVoteModal({
  open,
  contestant,
  onClose,
  onConfirm,
  loading,
}) {
  if (!open || !contestant) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="modal__close" onClick={onClose}>×</button>

        <div className="modal__image">
          <img
            src={contestant.image_url}
            alt={contestant.stage_name}
          />
        </div>

        <h3>Confirm Vote</h3>
        <div className="modal__desc">{contestant.stage_name}</div>

        <div className="modal__actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Submitting vote..." : "Vote Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
