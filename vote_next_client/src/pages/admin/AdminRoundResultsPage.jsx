import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiMinus,
  FiPlus,
  FiRefreshCw,
  FiWifi,
} from "react-icons/fi";
import { FaMedal, FaStar } from "react-icons/fa";
import { MdOutlineSettingsRemote } from "react-icons/md";
import {
  computeRoundResults,
  createNextRound,
  finalizeShow,
  getRound,
} from "../../api/rounds.api";
import Navbar from "../../components/layout/Navbar";
import { clearAdminSession } from "../../services/auth.service";
import { toast } from "react-toastify";
import "./AdminRoundResultsPage.css";

const STATUS_META = {
  pending: {
    label: "Pending",
    description: "Not started yet",
  },
  voting: {
    label: "Voting",
    description: "Voting is in progress",
  },
  closed: {
    label: "Closed",
    description: "Voting has ended",
  },
  end: {
    label: "Closed",
    description: "Voting has ended",
  },
};

const formatNumber = (value) => Number(value || 0).toLocaleString("en-US");

const buildJudgeScoreMap = (contestants, defaultValue = 0) =>
  contestants.reduce((scores, contestant) => {
    scores[contestant.id] = defaultValue;
    return scores;
  }, {});

const buildInitialJudgeScoreMap = (contestants) =>
  contestants.reduce((scores, contestant) => {
    scores[contestant.id] = Number(contestant.judge_score) || 0;
    return scores;
  }, {});

const getContestantName = (contestant) =>
  contestant?.name || contestant?.stage_name || contestant?.label || "Contestant";

const getRankLabel = (rank, fallbackIndex) => {
  const safeRank = Number(rank) || fallbackIndex + 1;

  if (safeRank === 1) return "#1";
  if (safeRank === 2) return "#2";
  if (safeRank === 3) return "#3";
  return `#${safeRank}`;
};

const getRankTone = (rank, fallbackIndex) => {
  const safeRank = Number(rank) || fallbackIndex + 1;

  if (safeRank === 1) return "gold";
  if (safeRank === 2) return "silver";
  if (safeRank === 3) return "bronze";
  return "default";
};

const getCardTone = (rank, fallbackIndex) => {
  const safeRank = Number(rank) || fallbackIndex + 1;

  if (safeRank === 1) return "yellow";
  if (safeRank === 2) return "blue";
  if (safeRank === 3) return "green";
  return "gray";
};

const getRankMedalLabel = (rank, fallbackIndex) => {
  const safeRank = Number(rank) || fallbackIndex + 1;

  if (safeRank === 1) return "1st place";
  if (safeRank === 2) return "2nd place";
  if (safeRank === 3) return "3rd place";
  return `Rank ${safeRank}`;
};

