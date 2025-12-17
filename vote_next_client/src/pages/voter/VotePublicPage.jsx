import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicVote } from "../../services/publicVote.service";
import ContestantCard from "./ContestantCard";
import ConfirmVoteModal from "./ConfirmVoteModal";
import VoteSuccessModal from "./VoteSuccessModal";
import "./VotePublicPage.css";

export default function VotePublicPage() {
  const { public_slug } = useParams();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedContestant, setSelectedContestant] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchPublicVote(public_slug);
        setPoll(data);
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถโหลดข้อมูลโพลได้");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [public_slug]);

  const contestants = useMemo(() => poll?.contestants || [], [poll]);

  const handleVoteClick = (c) => {
    setSelectedContestant(c);
    setShowConfirm(true);
  };

  const handleConfirmVote = () => {
    setShowConfirm(false);
    setShowSuccess(true);
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
  };

  return (
    <div className="vote-page">
      <header className="vote-header">
        <div className="vote-logo">VOTE NEXT</div>
        <div className="vote-search">
          <input placeholder="Search contestants (UI only)" />
        </div>
      </header>

      {loading && <div className="vote-status">กำลังโหลด...</div>}
      {error && <div className="vote-status error">{error}</div>}

      {poll && !loading && (
        <>
          <section className="poll-info">
            <h1>{poll.title}</h1>
            {poll.description && <p>{poll.description}</p>}
          </section>

          <section className="contestant-grid">
            {contestants.map((c) => (
              <ContestantCard
                key={c.id}
                contestant={c}
                onVote={handleVoteClick}
              />
            ))}
            {contestants.length === 0 && (
              <div className="vote-status">ยังไม่มีผู้เข้าแข่งขัน</div>
            )}
          </section>
        </>
      )}

      {showConfirm && selectedContestant && (
        <ConfirmVoteModal
          contestant={selectedContestant}
          onConfirm={handleConfirmVote}
          onClose={() => setShowConfirm(false)}
        />
      )}

      {showSuccess && selectedContestant && (
        <VoteSuccessModal
          contestant={selectedContestant}
          onClose={handleCloseSuccess}
        />
      )}
    </div>
  );
}

