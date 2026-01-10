import React, { useState, useEffect, useRef } from "react";
import "./PreviewTimeSetting.css";
import apiClient from "../../../api/apiClient";

export default function PreviewTimeSetting({
  counterType,      // "auto" | "manual"
  startDate,
  endDate,
  startTime,
  endTime,
  initialTime = "00:00:00",
  roundId,
  status,           // 'pending' | 'voting' | 'closed'
  onRefresh,
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(initialTime);
  const timerRef = useRef(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}.${month}.${year}`;
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      secs.toString().padStart(2, "0"),
    ].join(":");
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime((prevTime) => {
          const newTime = prevTime + 1;
          setDisplayTime(formatTime(newTime));
          return newTime;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  // --- API Actions ---
  const handleStartRound = async () => {
    await apiClient.post(`/rounds/${roundId}/start`);
    onRefresh?.();
    setIsRunning(true);
  };

  const handleStopRound = async () => {
    await apiClient.post(`/rounds/${roundId}/stop`);
    onRefresh?.();
    setIsRunning(false);
  };

  // UI Controls for Manual Round
  const renderManualControls = () => (
    <div className="time-controls">
      <button
        className="start-btn"
        onClick={handleStartRound}
        disabled={status !== "pending"}
      >
        Start
      </button>
      <button
        className="stop-btn"
        onClick={handleStopRound}
        disabled={status !== "voting"}
      >
        Stop
      </button>
    </div>
  );

  // UI Controls for Auto Round (disable buttons)
  const renderAutoControls = () => (
    <div className="time-controls">
      <button className="start-btn" disabled>
        Start
      </button>
      <button className="stop-btn" disabled>
        Stop
      </button>
    </div>
  );

  return (
    <div className="preview-time">
      <h4>
        Time setting :{" "}
        <span className="badge">
          {counterType === "auto" ? "Auto" : "Manual"}
        </span>
      </h4>

      {counterType === "auto" ? (
        <div className="auto-time-settings">
          <div className="date-picker">
            <label>select day</label>
            <div className="date-value">
              {startDate ? formatDate(startDate) : "Not set"}
            </div>
          </div>
          <div className="time-pickers">
            <div className="time-picker">
              <label>Start with</label>
              <div className="time-value">{startTime || "00:00:00"}</div>
            </div>
            <div className="time-picker">
              <label>End with</label>
              <div className="time-value">{endTime || "00:00:00"}</div>
            </div>
          </div>

          <div className="time-display">
            <div className="time-value">{displayTime}</div>
          </div>

          {renderAutoControls()}
        </div>
      ) : (
        <div className="manual-time-settings">
          <div className="time-display">
            <div className="time-value">{displayTime}</div>
          </div>

          {renderManualControls()}
        </div>
      )}
    </div>
  );
}
