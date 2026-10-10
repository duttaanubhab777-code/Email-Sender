import { useEffect } from "react";
import Icon from "../Icons";

// Desktop এ মাঝখানে, মোবাইলে নিচ থেকে ওঠা শীট (CSS দিয়ে)
export default function Modal({
    open,
    onClose,
    title,
    icon,
    tone = "",
    wide = false,
    children,
    footer,
    busy = false
}) {
    useEffect(() => {
        if (!open) return;
        const onKey = e => {
            if (e.key === "Escape" && !busy) onClose?.();
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose, busy]);

    if (!open) return null;
    return (
        <div
            className="modal-backdrop"
            onMouseDown={e => {
                if (e.target === e.currentTarget && !busy) onClose?.();
            }}
        >
            <div
                className={`modal ${wide ? "wide" : ""}`}
                role="dialog"
                aria-modal="true"
                aria-label={title}
            >
                <div className="modal-head">
                    {icon && (
                        <span className={`modal-ic ${tone}`}>
                            <Icon name={icon} size={20} />
                        </span>
                    )}
                    <h3>{title}</h3>
                    <button
                        className="btn-icon"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Close"
                    >
                        <Icon name="x" size={18} />
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-foot">{footer}</div>}
            </div>
        </div>
    );
}
