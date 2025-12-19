import React from "react";

export default function ContestantCard({ contestant, onVote, disabled }) {
  return (
    <div className="contestant-card">
      <div className="contestant-card__image">
        <img
          src={contestant.image_url}
          alt={contestant.stage_name}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/default-contestant.jpg";
          }}
        />
      </div>

      <div className="contestant-card__body">
        <div className="contestant-card__name">
          {contestant.stage_name}
        </div>

        <button
          className="btn-primary"
          disabled={disabled}
          onClick={() => onVote(contestant)}
        >
          โหวต
        </button>
      </div>
    </div>
  );
}
