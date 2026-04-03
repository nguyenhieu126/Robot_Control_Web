import React, { useEffect } from "react";
import "../styles/Toast.css";

export default function Toast({ type = "info", message = "", duration = 3000, onClose = null }) {
  useEffect(() => {
    if (!message || typeof onClose !== "function") return undefined;
    const timer = setTimeout(() => onClose(), duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast toast--${type}`}>
      {message}
    </div>
  );
}
