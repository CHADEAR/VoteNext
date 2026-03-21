// src/pages/voter/VoteEnterEmailPage.jsx
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import logo from "../../assets/Black_White_Modern_Bold_Design_Studio_Logo-removebg-preview.png";
import { verifyEmail, checkIfVoted } from "../../services/public-vote.service";
import "./VoteEnterEmailPage.css";

const VOTE_TOKEN_KEY = (slug) => `vote_next_token_${slug}`;
export { VOTE_TOKEN_KEY };

export default function VoteEnterEmailPage() {
  const { publicSlug } = useParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.trim()) {
      setError("Please enter your email");
      return;
    }
    setError("");
    setLoading(true);
    const trimmedEmail = email.trim();
    try {
      const hasVoted = await checkIfVoted(publicSlug, { email: trimmedEmail });
      if (hasVoted) {
        navigate(`/vote/${publicSlug}/rank`);
        return;
      }
      const voteToken = await verifyEmail(publicSlug, trimmedEmail);
      sessionStorage.setItem(VOTE_TOKEN_KEY(publicSlug), voteToken);
      navigate(`/vote/${publicSlug}`);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Email verification failed. Please try again.";
      if (msg.includes("เคยโหวต") || msg.includes("already voted")) {
        navigate(`/vote/${publicSlug}/rank`);
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
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
          <h5>Enter your email to vote</h5>
          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? "Checking..." : "Vote Now"}
          </button>
        </form>
      </main>
    </div>
  );
}
