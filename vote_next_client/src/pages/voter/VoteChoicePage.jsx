// src/pages/voter/VoteChoicePage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';

const VoteChoicePage = () => {
  const { public_slug } = useParams();
  const navigate = useNavigate();
  const [selectedChoice, setSelectedChoice] = useState(null);

  // Mock data - replace with actual data fetching
  const voteOptions = [
    { id: 1, name: 'Option 1', image: null },
    { id: 2, name: 'Option 2', image: null },
    { id: 3, name: 'Option 3', image: null },
  ];

  const handleVote = () => {
    if (!selectedChoice) return;
    // Handle vote submission
    navigate(`/vote/${public_slug}/success`);
  };

  return (
    <div className="vote-choice-container">
      <Navbar />
      
      <main className="vote-choice-content">
        <h1>Select Your Choice</h1>
        
        <div className="vote-options">
          {voteOptions.map((option) => (
            <div 
              key={option.id} 
              className={`vote-option ${selectedChoice === option.id ? 'selected' : ''}`}
              onClick={() => setSelectedChoice(option.id)}
            >
              {option.image ? (
                <img src={option.image} alt={option.name} className="option-image" />
              ) : (
                <div className="option-placeholder">
                  {option.name}
                </div>
              )}
              <div className="option-name">{option.name}</div>
            </div>
          ))}
        </div>

        <button 
          className="submit-vote-button"
          disabled={!selectedChoice}
          onClick={handleVote}
        >
          Submit Vote
        </button>
      </main>
    </div>
  );
};

export default VoteChoicePage;
