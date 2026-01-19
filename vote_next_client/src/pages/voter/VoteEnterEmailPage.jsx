// src/pages/voter/VoteEnterEmailPage.jsx
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar';



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
      <Navbar />
      
      <main className="vote-email-content">
        <h1>กรอก Email เพื่อโหวต</h1>

        <form onSubmit={handleSubmit} className="email-form">
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="email-input"
          />

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-button">
            ไปหน้าโหวต
          </button>
        </form>
      </main>
    </div>
  );
}
