import React, { useEffect, useState, useMemo } from "react";

export default function Countdown({ start, now, onFlipToVoting }) {
  const [currentNow, setCurrentNow] = useState(new Date(now));

  useEffect(() => {
    const tick = setInterval(() => {
      setCurrentNow((prev) => new Date(prev.getTime() + 1000));
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  const diff = useMemo(() => {
    return start ? new Date(start) - currentNow : 0;
  }, [start, currentNow]);

  useEffect(() => {
    if (diff <= 0 && typeof onFlipToVoting === "function") {
      onFlipToVoting(); // R5 auto flip
    }
  }, [diff, onFlipToVoting]);

  if (!start || diff <= 0) return null;

  const total = Math.floor(diff / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;

  // Fmt1: short style “3h 12m 08s”
  const fmt = `${h}h ${m}m ${s.toString().padStart(2, "0")}s`;

  return (
    <div style={{ fontSize: "15px", fontWeight: 600 }}>
      {fmt}
    </div>
  );
}

