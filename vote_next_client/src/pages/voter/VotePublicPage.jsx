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

  const EMAIL_KEY = "vote_next_email";
  const email = localStorage.getItem(EMAIL_KEY);

  useEffect(() => {
    // ต้องมี email ก่อน
    if (!email) {
      window.location.href = `/vote/${public_slug}/email`;
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        const data = await getPublicVote(public_slug);
        console.log("poll from api =", data);
        setPoll({
          ...data,
          id: data.round_id,
        });
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถโหลดข้อมูลโพลได้");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [public_slug, email]);

  const contestants = useMemo(
    () => poll?.contestants || [],
    [poll]
  );

  const isVotingOpen = poll?.status === "voting";

  const handleVoteClick = (contestant) => {
    if (!isVotingOpen || voting || showSuccess) return;
    if (!poll?.id) {
      setError("ไม่พบข้อมูลโพล");
      return;
    }

    setSelectedContestant(contestant);
    setShowConfirm(true);
  };

  const handleConfirmVote = async () => {
    if (!selectedContestant) return;
    if (!poll?.id) {
      setError("ไม่พบข้อมูลโพล");
      return;
    }
    if (!isVotingOpen) {
      setError("รอบนี้ยังไม่เปิดให้โหวต");
      return;
    }

    try {
      setVoting(true);
      await submitVote(poll.id, selectedContestant.id, email);
      setShowConfirm(false);
      setShowSuccess(true);
      setError("");
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

          {!isVotingOpen && (
            <div className="vote-status warning">
              {poll.status === "pending" && "ยังไม่เปิดให้โหวต"}
              {poll.status === "closed" && "ปิดการโหวตแล้ว"}
            </div>
          )}

          <section className="contestant-grid">
            {contestants.map((c) => (
              <ContestantCard
                key={c.id}
                contestant={c}
                onVote={handleVoteClick}
                disabled={!isVotingOpen || voting || showSuccess}
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
        onClose={() => {
          localStorage.removeItem(EMAIL_KEY);
          setShowSuccess(false);
        }}
      />
    </div>
  );
}
