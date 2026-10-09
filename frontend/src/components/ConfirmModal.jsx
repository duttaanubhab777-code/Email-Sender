import { useEffect } from "react";
import Icon from "./Icons";

export default function ConfirmModal({ open, title, text, confirmLabel = "Confirm", danger, busy, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const onKey = e => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal card" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={`modal-icon ${danger ? "danger" : ""}`}><Icon name={danger ? "trash" : "alert"} size={26} /></div>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={`btn ${danger ? "btn-danger" : "btn-primary"}`} onClick={onConfirm} disabled={busy}>
            {busy ? <span className="spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
