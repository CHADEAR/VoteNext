import React, { useState, useEffect, useRef, useCallback } from "react";
import "./PreviewTimeSetting.css";
import apiClient from "../../../api/apiClient";

// FIXED +07 (THAILAND)
const createThaiDate = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = dateStr.split("-").map(Number);
  const [H, M, S = 0] = timeStr.split(":").map(Number);
  // Date(...) ใช้ timezone browser → ไทย +07 อยู่แล้ว
  return new Date(y, m - 1, d, H, M, S);
};

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
  // Debug logging for received props
  console.log("PreviewTimeSetting props:", {
    counterType,
    startDate,
    endDate,
    startTime,
    endTime,
    roundId
  });
  // Load timer state from localStorage on mount
  const getStoredTimerState = () => {
    const stored = localStorage.getItem(`timer_${roundId}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  };

  const storedState = getStoredTimerState();
  const [isRunning, setIsRunning] = useState(storedState?.isRunning || false);
  const [time, setTime] = useState(storedState?.time || 0);
  const [displayTime, setDisplayTime] = useState(storedState?.displayTime || initialTime);
  const [countdown, setCountdown] = useState("");
  const [isUrgent, setIsUrgent] = useState(false); // Track if within 1 minute
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (roundId) {
      const stateToStore = {
        isRunning,
        time,
        displayTime,
        timestamp: Date.now()
      };
      localStorage.setItem(`timer_${roundId}`, JSON.stringify(stateToStore));
    }
  }, [isRunning, time, displayTime, roundId]);

  // Calculate elapsed time if timer was running when page was refreshed
  useEffect(() => {
    if (storedState?.isRunning && storedState?.timestamp) {
      const elapsedSinceRefresh = Math.floor((Date.now() - storedState.timestamp) / 1000);
      const newTime = storedState.time + elapsedSinceRefresh;
      setTime(newTime);
      setDisplayTime(formatTime(newTime));
    }
  }, [storedState]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate) return "Not set";
    
    const startFormatted = formatDate(startDate);
    
    if (!endDate || endDate === startDate) {
      return startFormatted;
    }
    
    const endFormatted = formatDate(endDate);
    return `${startFormatted} - ${endFormatted}`;
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((x) => x.toString().padStart(2, "0")).join(":");
  };

  const formatCountdown = (seconds) => {
    const abs = Math.abs(seconds);
    const h = Math.floor(abs / 3600);
    const m = Math.floor((abs % 3600) / 60);
    const s = abs % 60;
    return [h, m, s].map((x) => x.toString().padStart(2, "0")).join(":");
  };

  const updateCountdown = useCallback(() => {
    if (counterType !== "auto" || !startDate || !startTime || !endTime) return;

    const now = new Date(); // ใช้ +07 ของ browser
    const startDT = createThaiDate(startDate, startTime);
    let endDT = createThaiDate(endDate || startDate, endTime);

    if (!startDT || !endDT) return;

    // ถ้า end < start → ข้ามวัน
    if (endDT <= startDT) {
      endDT.setDate(endDT.getDate() + 1);
    }

    if (now < startDT) {
      const diff = Math.floor((startDT - now) / 1000);
      setCountdown(`Starts in ${formatCountdown(diff)}`);
      // Check if within 1 minute (60 seconds) of start time
      setIsUrgent(diff <= 60 && diff > 0);
    } else if (now >= startDT && now < endDT) {
      const diff = Math.floor((endDT - now) / 1000);
      setCountdown(`Ends in ${formatCountdown(diff)}`);
      // Check if within 1 minute (60 seconds) of end time
      setIsUrgent(diff <= 60 && diff > 0);
    } else {
      setCountdown("Closed");
      setIsUrgent(true); // Set urgent when status is Closed
    }
  }, [counterType, startDate, startTime, endTime, endDate]);

  useEffect(() => {
    if (counterType === "auto") {
      updateCountdown();
      countdownRef.current = setInterval(updateCountdown, 1000);
      return () => countdownRef.current && clearInterval(countdownRef.current);
    }
  }, [counterType, updateCountdown]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime((prev) => {
          const next = prev + 1;
          setDisplayTime(formatTime(next));
          return next;
        });
      }, 1000);
    } else {
      timerRef.current && clearInterval(timerRef.current);
    }

    return () => timerRef.current && clearInterval(timerRef.current);
  }, [isRunning]);

  const handleStartRound = async () => {
    try {
      // Try backend API call
      await apiClient.post(`/rounds/${roundId}/start`);
    } catch (error) {
      console.log("Backend API not available, using local timer");
    }
    onRefresh?.();
    setIsRunning(true);
  };

  const handleStopRound = async () => {
    try {
      // Try backend API call
      await apiClient.post(`/rounds/${roundId}/stop`);
    } catch (error) {
      console.log("Backend API not available, using local timer");
    }
    onRefresh?.();
    setIsRunning(false);
  
    // Clear localStorage when stopping
    if (roundId) {
      localStorage.removeItem(`timer_${roundId}`);
    }
  };

  const renderManualControls = () => (
    <div className="time-controls">
      <button className="start-btn" onClick={handleStartRound}>
        Start
      </button>
      <button className="stop-btn" onClick={handleStopRound} disabled={!isRunning}>
        Stop
      </button>
    </div>
  );

  const renderAutoControls = () => (
    <div className="time-controls">
      <button className="start-btn" disabled>Start</button>
      <button className="stop-btn" disabled>Stop</button>
    </div>
  );

  return (
    <div className="preview-time">
      <h4>
        Time setting:{" "}
        <span className="badge">{counterType === "auto" ? "Auto" : "Manual"}</span>
      </h4>

      {counterType === "auto" ? (
        <div className="auto-time-settings">
          {/* Prominent Countdown Display */}
          {countdown && (
            <div className={`countdown-display ${isUrgent ? 'urgent' : ''}`}>
              <div className="countdown-label">Voting Status</div>
              <div className="countdown-value">{countdown}</div>
            </div>
          )}

          <div className="date-picker">
            <label>select day</label>
            <div className="date-value">{formatDateRange(startDate, endDate)}</div>
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
