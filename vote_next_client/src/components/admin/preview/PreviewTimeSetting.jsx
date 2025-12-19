import React from "react";
import "./PreviewTimeSetting.css";

export default function PreviewTimeSetting({
  counterType,      // "auto" | "manual"
  startDate,        // Date string in YYYY-MM-DD
  endDate,          // Date string in YYYY-MM-DD
  startTime,        // Time string in HH:MM
  endTime,          // Time string in HH:MM
}) {
  // Safely parse date and time values
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? "" : date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return "";
    }
  };

  const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return "";
    try {
      const [hours, minutes] = timeStr.split(':');
      const date = new Date();
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
      return isNaN(date.getTime()) ? "" : date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="preview-time">
      <h4>
        Time setting :{" "}
        <span className="badge">
          {counterType === "auto" ? "Auto" : "Manual"}
        </span>
      </h4>

      {counterType === "manual" ? (
        <div className="preview-manual">
          <p>⏱ Counter is set to manual</p>
        </div>
      ) : (
        <div className="auto-time-settings">
          <div className="time-setting-group">
            <div className="time-setting">
              <label>Start Date</label>
              <div className="time-value">
                {startDate ? formatDateDisplay(startDate) : 'Not set'}
              </div>
            </div>
            <div className="time-setting">
              <label>Start Time</label>
              <div className="time-value">
                {startTime ? formatTimeDisplay(startTime) : 'Not set'}
              </div>
            </div>
          </div>
          
          <div className="time-setting-group">
            <div className="time-setting">
              <label>End Date</label>
              <div className="time-value">
                {endDate ? formatDateDisplay(endDate) : 'Not set'}
              </div>
            </div>
            <div className="time-setting">
              <label>End Time</label>
              <div className="time-value">
                {endTime ? formatTimeDisplay(endTime) : 'Not set'}
              </div>
            </div>
          </div>
          
          <div className="time-status">
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span>Auto mode is active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
