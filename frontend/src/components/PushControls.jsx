import { useState } from "react";
import Icon from "./Icons";
import usePush from "../hooks/usePush";
import "../styles/Notify.css";

const DISMISS_KEY = "es-push-dismissed";
const DISMISS_DAYS = 7;

const dismissedRecently = () => {
    try {
        const t = Number(localStorage.getItem(DISMISS_KEY));
        return t && Date.now() - t < DISMISS_DAYS * 86400000;
    } catch {
        return false;
    }
};

function InstallSteps() {
    return (
        <ol className="pc-steps">
            <li>
                Open this site in <b>Safari</b> and tap the <b>Share</b> button.
            </li>
            <li>
                Choose <b>Add to Home Screen</b>.
            </li>
            <li>Open Email Sender from your home screen, then turn on notifications.</li>
        </ol>
    );
}

// Console এর উপরে ছোট ব্যানার: "ফোনে notification চালু করো" (বন্ধ করে দিলে ৭ দিন আর আসে না)
export function PushPrompt() {
    const p = usePush();
    const [hidden, setHidden] = useState(dismissedRecently);

    if (!p.ready || hidden || p.subscribed) return null;
    if (p.permission === "denied" || (!p.supported && !p.install)) return null;

    function later() {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            /* ইগনোর */
        }
        setHidden(true);
    }

    // iPhone: আগে Home Screen এ যোগ করতে হবে
    if (p.install) {
        return (
            <div className="pc-banner" role="region" aria-label="Phone notifications">
                <span className="pc-ic">
                    <Icon name="bell" size={19} />
                </span>
                <div className="pc-text">
                    <b>Get alerts on your iPhone</b>
                    Apple only allows notifications for apps added to the Home Screen.
                    <InstallSteps />
                </div>
                <div className="pc-actions">
                    <button className="btn btn-secondary btn-sm" onClick={later}>
                        Got it
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="pc-banner" role="region" aria-label="Phone notifications">
            <span className="pc-ic">
                <Icon name="bell" size={19} />
            </span>
            <div className="pc-text">
                <b>Get alerts on your phone</b>
                New emails, approvals and admin notices will show in your notification bar, even when the app is closed.
            </div>
            <div className="pc-actions">
                <button className="btn btn-primary btn-sm" onClick={p.enable} disabled={p.busy}>
                    {p.busy ? <span className="spin" /> : "Turn on"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={later} disabled={p.busy}>
                    Not now
                </button>
            </div>
        </div>
    );
}

// Notifications পেজের কার্ড: অবস্থা + চালু/বন্ধ + টেস্ট
export function PushCard() {
    const p = usePush();
    if (!p.ready) return null;

    let badge = <span className="pc-state">Off</span>;
    let title = "Phone notifications";
    let text = "See new emails, approvals and admin notices in your phone's notification bar.";
    let action = null;
    let extra = null;

    if (p.install) {
        badge = <span className="pc-state">Needs install</span>;
        text = "On iPhone and iPad, add Email Sender to your Home Screen first.";
        extra = <InstallSteps />;
    } else if (!p.supported) {
        badge = <span className="pc-state bad">Not supported</span>;
        text = "This browser can't show phone notifications. Try Chrome, Edge, Firefox or Safari (iOS 16.4+).";
    } else if (p.permission === "denied") {
        badge = <span className="pc-state bad">Blocked</span>;
        text = "Notifications are blocked for this site. Allow them in your browser's site settings, then reload.";
    } else if (p.subscribed) {
        badge = (
            <span className="pc-state on">
                <Icon name="check" size={12} strokeWidth={3} /> On
            </span>
        );
        text = "This device will get alerts in the notification bar, even when the app is closed.";
        action = (
            <>
                <button className="btn btn-secondary btn-sm" onClick={p.test} disabled={p.busy}>
                    Send test
                </button>
                <button className="btn btn-ghost btn-sm" onClick={p.disable} disabled={p.busy}>
                    Turn off
                </button>
            </>
        );
    } else {
        action = (
            <button className="btn btn-primary btn-sm" onClick={p.enable} disabled={p.busy}>
                {p.busy ? <span className="spin" /> : "Turn on"}
            </button>
        );
    }

    return (
        <section className="card pc-card">
            <div className="pc-row">
                <span className="pc-ic">
                    <Icon name="bell" size={19} />
                </span>
                <div className="pc-text">
                    <b>
                        {title} {badge}
                    </b>
                    {text}
                    {extra}
                </div>
                {action && <div className="pc-actions">{action}</div>}
            </div>
        </section>
    );
}
