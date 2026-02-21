import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPublicVote, submitVote, checkIfVoted } from "../../services/public-vote.service";
import { io } from "socket.io-client";
import ContestantCard from "../../components/voter/ContestantCard";
import ConfirmVoteModal from "../../components/voter/ConfirmVoteModal";
import VoteSuccessModal from "../../components/voter/VoteSuccessModal";
import "./VotePublicPage.css";

/**
 * Countdown formatter (short HH:MM:SS)
 */
function Countdown({ start, now, onFinish }) {
  const diff = Math.max(0, Math.floor((start - now) / 1000));
  const h = String(Math.floor(diff / 3600)).padStart(1, "0");
  const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
  const s = String(diff % 60).padStart(2, "0");

  useEffect(() => {
    if (diff <= 0 && onFinish) onFinish();
  }, [diff, onFinish]);

  return (
    <div className="vote-status warning">
      เริ่มใน {h}h {m}m {s}s
    </div>
  );
}

export default function VotePublicPage() {
  const { publicSlug } = useParams();
  const navigate = useNavigate();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");
  const [checkingVote, setCheckingVote] = useState(true);

  const [selectedContestant, setSelectedContestant] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const EMAIL_KEY = `vote_next_email_${publicSlug}`;
  const email = localStorage.getItem(EMAIL_KEY);

  useEffect(() => {
    if (!email) {
      window.location.href = `/vote/${publicSlug}/email`;
      return;
    }

    const checkVoteStatus = async () => {
      try {
        setCheckingVote(true);
        const hasVoted = await checkIfVoted(publicSlug, email);
        
        if (hasVoted) {
          // User already voted, redirect to rank page
          navigate(`/vote/${publicSlug}/rank`);
          return;
        }
        
        // Load poll only if user hasn't voted
        await load();
      } catch (err) {
        console.error("Error checking vote status:", err);
        // Continue to load poll even if check fails
        await load();
      } finally {
        setCheckingVote(false);
      }
    };

    const load = async () => {
      try {
        setLoading(true);
        const data = await getPublicVote(publicSlug);
        setPoll(normalizePoll(data));
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถโหลดข้อมูลโพลได้");
      } finally {
        setLoading(false);
      }
    };

    checkVoteStatus();
    
    // Setup Socket.IO for realtime updates
    console.log('🔌 Initializing Socket.IO connection in VotePublicPage...');
    
    // Use different URLs for development vs production
    const socketUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:4000'
      : 'https://votenext.onrender.com/api'; // Replace with your backend URL
    
    const socket = io(socketUrl, {
      transports: ['polling', 'websocket'], // Try polling first, then websocket
      timeout: 10000,
      forceNew: false, // Don't force new connection to avoid conflicts
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    socket.on('vote_update', (data) => {
      console.log('📨 Vote update received in VotePublicPage:', data);
      // Refresh poll data to get updated contestant vote counts
      load();
    });
    
    socket.on('connect', () => {
      console.log('🔌 Connected to realtime voting (VotePublicPage)');
    });
    
    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error (VotePublicPage):', error);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from realtime voting (VotePublicPage):', reason);
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Reconnected in VotePublicPage, attempt:', attemptNumber);
    });
    
    return () => {
      console.log('🔌 Cleaning up Socket.IO connection in VotePublicPage...');
      socket.disconnect();
    };
  }, [publicSlug, email]);

  // ========= POLL NORMALIZER ========= //
  function normalizePoll(raw) {
    const now = raw.server_now ? new Date(raw.server_now) : new Date();
    const start = raw.start_time ? new Date(raw.start_time) : null;
    const end = raw.end_time ? new Date(raw.end_time) : null;

    let computedStatus = raw.status;
    let startInFuture = false;

    if (raw.counter_type === "auto" && start && end) {
      if (now < start) {
        computedStatus = "pending";
        startInFuture = true;
      } else if (now >= start && now < end) {
        computedStatus = "voting";
      } else if (now >= end) {
        computedStatus = "closed";
      }
    }

    return {
      ...raw,
      id: raw.id || raw.round_id, // safety
      computedStatus,
      startInFuture,
      now,
      start,
      end,
      isAuto: raw.counter_type === "auto",
      isManual: raw.counter_type === "manual",
    };
  }

  const contestants = useMemo(
    () => poll?.contestants || [],
    [poll]
  );

  const isVotingOpen = poll?.computedStatus === "voting";

  // ========= EVENT HANDLERS ========= //
  function handleVoteClick(contestant) {
    if (!isVotingOpen || voting || showSuccess) return;
    setSelectedContestant(contestant);
    setShowConfirm(true);
  }

  async function handleConfirmVote() {
    if (!selectedContestant || !poll?.id) return;
    if (!isVotingOpen) return;

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
  }

  // ========= COUNTDOWN FINISH ACTION ========= //
  const handleCountdownFinish = () => {
    // reload → refresh state → enter voting
    window.location.reload();
  };

  // ========= CLOSED ACTION ========= //
  useEffect(() => {
    if (poll?.computedStatus === "closed") {
      navigate(`/vote/${publicSlug}/rank`);
    }
  }, [poll?.computedStatus, navigate, publicSlug]);

  return (
    <div className="vote-page">

      {checkingVote && <div className="vote-status">กำลังตรวจสอบสถานะการโหวต...</div>}
      {loading && !checkingVote && <div className="vote-status">กำลังโหลด...</div>}
      {error && <div className="vote-status error">{error}</div>}

      {/* MAIN */}
      {poll && !loading && (
        <>
          <section className="poll-info">
            <h1>{poll.title}</h1>
            {poll.description && <p>{poll.description}</p>}
          </section>

          {/* STATUS DISPLAY */}
          {!isVotingOpen && (
            <>
              {poll.computedStatus === "pending" && poll.isManual && (
                <div className="vote-status warning">Coming soon</div>
              )}

              {poll.computedStatus === "pending" && poll.isAuto && poll.startInFuture && (
                <Countdown
                  start={poll.start}
                  now={poll.now}
                  onFinish={handleCountdownFinish}
                />
              )}
            </>
          )}

          {/* GRID */}
          <section className="contestant-grid">
            {contestants.map((c) => (
              <ContestantCard
                key={c.id}
                contestant={c}
                disabled={!isVotingOpen || voting || showSuccess}
                onVote={handleVoteClick}
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
        onViewResult={() => {
          navigate(`/vote/${publicSlug}/rank`);
        }}
      />
    </div>
  );
}
