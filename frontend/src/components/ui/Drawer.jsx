import { useEffect } from "react";
import Icon from "../Icons";

// subtitle = শিরোনামের নিচে ছোট লেখা, footer = নিচে আটকে থাকা বাটনের সারি (স্ক্রল হলেও দেখা যায়)
export default function Drawer({ open, onClose, title, subtitle, footer, children }) {
    useEffect(() => {
        if (!open) return;
        const onKey = e => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden"; // পেছনের পেজ স্ক্রল হবে না
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
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
                    <div className="drawer-title">
                        <h3>{title}</h3>
                        {subtitle && <small>{subtitle}</small>}
                    </div>
                    <button
                        className="btn-icon"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <Icon name="x" size={18} />
                    </button>
                </div>
                <div className="drawer-body">{children}</div>
                {footer && <div className="drawer-foot">{footer}</div>}
            </aside>
        </>
    );
}
