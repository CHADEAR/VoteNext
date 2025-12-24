import React from "react";

export default function PreviewShareBox({ publicSlug }) {
  const url = `${window.location.origin}/vote/${publicSlug || ""}`;

  return (
    <div className="preview-share">
      <h4>Online Share</h4>
      <div className="qr-box" />
      <input value={url} readOnly />
    </div>
  );
}
