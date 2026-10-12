import { useEffect, useState } from "react";
import Icon from "./Icons";
import useInstall from "../hooks/useInstall";
import { useToast } from "./Toast";
import "../styles/Pwa.css";

const DISMISS_KEY = "es-install-dismissed";
const DISMISS_DAYS = 14;

const dismissedRecently = () => {
    try {
        const t = Number(localStorage.getItem(DISMISS_KEY));
        return !!t && Date.now() - t < DISMISS_DAYS * 86400000;
    } catch {
        return false;
    }
};

// Console এর উপরে ব্যানার: "Email Sender কে অ্যাপ হিসেবে install করো"
export function InstallPrompt() {
    const { installed, canInstall, ios, install } = useInstall();
    const toast = useToast();
    const [hidden, setHidden] = useState(dismissedRecently);
    const [busy, setBusy] = useState(false);

    if (installed || hidden || (!canInstall && !ios)) return null;

    function later() {
        try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
        } catch {
            /* ইগনোর */
        }
        setHidden(true);
    }

    async function go() {
        setBusy(true);
        const outcome = await install();
        setBusy(false);
        if (outcome === "accepted") toast.success("Email Sender is being added to your device.");
    }

    return (
        <div className="pwa-banner" role="region" aria-label="Install app">
            <span className="pwa-ic">
                <Icon name="download" size={20} />
            </span>
            <div className="pwa-text">
                <b>Install Email Sender</b>
                {ios ? (
                    <>
                        Add it to your Home Screen for a full-screen app experience.
                        <ol className="pwa-steps">
                            <li>
                                Tap the <b>Share</b> button in Safari.
                            </li>
                            <li>
                                Choose <b>Add to Home Screen</b>.
                            </li>
                        </ol>
                    </>
                ) : (
                    "Open it like a real app from your home screen — full screen, faster, with notifications."
                )}
            </div>
            <div className="pwa-actions">
                {!ios && (
                    <button className="btn btn-primary btn-sm" onClick={go} disabled={busy}>
                        {busy ? <span className="spin" /> : "Install"}
                    </button>
                )}
                <button className="btn btn-ghost btn-sm" onClick={later} disabled={busy}>
                    {ios ? "Got it" : "Not now"}
                </button>
            </div>
        </div>
    );
}

// ইউজার মেনুর ভেতরে "Install app" লাইন (শুধু install করা সম্ভব হলে)
export function InstallMenuItem({ onDone }) {
    const { installed, canInstall, install } = useInstall();
    if (installed || !canInstall) return null;
    return (
        <button
            className="menu-item"
            onClick={async () => {
                await install();
                onDone?.();
            }}
        >
            <Icon name="download" size={16} /> Install app
        </button>
    );
}

// ইন্টারনেট চলে গেলে উপরে ছোট বার, ফিরলে "Back online" দেখিয়ে সরে যায়
export function OfflineBar() {
    const [online, setOnline] = useState(() => navigator.onLine);
    const [back, setBack] = useState(false);

    useEffect(() => {
        let timer;
        const on = () => {
            setOnline(true);
            setBack(true);
            clearTimeout(timer);
            timer = setTimeout(() => setBack(false), 2500);
        };
        const off = () => {
            clearTimeout(timer);
            setBack(false);
            setOnline(false);
        };
        window.addEventListener("online", on);
        window.addEventListener("offline", off);
        return () => {
            window.removeEventListener("online", on);
            window.removeEventListener("offline", off);
            clearTimeout(timer);
        };
    }, []);

    if (online && !back) return null;
    return (
        <div className={`pwa-net ${online ? "ok" : "off"}`} role="status" aria-live="polite">
            <Icon name={online ? "check" : "globe"} size={14} />
            {online ? "Back online" : "You're offline — some things won't load until you reconnect."}
        </div>
    );
}
