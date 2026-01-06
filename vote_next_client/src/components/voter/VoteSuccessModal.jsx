import React from "react";

export default function VoteSuccessModal({ open, onClose, onViewResult }) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>โหวตสำเร็จ</h3>
        <div className="modal__desc">+ 1 โหวต</div>

        <div className="modal__actions">
          <button className="btn-primary" onClick={onViewResult}>
            ดูผลโหวตทั้งหมด
          </button>

          <button className="btn-secondary" onClick={onClose}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}
