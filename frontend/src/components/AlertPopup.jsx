import { useEffect, useRef, useState } from "react";
import Icon from "./Icons";
import { LogoMark } from "./Logo";
import { timeAgo } from "../lib/format";
import "../styles/Notify.css";

const ALERT_SECONDS = 5;
const C = 2 * Math.PI * 19; // ring এর পরিধি (r = 19)

// Admin এর পাঠানো গুরুত্বপূর্ণ নোটিশের পপআপ।
// বন্ধ করা যায় না (backdrop/Esc কাজ করে না) — ৫ সেকেন্ড পর "OK" চাপলেই কেবল সরে।
// tab লুকানো থাকলে সময় গোনা থামে, যাতে সত্যিই পড়ার সময় পায়।
// preview = true হলে শুধু দেখার জন্য (Broadcast পেজের Preview), server এ কিছু যায় না।
export default function AlertPopup({ alert, queueLeft = 0, onAck, preview = false }) {
    const [left, setLeft] = useState(ALERT_SECONDS);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const boxRef = useRef(null);
    const okRef = useRef(null);

    useEffect(() => {
        const id = setInterval(() => {
            if (document.visibilityState !== "visible") return;
            setLeft(l => (l > 0 ? l - 1 : 0));
        }, 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        boxRef.current?.focus();
        try {
            navigator.vibrate?.([140, 70, 140]);
        } catch {
            /* সব ডিভাইসে নেই */
        }
        // Esc দিয়ে বন্ধ হবে না; Tab চাপলে ফোকাস পপআপের ভিতরেই থাকবে
        const onKey = e => {
            if (e.key === "Escape") e.preventDefault();
            if (e.key === "Tab") {
                e.preventDefault();
                (okRef.current && !okRef.current.disabled ? okRef.current : boxRef.current)?.focus();
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey, true);
        };
    }, []);

    async function ok() {
        if (left > 0 || busy) return;
        setBusy(true);
        setError("");
        try {
            await onAck();
        } catch (e) {
            setError(e?.message || "Couldn't confirm. Please try again.");
            setBusy(false);
        }
    }

    const ready = left === 0;

    return (
        <div className="ap-backdrop" role="presentation">
            <div
                ref={boxRef}
                className="ap-card"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="ap-title"
                aria-describedby="ap-msg"
                tabIndex={-1}
            >
                <div className="ap-bar" />
                <div className="ap-top">
                    <LogoMark size={38} />
                    <div className="ap-brand">
                        <b>
                            Email<span>Sender</span>
                        </b>
                        <small>{preview ? "Preview — only you can see this" : "Important notice"}</small>
                    </div>
                    <span className="ap-chip">
                        <Icon name="shield" size={13} /> Admin
                    </span>
                </div>

                <div className="ap-body">
                    <span className="ap-mega" aria-hidden="true">
                        <Icon name="megaphone" size={24} />
                    </span>
                    <h2 id="ap-title">{alert.title}</h2>
                    <p id="ap-msg" className="ap-msg">
                        {alert.body}
                    </p>
                    <div className="ap-meta">
                        From <b>{alert.senderName || "Admin"}</b>
                        {alert.createdAt && <> · {timeAgo(alert.createdAt)}</>}
                    </div>
                </div>

                {error && (
                    <p className="ap-err" role="alert">
                        {error}
                    </p>
                )}

                <div className="ap-foot">
                    <div className={`ap-ring ${ready ? "done" : ""}`} aria-hidden="true">
                        <svg viewBox="0 0 44 44" width="46" height="46">
                            <circle className="t" cx="22" cy="22" r="19" />
                            <circle
                                className="p"
                                cx="22"
                                cy="22"
                                r="19"
                                strokeDasharray={C}
                                strokeDashoffset={C * (1 - left / ALERT_SECONDS)}
                            />
                        </svg>
                        <span>{ready ? <Icon name="check" size={18} strokeWidth={3} /> : left}</span>
                    </div>
                    <button
                        ref={okRef}
                        type="button"
                        className="btn btn-primary ap-ok"
                        disabled={!ready || busy}
                        onClick={ok}
                    >
                        {busy ? <span className="spin" /> : ready ? "OK" : `OK · wait ${left}s`}
                    </button>
                </div>
                {queueLeft > 0 && (
                    <p className="ap-more">
                        {queueLeft} more {queueLeft === 1 ? "notice" : "notices"} after this one
                    </p>
                )}
            </div>
        </div>
    );
}
