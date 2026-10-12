import { useState } from "react";
import useAsync from "../../hooks/useAsync";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Icon from "../../components/Icons";
import AlertPopup from "../../components/AlertPopup";
import ConfirmModal from "../../components/ui/ConfirmModal";
import { Badge, Callout, Empty, ErrorState, PageHead, Skeleton } from "../../components/ui/Bits";
import { getBroadcasts, getPushConfig, sendBroadcast } from "../../services/api";
import { EMAIL_RE, fmtDateTime, fmtNum, timeAgo } from "../../lib/format";
import "../../styles/Notify.css";

const AUDIENCES = [
    { id: "users", label: "All users", sub: "Every active user (not admins)" },
    { id: "everyone", label: "Everyone", sub: "All users and all admins" },
    { id: "admins", label: "Admins only", sub: "Admins and the Super Admin" },
    { id: "user", label: "One person", sub: "A single user by email" }
];
const labelOf = id => AUDIENCES.find(a => a.id === id)?.label || id;

const TITLE_MAX = 80;
const MSG_MAX = 500;

// POST /admin/broadcast · GET /admin/broadcast
// Admin + Super Admin দুজনেই সরাসরি পাঠাতে পারে। প্রাপক পায়: ফোনের notification bar + bell + ৫ সেকেন্ডের পপআপ
export default function Broadcast() {
    const { user } = useAuth();
    const toast = useToast();
    const [audience, setAudience] = useState("users");
    const [targetEmail, setTargetEmail] = useState("");
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [confirm, setConfirm] = useState(false);
    const [preview, setPreview] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const history = useAsync(signal => getBroadcasts(signal), []);
    const push = useAsync(() => getPushConfig().catch(() => null), []);

    const emailOk = audience !== "user" || EMAIL_RE.test(targetEmail.trim());
    const ready = title.trim().length >= 3 && message.trim().length >= 3 && emailOk;
    const current = AUDIENCES.find(a => a.id === audience);

    async function send() {
        setBusy(true);
        setError("");
        try {
            const res = await sendBroadcast({
                audience,
                targetEmail: audience === "user" ? targetEmail.trim() : undefined,
                title: title.trim(),
                message: message.trim()
            });
            setConfirm(false);
            toast.success(`Notice sent to ${fmtNum(res.recipientCount)} ${res.recipientCount === 1 ? "person" : "people"}.`);
            setTitle("");
            setMessage("");
            setTargetEmail("");
            history.reload();
        } catch (e) {
            setConfirm(false);
            setError(e.message);
        } finally {
            setBusy(false);
        }
    }

    const items = history.data?.items ?? [];

    return (
        <>
            <PageHead
                title="Broadcast"
                sub="Send an important notice. It reaches the phone notification bar, the bell, and a pop-up the person has to acknowledge."
            />

            {push.data && !push.data.enabled && (
                <div style={{ marginBottom: 16 }}>
                    <Callout tone="warn" icon="alert">
                        <p>
                            Phone push isn't set up on the server yet (VAPID keys are missing). The bell and the pop-up
                            still work, but nothing reaches the phone's notification bar until the keys are added.
                        </p>
                    </Callout>
                </div>
            )}

            <section className="card">
                <div className="card-head">
                    <div>
                        <h2>New notice</h2>
                        <p>People see a pop-up with your logo theme. The OK button unlocks after 5 seconds so they actually read it.</p>
                    </div>
                </div>
                <form
                    className="card-body form"
                    onSubmit={e => {
                        e.preventDefault();
                        if (ready) setConfirm(true);
                    }}
                >
                    {error && (
                        <Callout tone="danger" icon="alert">
                            {error}
                        </Callout>
                    )}

                    <div className="field">
                        <label className="label" htmlFor="bc-aud">
                            Send to
                        </label>
                        <select
                            id="bc-aud"
                            className="select"
                            value={audience}
                            onChange={e => setAudience(e.target.value)}
                        >
                            {AUDIENCES.map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.label} — {a.sub}
                                </option>
                            ))}
                        </select>
                    </div>

                    {audience === "user" && (
                        <div className="field">
                            <label className="label" htmlFor="bc-email">
                                Their email
                            </label>
                            <input
                                id="bc-email"
                                type="email"
                                className={`input ${targetEmail && !emailOk ? "is-error" : ""}`}
                                value={targetEmail}
                                onChange={e => setTargetEmail(e.target.value)}
                                autoComplete="off"
                                placeholder="name@example.com"
                            />
                        </div>
                    )}

                    <div className="field">
                        <label className="label" htmlFor="bc-title">
                            Title
                            <small className={`bc-counter ${title.length >= TITLE_MAX ? "max" : ""}`}>
                                {title.length}/{TITLE_MAX}
                            </small>
                        </label>
                        <input
                            id="bc-title"
                            className="input"
                            value={title}
                            maxLength={TITLE_MAX}
                            onChange={e => setTitle(e.target.value)}
                            autoComplete="off"
                            placeholder="e.g. Scheduled maintenance tonight"
                        />
                    </div>

                    <div className="field">
                        <label className="label" htmlFor="bc-msg">
                            Message
                            <small className={`bc-counter ${message.length >= MSG_MAX ? "max" : ""}`}>
                                {message.length}/{MSG_MAX}
                            </small>
                        </label>
                        <textarea
                            id="bc-msg"
                            className="textarea"
                            value={message}
                            maxLength={MSG_MAX}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="What happened, and what do people need to do?"
                        />
                    </div>

                    <div className="bc-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            disabled={title.trim().length < 1 || message.trim().length < 1}
                            onClick={() => setPreview(true)}
                        >
                            <Icon name="eye" size={15} /> Preview pop-up
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!ready || busy}>
                            <Icon name="megaphone" size={15} /> Send notice
                        </button>
                    </div>
                </form>
            </section>

            <section className="card" style={{ marginTop: 16 }}>
                <div className="card-head">
                    <div>
                        <h2>Sent notices</h2>
                        <p>How many people received each one, and how many have pressed OK.</p>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={history.reload} disabled={history.loading}>
                        <Icon name="refresh" size={14} /> Refresh
                    </button>
                </div>
                {history.loading && !history.data ? (
                    <div className="card-body col">
                        {[0, 1, 2].map(i => (
                            <Skeleton key={i} h={64} />
                        ))}
                    </div>
                ) : history.error && !history.data ? (
                    <ErrorState message={history.error} onRetry={history.reload} />
                ) : items.length === 0 ? (
                    <Empty icon="megaphone" title="No notices yet" text="Notices you send will be listed here." />
                ) : (
                    <div className="bc-list">
                        {items.map(a => (
                            <article key={a._id} className="bc-item">
                                <div className="row between" style={{ alignItems: "flex-start" }}>
                                    <h3>{a.title}</h3>
                                    <Badge tone="blue">
                                        {labelOf(a.audience)}
                                    </Badge>
                                </div>
                                <p>{a.message}</p>
                                <div className="bc-meta">
                                    <span>
                                        By <b>{a.senderName || "Admin"}</b>
                                    </span>
                                    <span title={fmtDateTime(a.createdAt)}>{timeAgo(a.createdAt)}</span>
                                    {a.targetEmail && <span>{a.targetEmail}</span>}
                                    <span>
                                        Delivered <b>{fmtNum(a.recipientCount)}</b>
                                    </span>
                                    <span>
                                        Phone <b>{fmtNum(a.pushSent)}</b>
                                    </span>
                                    <span>
                                        OK pressed{" "}
                                        <b>
                                            {fmtNum(a.acknowledged)}/{fmtNum(a.recipientCount)}
                                        </b>
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <ConfirmModal
                open={confirm}
                title="Send this notice?"
                confirmLabel="Send now"
                busy={busy}
                onConfirm={send}
                onCancel={() => setConfirm(false)}
                text={`This goes out right away to: ${
                    audience === "user" ? targetEmail.trim() || "one person" : current?.label
                }. Their phone gets a notification and a pop-up opens in the app that they must acknowledge. It can't be unsent.`}
            />

            {preview && (
                <AlertPopup
                    preview
                    alert={{
                        title: title.trim(),
                        body: message.trim(),
                        senderName: user?.fullName,
                        createdAt: new Date().toISOString()
                    }}
                    onAck={async () => setPreview(false)}
                />
            )}
        </>
    );
}
