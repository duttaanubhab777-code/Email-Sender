import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSystemStatus } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icons";
import ThemeToggle from "../../components/ThemeToggle";
import Splash from "../../components/ui/Splash";
import { fmtDateTime, mmss } from "../../lib/format";

const POLL_MS = 4000;

// GET /api/v1/system/status (public). Kill switch চালু থাকলে এটাই একমাত্র খোলা route।
export default function SystemStatus() {
    const { user } = useAuth();
    const [status, setStatus] = useState(null); // সর্বশেষ উত্তর
    const [offline, setOffline] = useState(false);
    const [syncAt, setSyncAt] = useState(Date.now()); // কখন উত্তর এসেছিল
    const [now, setNow] = useState(Date.now());
    const [total, setTotal] = useState(0); // দেখা সবচেয়ে বড় remainingSeconds (progress bar এর জন্য)
    const [wasActive, setWasActive] = useState(false);

    // ৪ সেকেন্ড পর পর server এর সাথে মিলিয়ে নেয়
    useEffect(() => {
        let alive = true;
        const ctrl = new AbortController();
        const load = async () => {
            try {
                const s = await getSystemStatus(ctrl.signal);
                if (!alive) return;
                setStatus(s);
                setOffline(false);
                setSyncAt(Date.now());
                if (s?.active) {
                    setWasActive(true);
                    setTotal(t => Math.max(t, s.remainingSeconds || 0));
                }
            } catch (err) {
                if (!alive || err.name === "AbortError") return;
                setOffline(true);
            }
        };
        load();
        const id = setInterval(load, POLL_MS);
        return () => {
            alive = false;
            ctrl.abort();
            clearInterval(id);
        };
    }, []);

    // প্রতি সেকেন্ডে timer এগোয় (server কে প্রতি সেকেন্ডে ডাকা হয় না)
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    if (!status && !offline) return <Splash text="Checking system status…" />;

    const active = !!status?.active;
    const remaining = active
        ? Math.max(
              0,
              (status.remainingSeconds || 0) - Math.floor((now - syncAt) / 1000)
          )
        : 0;
    const wiping = active && (status.status === "executing" || remaining === 0);
    const [mm, ss] = mmss(remaining);
    const elapsedPct =
        total > 0 ? Math.min(100, ((total - remaining) / total) * 100) : 0;
    const home = user ? "/users/dashboard" : "/users/login";

    let body;
    if (offline && !active) {
        body = (
            <>
                <span className="big-ic">
                    <Icon name="alert" size={34} />
                </span>
                <h1>
                    {wasActive
                        ? "The server has stopped"
                        : "Can't reach the server"}
                </h1>
                <p>
                    {wasActive
                        ? "The shutdown finished and the server is not responding. It may be restarting. This page keeps checking automatically."
                        : "Check your connection or try again in a moment. This page keeps checking automatically."}
                </p>
            </>
        );
    } else if (active) {
        body = (
            <>
                <span className="big-ic">
                    <Icon name="power" size={34} />
                </span>
                <h1>
                    {wiping
                        ? "Wiping data now…"
                        : "The system is shutting down"}
                </h1>
                <div
                    className="countdown"
                    role="timer"
                    aria-label={`${mm} minutes ${ss} seconds left`}
                >
                    <span>{mm}</span>
                    <span className="sep">:</span>
                    <span>{ss}</span>
                </div>
                <div
                    className="meter"
                    role="progressbar"
                    aria-valuenow={Math.round(elapsedPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                >
                    <i style={{ width: `${elapsedPct}%` }} />
                </div>
                <p>
                    {wiping
                        ? "The wipe is running. This page will update when the system is back."
                        : "All services are stopped. When the timer ends, the selected data is permanently deleted. This cannot be cancelled."}
                </p>
                <div className="sys-facts">
                    <span className="pill-stat">
                        <Icon name="clock" size={13} /> Ends{" "}
                        {fmtDateTime(status.endsAt)}
                    </span>
                    <span className="pill-stat">
                        <Icon name="activity" size={13} />{" "}
                        {wiping ? "executing" : "armed"}
                    </span>
                </div>
            </>
        );
    } else if (wasActive) {
        body = (
            <>
                <span className="big-ic">
                    <Icon name="checkCircle" size={34} />
                </span>
                <h1>The system has restarted fresh</h1>
                <p>
                    The wipe is finished. Everything you chose to delete is
                    gone. You can create a new account to start again.
                </p>
                <div className="row-wrap" style={{ justifyContent: "center" }}>
                    {/* পুরো page reload, যাতে পুরনো login state না থাকে */}
                    <a
                        href="/users/register"
                        className="btn btn-primary btn-lg"
                    >
                        Create an account
                    </a>
                    <a href="/users/login" className="btn btn-secondary btn-lg">
                        Sign in
                    </a>
                </div>
            </>
        );
    } else {
        body = (
            <>
                <span className="big-ic">
                    <Icon name="checkCircle" size={34} />
                </span>
                <h1>All systems operational</h1>
                <p>
                    Email Sender is running normally. There is no shutdown
                    scheduled.
                </p>
                <Link to={home} className="btn btn-primary btn-lg">
                    {user ? "Back to dashboard" : "Go to sign in"}
                </Link>
            </>
        );
    }

    return (
        <div className={`sys ${active || (offline && wasActive) ? "hot" : ""}`}>
            <div
                style={{
                    position: "fixed",
                    top: "calc(14px + env(safe-area-inset-top))",
                    right: 14
                }}
            >
                <ThemeToggle />
            </div>
            <div className="sys-card">{body}</div>
        </div>
    );
}
