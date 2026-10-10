import { useEffect } from "react";
import Icon from "../Icons";

export default function Drawer({ open, onClose, title, children }) {
    useEffect(() => {
        if (!open) return;
        const onKey = e => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);
    if (!open) return null;
    return (
        <>
            <div className="drawer-backdrop" onClick={onClose} />
            <aside
                className="drawer"
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="drawer-head">
                    <h3>{title}</h3>
                    <button
                        className="btn-icon"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <Icon name="x" size={18} />
                    </button>
                </div>
                <div className="drawer-body">{children}</div>
            </aside>
        </>
    );
}
