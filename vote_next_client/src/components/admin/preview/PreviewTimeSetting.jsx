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
  manualStartTime,   // เพิ่ม prop สำหรับเวลาเริ่มต้นของ manual mode
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [displayTime, setDisplayTime] = useState(initialTime);
  const [countdown, setCountdown] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
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

  // คำนวณเวลาที่ผ่านไปสำหรับ manual mode
  useEffect(() => {
    if (counterType === "manual" && manualStartTime && status === "voting") {
      const now = new Date();
      const start = new Date(manualStartTime);
      const elapsedSeconds = Math.floor((now - start) / 1000);
      setTime(elapsedSeconds);
      setDisplayTime(formatTime(elapsedSeconds));
      setIsRunning(true);
    } else if (status === "pending") {
      setTime(0);
      setDisplayTime(initialTime);
      setIsRunning(false);
    } else if (status === "closed") {
      setIsRunning(false);
    }
  }, [counterType, manualStartTime, status, initialTime]);

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
    if (isStarting) return; // ป้องกันการกดซ้ำ
    
    try {
      setIsStarting(true);
      await apiClient.post(`/rounds/${roundId}/start`);
      await onRefresh?.(); // รอให้ข้อมูลอัพเดทก่อน
      setIsRunning(true);
    } catch (error) {
      console.error('Failed to start round:', error);
      // อาจแสดง error message ในอนาคต
    } finally {
      setIsStarting(false);
    }
  };

  const handleStopRound = async () => {
    if (isStopping) return; // ป้องกันการกดซ้ำ
    
    try {
      setIsStopping(true);
      await apiClient.post(`/rounds/${roundId}/stop`);
      await onRefresh?.(); // รอให้ข้อมูลอัพเดทก่อน
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to stop round:', error);
      // อาจแสดง error message ในอนาคต
    } finally {
      setIsStopping(false);
    }
  };

  const renderManualControls = () => {
    const isStartDisabled = status !== "pending" || isStarting;
    const isStopDisabled = status !== "voting" || isStopping;
    const isBothDisabled = status === "closed";
    
    return (
      <div className="time-controls">
        <button 
          className={`start-btn ${isStartDisabled ? 'disabled' : ''} ${isStarting ? 'loading' : ''}`}
          onClick={handleStartRound} 
          disabled={isStartDisabled}
        >
          {isStarting ? 'Starting...' : 'Start'}
        </button>
        <button 
          className={`stop-btn ${isStopDisabled ? 'disabled' : ''} ${isStopping ? 'loading' : ''}`}
          onClick={handleStopRound} 
          disabled={isStopDisabled}
        >
          {isStopping ? 'Stopping...' : 'Stop'}
        </button>
      </div>
    );
  };

  const renderAutoControls = () => {
    const isBothDisabled = status === "closed";
    
    return (
      <div className="time-controls">
        <button className="start-btn disabled" disabled>
          Start
        </button>
        <button className="stop-btn disabled" disabled>
          Stop
        </button>
      </div>
    );
  };

  return (
    <div className="preview-time">
      <div className="date-picker">
        <span className="time-tx">
          Setting:{" "}
          <span className="badge">{counterType === "auto" ? "Auto" : "Manual"}</span>
        </span>
        <div className="day-value">
          <label>Date</label>
          <div className="date-value">{startDate ? formatDate(startDate) : "Not set"}</div>
        </div>
      </div>

      {counterType === "auto" ? (
        <div className="auto-time-settings">

          <div className="time-pickers">
            <div className="time-picker">
              <label className="tx-s">Start with</label>
              <div className="time-value">{startTime || "00:00:00"}</div>
            </div>
            <div className="time-picker">
              <label className="tx-e">End with</label>
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
