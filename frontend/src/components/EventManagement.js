import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRobotApi } from "../hooks/useRobotApi";
import Table from "./common/Table";
import Modal from "./common/Modal";
import Toast from "./common/Toast";
import EventDetail from "./EventDetail";
import "./styles/AdminPages.css";

const PAGE_SIZE = 10;

function toIsoStart(dateText) {
  return dateText ? `${dateText}T00:00:00.000Z` : null;
}

function toIsoEnd(dateText) {
  return dateText ? `${dateText}T23:59:59.999Z` : null;
}

function formatTime(value) {
  if (!value) return "--";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString();
}

export default function EventManagement({ onBack, darkMode = true }) {
  const { getAllEvents, updateEventStatus, deleteEvent } = useRobotApi();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [offset, setOffset] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("view");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState({ type: "info", message: "" });

  const currentRole = useMemo(() => {
    const raw = localStorage.getItem("auth_user");
    try {
      return raw ? JSON.parse(raw)?.role : "user";
    } catch {
      return "user";
    }
  }, []);

  const canEditStatus = currentRole === "admin" || currentRole === "security";
  const canDelete = currentRole === "admin";

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    const res = await getAllEvents({
      limit: PAGE_SIZE,
      offset,
      status,
      from: toIsoStart(fromDate),
      to: toIsoEnd(toDate),
    });

    if (res?.success) {
      setEvents(Array.isArray(res.data) ? res.data : []);
    } else {
      setError(res?.error || "Failed to load events.");
    }

    setLoading(false);
  }, [getAllEvents, offset, status, fromDate, toDate]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const openDetail = (item, nextMode = "view") => {
    setSelectedEvent(item);
    setModalMode(nextMode);
    setModalOpen(true);
  };

  const closeDetail = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const handleUpdate = async (id, payload) => {
    setSaving(true);
    const res = await updateEventStatus(id, payload);
    if (!res?.success) {
      setToast({ type: "error", message: res?.error || "Update failed." });
      setSaving(false);
      return;
    }

    setToast({ type: "success", message: "Event updated." });
    setModalOpen(false);
    await loadEvents();
    setSaving(false);
  };

  const handleDelete = async (item) => {
    const yes = window.confirm(`Delete event #${item.id}?`);
    if (!yes) return;

    const res = await deleteEvent(item.id);
    if (!res?.success) {
      setToast({ type: "error", message: res?.error || "Delete failed." });
      return;
    }

    setToast({ type: "success", message: "Event deleted." });
    await loadEvents();
  };

  const columns = [
    { key: "id", label: "ID" },
    { key: "created_at", label: "Created", render: (row) => formatTime(row.created_at) },
    { key: "object", label: "Object", render: (row) => row.object_type || "--" },
    { key: "confidence", label: "Confidence", render: (row) => row.confidence ?? "--" },
    { key: "location", label: "Location", render: (row) => `${row.location_x ?? "--"}, ${row.location_y ?? "--"}` },
    {
      key: "status",
      label: "Status",
      render: (row) => <span className={`admin-chip admin-chip--${row.status}`}>{row.status}</span>,
    },
    {
      key: "snapshot",
      label: "Snapshot",
      render: (row) => {
        const image = row.snapshot_path || row.detection_image_path;
        return image ? <img src={image} alt="snapshot" className="admin-thumb" /> : "--";
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="admin-inline-actions">
          <button type="button" className="admin-btn admin-btn--muted" onClick={(e) => { e.stopPropagation(); openDetail(row, "view"); }}>
            View
          </button>
          {canEditStatus ? (
            <button type="button" className="admin-btn" onClick={(e) => { e.stopPropagation(); openDetail(row, "edit"); }}>
              Update
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" className="admin-btn admin-btn--danger" onClick={(e) => { e.stopPropagation(); handleDelete(row); }}>
              Delete
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className={`admin-page ${darkMode ? "admin-page--dark" : "admin-page--light"}`}>
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <h1 className="admin-title">Abandoned Events</h1>
            <p className="admin-subtitle">Filter by status/date and update processing notes</p>
          </div>
          <div className="admin-actions">
            <button className="admin-btn admin-btn--muted" onClick={onBack}>Back</button>
            <button className="admin-btn" onClick={loadEvents}>Refresh</button>
          </div>
        </header>

        <section className="admin-toolbar">
          <div className="admin-field">
            <label>Status</label>
            <select className="admin-select" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
              <option value="all">all</option>
              <option value="pending">pending</option>
              <option value="processing">processing</option>
              <option value="confirmed">confirmed</option>
              <option value="resolved">resolved</option>
              <option value="dismissed">dismissed</option>
              <option value="false_alarm">false_alarm</option>
            </select>
          </div>

          <div className="admin-field">
            <label>From</label>
            <input type="date" className="admin-input" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setOffset(0); }} />
          </div>

          <div className="admin-field">
            <label>To</label>
            <input type="date" className="admin-input" value={toDate} onChange={(e) => { setToDate(e.target.value); setOffset(0); }} />
          </div>
        </section>

        {error ? <div className="admin-msg admin-msg--error">{error}</div> : null}

        <Table
          columns={columns}
          data={events}
          loading={loading}
          error={error}
          pagination={{
            offset,
            limit: PAGE_SIZE,
            hasNext: events.length === PAGE_SIZE,
            onPageChange: setOffset,
          }}
        />

        <Modal
          isOpen={modalOpen}
          title={modalMode === "edit" ? "Update Event" : "Event Detail"}
          onClose={closeDetail}
          size="large"
        >
          <EventDetail
            event={selectedEvent}
            mode={modalMode}
            onUpdate={handleUpdate}
            onClose={closeDetail}
            loading={saving}
          />
        </Modal>

        <Toast type={toast.type} message={toast.message} onClose={() => setToast({ type: "info", message: "" })} />
      </div>
    </div>
  );
}
