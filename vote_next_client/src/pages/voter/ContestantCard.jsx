// src/pages/voter/ContestantCard.jsx
import React from "react";
import "./VotePublicPage.css";

const fallbackImg =
  "https://via.placeholder.com/300x200.png?text=No+Image";

export default function ContestantCard({ contestant, onVote }) {
  return (
    <div className="contestant-card">
      <div className="contestant-card__image">
        <img
          src={contestant.image_url ? contestant.image_url : fallbackImg}
          alt={contestant.stage_name || "Contestant"}
        />
      </div>
      <div className="contestant-card__body">
        <div className="contestant-card__name">{contestant.stage_name}</div>
        <button className="btn-primary" onClick={() => onVote(contestant)}>
          Vote
        </button>
      </div>
    </div>
  );
}

