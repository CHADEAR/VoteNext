import React from "react";
import "./PreviewQRCode.css";

export default function PreviewQRCode({ publicSlug }) {
  // Generate QR code URL (you can replace with actual QR code generation)
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${window.location.origin}/vote/${publicSlug}`;
  
  return (
    <div className="preview-qr-code">
      <h4 className="qr-title">QR Code for Voting</h4>
      <div className="qr-container">
        <div className="qr-image">
          <img 
            src={qrCodeUrl} 
            alt="Vote QR Code" 
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
          <div className="qr-fallback">
            <div className="qr-placeholder">
              <div className="qr-icon">📱</div>
              <div className="qr-text">QR Code</div>
              <div className="qr-subtext">Scan to vote</div>
            </div>
          </div>
        </div>
        <div className="qr-info">
          <p className="qr-instruction">
            Scan this QR code to access the voting page
          </p>
          <div className="qr-url">
            <span className="url-label">Vote URL:</span>
            <span className="url-value">{`${window.location.origin}/vote/${publicSlug}`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
