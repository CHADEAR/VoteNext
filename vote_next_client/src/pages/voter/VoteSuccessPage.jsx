// src/pages/voter/VoteSuccessPage.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';

const VoteSuccessPage = () => {
  const { public_slug } = useParams();

  return (
    <div className="vote-success-container">
      <Navbar />
      
      <main className="vote-success-content">
        <div className="success-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="#4CAF50"/>
          </svg>
        </div>
        
        <h1>Thank You for Voting!</h1>
        <p>Your vote has been successfully recorded.</p>
        
        <div className="vote-details">
          <p>Vote ID: {public_slug}</p>
          <p>Date: {new Date().toLocaleDateString()}</p>
        </div>
        
        <button 
          className="back-to-home-button"
          onClick={() => window.location.href = '/'}
        >
          Back to Home
        </button>
      </main>
    </div>
  );
};

export default VoteSuccessPage;
