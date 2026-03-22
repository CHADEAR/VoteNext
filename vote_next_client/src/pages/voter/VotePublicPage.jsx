import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPublicVote, submitVote, checkIfVoted } from "../../services/public-vote.service";
import { VOTE_TOKEN_KEY } from "./VoteEnterEmailPage";
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
      Starts in {h}h {m}m {s}s
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
  /** โหวตสำเร็จใน session นี้ — อย่า redirect ไปหน้า email แม้ token จะถูกลบแล้ว */
  const [hasVotedThisSession, setHasVotedThisSession] = useState(false);

  const voteToken = sessionStorage.getItem(VOTE_TOKEN_KEY(publicSlug));

  useEffect(() => {
    if (!voteToken && !hasVotedThisSession) {
      window.location.href = `/vote/${publicSlug}/email`;
      return;
    }
    if (hasVotedThisSession) return;

    const checkVoteStatus = async () => {
      try {
        setCheckingVote(true);
        const hasVoted = await checkIfVoted(publicSlug, { voteToken });

        if (hasVoted) {
          navigate(`/vote/${publicSlug}/rank`);
          return;
        }

        await load();
      } catch (err) {
        console.error("Error checking vote status:", err);
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
        setError("Unable to load poll data");
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
      : 'https://votenext.onrender.com'; // Connect to base server URL for Socket.IO
    
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
  }, [publicSlug, voteToken, hasVotedThisSession]);

  // ========= POLL NORMALIZER ========= //
  function normalizePoll(raw) {
    const now = raw.server_now ? new Date(raw.server_now) : new Date();
    const start = raw.start_time ? new Date(raw.start_time) : null;
    const end = raw.end_time ? new Date(raw.end_time) : null;

    let computedStatus = raw.status;
    let startInFuture = false;

    if (raw.counter_type === "auto" && start && end) {
      if (raw.status === "closed" || now >= end) {
        computedStatus = "closed";
      } else if (raw.status === "pending" && now < start) {
        computedStatus = "pending";
        startInFuture = true;
      } else {
        computedStatus = "voting";
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
    if (!selectedContestant || !poll?.id || !voteToken) return;
    if (!isVotingOpen) return;

    try {
      setVoting(true);
      await submitVote(selectedContestant.id, voteToken);
      setShowConfirm(false);
      setShowSuccess(true);
      setError("");
      setHasVotedThisSession(true);
      sessionStorage.removeItem(VOTE_TOKEN_KEY(publicSlug));
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || "Vote submission failed. Please try again.");
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

      {checkingVote && <div className="vote-status">Checking vote status...</div>}
      {loading && !checkingVote && <div className="vote-status">Loading...</div>}
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
              <div className="vote-status">No contestants available yet</div>
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
        onViewResult={() => {
          sessionStorage.removeItem(VOTE_TOKEN_KEY(publicSlug));
          navigate(`/vote/${publicSlug}/rank`);
        }}
      />
    </div>
  );
}
