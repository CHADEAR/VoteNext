import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import "./PreviewShareBox.css";

export default function PreviewShareBox({ publicSlug }) {
  const [copied, setCopied] = useState(false);

  if (!publicSlug) return null;

  const publicVoteUrl = `${window.location.origin}/vote/${publicSlug}`;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="preview-share-box">
      <h3>Share Voting</h3>

      {/* ✅ QR CODE */}
      <div className="qr-wrapper">
        <QRCodeSVG
          value={publicVoteUrl}
          size={180}
          level="H"
          includeMargin
        />
      </div>

      {/* ✅ LINK + COPY */}
      <div className="share-link">
        <input value={publicVoteUrl} readOnly />
        <CopyToClipboard text={publicVoteUrl} onCopy={handleCopy}>
          <button>
            {copied ? "Copied!" : "Copy"}
          </button>
        </CopyToClipboard>
      </div>

      <p className="hint">
        Scan QR code or copy link to join voting
      </p>
    </div>
  );
}
