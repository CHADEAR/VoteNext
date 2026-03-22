import React from "react";

export default function PreviewPollCard({ title, description }) {
  return (
    <section className="preview-card">
      <h2>{title || "Untitled poll"}</h2>
      <p className="preview-card__description">{description || "-"}</p>
    </section>
  );
}
