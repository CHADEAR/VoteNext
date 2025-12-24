// src/pages/voter/VotePublicPage.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { getPublicVote, submitVote } from "../../services/public-vote.service";
import ContestantCard from "../../components/voter/ContestantCard";
import ConfirmVoteModal from "../../components/voter/ConfirmVoteModal";
import VoteSuccessModal from "../../components/voter/VoteSuccessModal";
import "./VotePublicPage.css";

export default function VotePublicPage() {
  const { public_slug } = useParams();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");

  const [selectedContestant, setSelectedContestant] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getPublicVote(public_slug);
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

  const handleVoteClick = (contestant) => {
    setSelectedContestant(contestant);
    setShowConfirm(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedContestant) return;
    try {
      setVoting(true);
      await submitVote(poll.id, selectedContestant.id);
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      setError("โหวตไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setVoting(false);
    }
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
                disabled={voting || showSuccess}
              />
            ))}

            {contestants.length === 0 && (
              <div className="vote-status">ยังไม่มีผู้เข้าแข่งขัน</div>
            )}
          </section>
        </>
      )}

      <ConfirmVoteModal
        open={showConfirm}
        contestant={selectedContestant}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirmVote}
        loading={voting}
      />

      <VoteSuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}
