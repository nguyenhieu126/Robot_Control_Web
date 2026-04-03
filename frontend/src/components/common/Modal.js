import React from "react";
import "../styles/Modal.css";

export default function Modal({ isOpen, title, onClose, children, size = "medium" }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal-card modal-card--${size}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" onClick={onClose} className="modal-close">x</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
