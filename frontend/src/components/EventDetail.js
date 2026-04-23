import React, { useEffect, useMemo, useState } from "react";
import { resolveMediaUrl } from "../utils/mediaUrl";
import "./styles/EventDetail.css";

const STATUS_OPTIONS = ["pending", "processing", "confirmed", "resolved", "dismissed", "false_alarm"];

function formatTime(value) {
  if (!value) return "--";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString();
}

export default function EventDetail({ event, mode, onUpdate, onClose, loading }) {
  const [status, setStatus] = useState("pending");
  const [note, setNote] = useState("");

  useEffect(() => {
    setStatus(event?.status || "pending");
    setNote(event?.note || "");
  }, [event]);

  const previewImage = useMemo(() => {
    if (!event) return "";
    return resolveMediaUrl(event.snapshot_path || event.detection_image_path || "");
  }, [event]);

  if (!event) return null;

  const handleSave = () => {
    if (typeof onUpdate !== "function") return;
    onUpdate(event.id, { status, note });
  };

  return (
    <div className="event-detail">
      <div className="admin-grid-two">
        <div className="admin-card">
          <h4>Event Info</h4>
          <div className="admin-kv">
            <div><span>ID</span><span>{event.id}</span></div>
            <div><span>Status</span><span className={`admin-chip admin-chip--${event.status}`}>{event.status}</span></div>
            <div><span>Object</span><span>{event.object_type || "--"}</span></div>
            <div><span>Confidence</span><span>{event.confidence ?? "--"}</span></div>
            <div><span>Location</span><span>{event.location_x ?? "--"}, {event.location_y ?? "--"}</span></div>
            <div><span>First Seen</span><span>{formatTime(event.first_seen)}</span></div>
            <div><span>Last Seen</span><span>{formatTime(event.last_seen)}</span></div>
            <div><span>Duration</span><span>{event.duration ?? "--"}s</span></div>
            <div><span>Created</span><span>{formatTime(event.created_at)}</span></div>
            <div><span>Resolved</span><span>{formatTime(event.resolved_at)}</span></div>
          </div>
        </div>

        <div className="admin-card">
          <h4>Snapshot</h4>
          {previewImage ? (
            <img src={previewImage} alt="snapshot" className="event-detail-image" />
          ) : (
            <div className="event-detail-empty">No image</div>
          )}
        </div>
      </div>

      {mode === "edit" ? (
        <div className="event-detail-form">
          <div className="admin-field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="admin-select" disabled={loading}>
              {STATUS_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div className="admin-field">
            <label>Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} className="admin-textarea" disabled={loading} />
          </div>

          <div className="user-form-actions">
            <button className="admin-btn admin-btn--muted" type="button" onClick={onClose} disabled={loading}>Cancel</button>
            <button className="admin-btn" type="button" onClick={handleSave} disabled={loading}>Save</button>
          </div>
        </div>
      ) : (
        <div className="user-form-actions">
          <button className="admin-btn admin-btn--muted" type="button" onClick={onClose}>Close</button>
        </div>
      )}
    </div>
  );
}
