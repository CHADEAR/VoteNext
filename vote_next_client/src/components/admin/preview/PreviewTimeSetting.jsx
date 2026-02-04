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
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(initialTime);
  const [countdown, setCountdown] = useState("");
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    return `${d}.${m}.${y}`;
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
    } else if (now >= startDT && now < endDT) {
      const diff = Math.floor((endDT - now) / 1000);
      setCountdown(`Ends in ${formatCountdown(diff)}`);
    } else {
      setCountdown("Closed");
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
    await apiClient.post(`/rounds/${roundId}/start`);
    onRefresh?.();
    setIsRunning(true);
  };

  const handleStopRound = async () => {
    await apiClient.post(`/rounds/${roundId}/stop`);
    onRefresh?.();
    setIsRunning(false);
  };

  const renderManualControls = () => (
    <div className="time-controls">
      <button className="start-btn" onClick={handleStartRound} disabled={status !== "pending"}>
        Start
      </button>
      <button className="stop-btn" onClick={handleStopRound} disabled={status !== "voting"}>
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
      <h3>
        Time setting:{" "}
        <span className="badge">{counterType === "auto" ? "Auto" : "Manual"}</span>
      </h3>

      {counterType === "auto" ? (
        <div className="auto-time-settings">
          <div className="date-picker">
            <label>select day</label>
            <div className="date-value">{startDate ? formatDate(startDate) : "Not set"}</div>
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
            <div className="time-value">{countdown}</div>
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