export default function AdminRoundResultsPage() {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const normalizedRoundId = String(roundId || "").trim();

  const [round, setRound] = useState(null);
  const [contestants, setContestants] = useState([]);
  const [judgeScores, setJudgeScores] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isEditingScores, setIsEditingScores] = useState(false);

  const loadRound = async () => {
    if (!normalizedRoundId || normalizedRoundId === "undefined" || normalizedRoundId === "null") {
      toast.error("Invalid round ID");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await getRound(normalizedRoundId);
      const data = response?.data?.data || response?.data || null;
      const nextContestants = Array.isArray(data?.contestants) ? data.contestants : [];

      setRound(data);
      setContestants(nextContestants);
      setJudgeScores(buildInitialJudgeScoreMap(nextContestants));
      setIsEditingScores(false);
    } catch (error) {
      console.error("Failed to load round:", error);
      toast.error("Failed to load round data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRound();
  }, [normalizedRoundId]);

  const hasServerComputed =
    Boolean(round?.results_computed) ||
    contestants.some((contestant) => Number(contestant.rank) > 0);

  const showRankedList = hasServerComputed && !isEditingScores;
  const isFinalRound = round?.is_final || false;

  const displayContestants = useMemo(() => {
    return contestants.map((contestant) => {
      const onlineVotes = Number(contestant.online_votes) || 0;
      const remoteVotes = Number(contestant.remote_votes) || 0;
      const displayJudgeScore = showRankedList
        ? Number(contestant.judge_score) || 0
        : Number(judgeScores[contestant.id] ?? 0);

      return {
        ...contestant,
        online_votes: onlineVotes,
        remote_votes: remoteVotes,
        displayJudgeScore,
        displayName: getContestantName(contestant),
        displayTotalScore: showRankedList
          ? Number(contestant.total_score) || 0
          : onlineVotes + remoteVotes + displayJudgeScore,
      };
    });
  }, [contestants, judgeScores, showRankedList]);

  const orderedContestants = useMemo(() => {
    if (!showRankedList) {
      return displayContestants;
    }

    return [...displayContestants].sort((left, right) => {
      const leftRank = Number(left.rank) || Number.MAX_SAFE_INTEGER;
      const rightRank = Number(right.rank) || Number.MAX_SAFE_INTEGER;

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return (Number(right.displayTotalScore) || 0) - (Number(left.displayTotalScore) || 0);
    });
  }, [displayContestants, showRankedList]);

  const totalVotes = useMemo(
    () =>
      orderedContestants.reduce(
        (sum, contestant) => sum + contestant.online_votes + contestant.remote_votes,
        0
      ),
    [orderedContestants]
  );

  const totalScore = useMemo(
    () =>
      orderedContestants.reduce(
        (sum, contestant) => sum + (Number(contestant.displayTotalScore) || 0),
        0
      ),
    [orderedContestants]
  );

  const rankedForModal = useMemo(
    () =>
      [...contestants].sort(
        (left, right) => (Number(right.total_score) || 0) - (Number(left.total_score) || 0)
      ),
    [contestants]
  );

  const statusMeta = STATUS_META[round?.status] || {
    label: String(round?.status || "Pending"),
    description: String(round?.status || "pending"),
  };

  const nextRoundButtonLabel = isFinalRound ? "Finalize Show" : "Create Next Round";

  const handleLogout = () => {
    clearAdminSession();
    navigate("/admin/login");
  };

  const handleJudgeScoreChange = (contestantId, value) => {
    setJudgeScores((currentScores) => ({
      ...currentScores,
      [contestantId]: Math.max(0, Number(value) || 0),
    }));
  };

  const handleJudgeIncrement = (contestantId) => {
    setJudgeScores((currentScores) => ({
      ...currentScores,
      [contestantId]: (Number(currentScores[contestantId]) || 0) + 1,
    }));
  };

  const handleJudgeDecrement = (contestantId) => {
    setJudgeScores((currentScores) => ({
      ...currentScores,
      [contestantId]: Math.max(0, (Number(currentScores[contestantId]) || 0) - 1),
    }));
  };

  const handleResetScores = () => {
    if (contestants.length === 0) {
      return;
    }

    setJudgeScores(buildJudgeScoreMap(contestants, 0));

    if (hasServerComputed) {
      setIsEditingScores(true);
      toast.info("Returned to score entry mode");
      return;
    }

    toast.info("All scores have been reset");
  };

  const handleCompute = async () => {
    try {
      setIsLoading(true);

      const scores = Object.entries(judgeScores).map(([contestantId, score]) => ({
        contestantId,
        score: Number(score) || 0,
      }));

      const response = await computeRoundResults(normalizedRoundId, scores);
      const data = response?.data?.data || response?.data;

      if (Array.isArray(data)) {
        setContestants(data);
      }

      setRound((currentRound) =>
        currentRound
          ? {
              ...currentRound,
              results_computed: true,
            }
          : currentRound
      );
      setIsEditingScores(false);
      toast.success("Results computed successfully!");
    } catch (error) {
      console.error("Failed to compute results:", error);
      toast.error(error.response?.data?.message || "Failed to compute results");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNextRound = async (data) => {
    try {
      setIsLoading(true);

      await createNextRound(normalizedRoundId, {
        mode: "advanced",
        takeTop: data.takeTop,
        wildcards: data.wildcards,
        removes: data.removes,
        roundName: `Round ${
          parseInt(round?.round_name?.match(/\d+/)?.[0] || "0", 10) + 1
        }`,
      });

      navigate("/");
      toast.success("Next round created successfully");
    } catch (error) {
      console.error("Failed to create next round:", error);
      toast.error(error.response?.data?.message || "Failed to create next round");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalizeShow = async (data) => {
    try {
      setIsFinalizing(true);
      await finalizeShow(normalizedRoundId, {
        debut: data.debut,
        target: data.takeTop,
      });

      toast.success("Show finalized successfully!");
      await loadRound();
    } catch (error) {
      console.error("Failed to finalize show:", error);
      toast.error(error.response?.data?.message || "Failed to finalize show");
    } finally {
      setIsFinalizing(false);
      setShowModal(false);
    }
  };

  return (
    <div className="round-results-page">
      <Navbar showProfile onLogout={handleLogout} />

      <main className="round-results">
        <section className="results-summary">
          <div className="results-summary__identity">
            <div className="results-summary__copy">
              <h1 className="results-summary__title">
                {round?.show_title || "Vote Room"}
              </h1>
              <div className={`results-summary__status results-summary__status--${round?.status || "pending"}`}>
                <span className="results-summary__status-dot" />
                <span>{statusMeta.description}</span>
              </div>
            </div>
          </div>

          <div className="results-summary__stats">
            <article className="results-summary__stat-card">
              <div className="results-summary__stat-value">{formatNumber(orderedContestants.length)}</div>
              <div className="results-summary__stat-label">Contestants</div>
            </article>

            <article className="results-summary__stat-card">
              <div className="results-summary__stat-value">{formatNumber(totalVotes)}</div>
              <div className="results-summary__stat-label">Votes</div>
            </article>

            <article className="results-summary__stat-card">
              <div className="results-summary__stat-value">{formatNumber(totalScore)}</div>
              <div className="results-summary__stat-label">Total Score</div>
            </article>
          </div>
        </section>

        <section className="results-actions">
          <div className="results-actions__buttons">
            <button
              type="button"
              className="results-actions__button results-actions__button--secondary"
              onClick={handleResetScores}
              disabled={isLoading || orderedContestants.length === 0}
            >
              <FiRefreshCw />
              Reset All Scores
            </button>

            <button
              type="button"
              className="results-actions__button results-actions__button--primary"
              onClick={handleCompute}
              disabled={isLoading || orderedContestants.length === 0 || showRankedList}
            >
              Compute Results
            </button>
          </div>
        </section>

        {isLoading && <div className="round-results__loading">Loading...</div>}

        {!isLoading && (
          <>
            {showRankedList ? (
              <section className="results-list">
                {orderedContestants.map((contestant, index) => (
                  <article
                    key={contestant.id}
                    className={`result-card result-card--${getCardTone(contestant.rank, index)}`}
                  >
                    <div className="result-card__hero">
                      <div className="result-card__hero-left">
                        <div className="result-card__medal">
                          <span
                            className={`result-card__medal-icon result-card__medal-icon--${getRankTone(contestant.rank, index)}`}
                            aria-label={getRankMedalLabel(contestant.rank, index)}
                            title={getRankMedalLabel(contestant.rank, index)}
                          >
                            <FaMedal />
                          </span>
                          <span
                            className={`result-card__rank-number result-card__rank-number--${getRankTone(contestant.rank, index)}`}
                          >
                            {getRankLabel(contestant.rank, index)}
                          </span>
                        </div>

                        <div className="result-card__hero-copy">
                          <div className="result-card__rank-line">
                            {contestant.displayName}
                          </div>

                          <div className="result-card__score">
                            Total Score: <strong>{formatNumber(contestant.displayTotalScore)}</strong> points
                          </div>
                        </div>
                      </div>

                      {Number(contestant.rank) === 1 && (
                        <div className="result-card__winner-pill">WINNER</div>
                      )}
                    </div>

                    <div className="result-card__bottom">
                      <div className="result-card__stats">
                        <span className="result-card__stat-chip result-card__stat-chip--online">
                          <FiWifi />
                          <span>Online</span>
                          <strong>{formatNumber(contestant.online_votes)}</strong>
                        </span>
                        <span className="result-card__stat-chip result-card__stat-chip--remote">
                          <MdOutlineSettingsRemote />
                          <span>Remote</span>
                          <strong>{formatNumber(contestant.remote_votes)}</strong>
                        </span>
                        <span className="result-card__stat-chip result-card__stat-chip--judge">
                          <FaStar />
                          <span>Judge</span>
                          <strong>{formatNumber(contestant.displayJudgeScore)}</strong>
                        </span>
                      </div>

                      <div className="result-card__footer">
                        {contestant.rank && contestant.rank <= 7
                          ? "Advances to next round"
                          : "Result recorded"}
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <section className="entry-list">
                {orderedContestants.map((contestant, index) => (
                  <article key={contestant.id} className="entry-card">
                    <div className="entry-card__left">
                      <div className="entry-card__index">{index + 1}</div>

                      <div className="entry-card__content">
                        <div className="entry-card__name">{contestant.displayName}</div>
                        <div className="entry-card__meta">
                          <span>Online {formatNumber(contestant.online_votes)} votes</span>
                          <span>Remote {formatNumber(contestant.remote_votes)} votes</span>
                        </div>
                      </div>
                    </div>

                    <div className="entry-card__right">
                      <label className="entry-card__judge-label" htmlFor={`judge-${contestant.id}`}>
                        Judge
                      </label>

                      <div className="entry-card__score-controls">
                        <button
                          type="button"
                          className="entry-card__icon-btn"
                          onClick={() => handleJudgeDecrement(contestant.id)}
                        >
                          <FiMinus />
                        </button>

                        <input
                          id={`judge-${contestant.id}`}
                          type="number"
                          className="entry-card__input"
                          value={judgeScores[contestant.id] ?? 0}
                          onChange={(event) =>
                            handleJudgeScoreChange(contestant.id, event.target.value)
                          }
                          min="0"
                          step="1"
                        />

                        <button
                          type="button"
                          className="entry-card__icon-btn"
                          onClick={() => handleJudgeIncrement(contestant.id)}
                        >
                          <FiPlus />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            )}

            <div className="results-footer admin-page-actions">
              <button
                type="button"
                className="results-footer__button results-footer__button--secondary admin-page-action-btn admin-page-action-btn--back"
                onClick={() => navigate(-1)}
              >
                Back
              </button>

              <button
                type="button"
                className="results-footer__button results-footer__button--primary admin-page-action-btn admin-page-action-btn--primary"
                onClick={() => setShowModal(true)}
                disabled={!showRankedList || isLoading || isFinalizing}
              >
                {nextRoundButtonLabel}
              </button>
            </div>
          </>
        )}

        {showModal && showRankedList && (
          <AdvancedModal
            ranked={rankedForModal.map((contestant) => ({
              ...contestant,
              final: contestant.total_score,
            }))}
            onClose={() => setShowModal(false)}
            onSubmit={isFinalRound ? handleFinalizeShow : handleCreateNextRound}
            isFinalRound={isFinalRound}
          />
        )}
      </main>
    </div>
  );
}

function AdvancedModal({ ranked, onClose, onSubmit, isFinalRound = false }) {
  const [takeTop, setTakeTop] = useState(3);
  const [wildcards, setWildcards] = useState([]);
  const [removes, setRemoves] = useState([]);

  const toggleWildcard = (id) =>
    setWildcards((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );

  const toggleRemove = (id) =>
    setRemoves((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );

  const base = ranked.slice(0, takeTop).map((contestant) => contestant.id);
  const extra = wildcards.filter((id) => !base.includes(id));
  const nextIds = base.concat(extra).filter((id) => !removes.includes(id));
  const next = ranked.filter((contestant) => nextIds.includes(contestant.id));
  const valid = next.length >= 2;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3 className="modal__title">
          {isFinalRound ? "Finalize Show" : "Create Next Round"} (Advanced)
        </h3>

        <div className="modal__field">
          Take Top:
          <input
            type="number"
            min={2}
            max={ranked.length}
            value={takeTop}
            onChange={(event) => setTakeTop(Number(event.target.value))}
            className="modal__input"
          />
        </div>

        <div className="modal__section-title">Contestants</div>
        {ranked.map((contestant, index) => {
          const rank = index + 1;
          const isBase = index < takeTop;
          const isWildcard = wildcards.includes(contestant.id);
          const isRemove = removes.includes(contestant.id);

          return (
            <div
              key={contestant.id}
              className="modal__item"
              style={{ border: rank <= 3 ? "2px solid #FFD872" : "1px solid #E6E1D9" }}
            >
              <div className="modal__item-row">
                <div className="modal__item-info">
                  {getRankLabel(rank, index)}
                  <span>{getContestantName(contestant)}</span>
                  <span className="modal__item-score">({contestant.final})</span>
                </div>

                <div className="modal__item-actions">
                  <button
                    onClick={() => toggleWildcard(contestant.id)}
                    className="modal__chip"
                    style={{ background: isWildcard ? "#E5D4FF" : "#EDEDED" }}
                  >
                    Wildcard
                  </button>
                  <button
                    onClick={() => toggleRemove(contestant.id)}
                    className="modal__chip"
                    style={{ background: isRemove ? "#FFB8A5" : "#EDEDED" }}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {isBase && <div className="modal__hint">Base Top {takeTop}</div>}
            </div>
          );
        })}

        <div className="modal__summary">
          <div className="modal__section-title">
            {isFinalRound ? "Final Lineup:" : "Next Round Participants:"}
          </div>
          <ul className="modal__summary-list">
            {next.map((contestant) => (
              <li key={contestant.id}>
                {getContestantName(contestant)} ({contestant.final} pts)
              </li>
            ))}
          </ul>
        </div>

        {!valid && <div className="modal__error">Must have at least 2 contestants</div>}

        <div className="modal__footer">
          <button onClick={onClose} className="modal__btn modal__btn--secondary">
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() =>
              onSubmit({
                takeTop,
                wildcards,
                removes,
                debut: next.map((contestant) => contestant.id),
              })
            }
            className="modal__btn modal__btn--primary"
            style={{
              background: valid ? "#B6F3C1" : "#DDD",
              border: "none",
              cursor: valid ? "pointer" : "default",
            }}
          >
            {isFinalRound ? "Finalize Show" : "Create Next Round"}
          </button>
        </div>
      </div>
    </div>
  );
}
