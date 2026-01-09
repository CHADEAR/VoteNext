import React, { useState, useEffect, useRef } from "react";
import "./PreviewTimeSetting.css";

export default function PreviewTimeSetting({ 
  counterType,      // "auto" | "manual"
  startDate,        // Date string in YYYY-MM-DD
  endDate,          // Date string in YYYY-MM-DD
  startTime,        // Time string in HH:MM
  endTime,          // Time string in HH:MM
  initialTime = "00:00:00" // Initial time display
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // time in seconds
  const [displayTime, setDisplayTime] = useState(initialTime);
  const timerRef = useRef(null);

  // Format date to display as DD.MM.YYYY
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  };

  // Format seconds to HH:MM:SS
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Handle start/stop timer
  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  // Reset timer
  const resetTimer = () => {
    setIsRunning(false);
    setTime(0);
    setDisplayTime(initialTime);
  };

  // Effect to handle timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime(prevTime => {
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

  return (
    <div className="preview-time">
      <h4>
        Time setting : <span className="badge">{counterType === "auto" ? "Auto" : "Manual"}</span>
      </h4>
      
      {counterType === "auto" ? (
        <div className="auto-time-settings">
          <div className="date-picker">
            <label>select day</label>
            <div className="date-value">{startDate ? formatDate(startDate) : 'Not set'}</div>
          </div>
          <div className="time-pickers">
            <div className="time-picker">
              <label>Start with</label>
              <div className="time-value">{startTime || '00:00:00'}</div>
            </div>
            <div className="time-picker">
              <label>End with</label>
              <div className="time-value">{endTime || '00:00:00'}</div>
            </div>
          </div>
          <div className="time-display">
            <div className="time-value">{displayTime}</div>
          </div>
          <div className="time-controls">
            <button 
              className={`start-btn ${isRunning ? 'active' : ''}`} 
              onClick={toggleTimer}
              disabled={isRunning}
            >
              {isRunning ? 'Running...' : 'Start'}
            </button>
            <button 
              className="stop-btn" 
              onClick={resetTimer}
              disabled={!isRunning && time === 0}
            >
              Stop
            </button>
          </div>
        </div>
      ) : (
        <div className="manual-time-settings">
          <div className="time-display">
            <div className="time-value">{displayTime}</div>
          </div>
          <div className="time-controls">
            <button 
              className={`start-btn ${isRunning ? 'active' : ''}`} 
              onClick={toggleTimer}
              disabled={isRunning}
            >
              {isRunning ? 'Running...' : 'Start'}
            </button>
            <button 
              className="stop-btn" 
              onClick={resetTimer}
              disabled={!isRunning && time === 0}
            >
              Stop
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
