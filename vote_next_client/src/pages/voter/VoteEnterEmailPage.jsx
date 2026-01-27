// src/pages/voter/VoteEnterEmailPage.jsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../../assets/Black_White_Modern_Bold_Design_Studio_Logo-removebg-preview.png';
import './VoteEnterEmailPage.css';



export default function VoteEnterEmailPage() {
  const { publicSlug } = useParams();
  const EMAIL_KEY = `vote_next_email_${publicSlug}`;
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!email || !email.includes("@")) {
      setError("กรุณากรอก email ให้ถูกต้อง");
      return;
    }

    localStorage.setItem(EMAIL_KEY, email);
    navigate(`/vote/${publicSlug}`);
  };

  return (
    <div className="vote-email-container">
      <main className="vote-email-content">
        <div className="logo-container">
          <img src={logo} alt="VOTE NEXT" className="vote-logo" />
        </div>
        
        <form onSubmit={handleSubmit} className="email-form">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="email-input"
          />

          {error && <div className="error-message">{error}</div>}
          <h5>Enter email for vote </h5>
          <button type="submit" className="submit-button">
            Vote now
          </button>
        </form>
      </main>
    </div>
  );
}
