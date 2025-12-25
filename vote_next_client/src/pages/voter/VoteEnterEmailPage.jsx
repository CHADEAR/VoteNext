// src/pages/voter/VoteEnterEmailPage.jsx
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const EMAIL_KEY = "vote_next_email";

export default function VoteEnterEmailPage() {
  const { public_slug } = useParams();
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
    navigate(`/vote/${public_slug}`);
  };

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: "0 auto" }}>
      <h1>กรอก Email เพื่อโหวต</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 12, marginBottom: 12 }}
        />

        {error && <div style={{ color: "red" }}>{error}</div>}

        <button type="submit" style={{ width: "100%", padding: 12 }}>
          ไปหน้าโหวต
        </button>
      </form>
    </div>
  );
}
