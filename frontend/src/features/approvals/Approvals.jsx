import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    approveApproval,
    denyApproval,
    getAdminUsers,
    listApprovals
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import useAsync from "../../hooks/useAsync";
import { useToast } from "../../components/Toast";
import Icon from "../../components/Icons";
import Modal from "../../components/ui/Modal";
import PasswordField from "../../components/ui/PasswordField";
import {
    Badge,
    Callout,
    Empty,
    ErrorState,
    PageHead,
    Skeleton
} from "../../components/ui/Bits";
import { ACTION_LABEL } from "../../lib/approvals";
import { fmtDateTime, timeAgo } from "../../lib/format";

const STATUS_TONE = {
    pending: "amber",
    approved: "green",
    denied: "red",
    used: "",
    expired: ""
};

// অনুমতি পাওয়ার পর কোন পেজে গিয়ে কাজটা করতে হবে
const USE_PATH = {
    create_admin: "/admin/create-admin",
    make_admin: "/admin/users",
    remove_admin: "/admin/users",
    block_admin: "/admin/users",
    delete_admin: "/admin/users",
    kill_switch: "/kill-switch"
};

// GET /approvals?status= · PATCH /approvals/:id/approve · PATCH /approvals/:id/deny
export default function Approvals() {
    const { user } = useAuth();
    const toast = useToast();
    const isSuper = !!user?.isSuperAdmin;
    const [status, setStatus] = useState(isSuper ? "pending" : "");
    const { data, loading, error, reload } = useAsync(
        async signal => {
            const [list, users] = await Promise.all([
                listApprovals(status, signal),
                // user id কে নামে বদলাতে (না পেলেও সমস্যা নেই)
                getAdminUsers(signal).catch(() => [])
            ]);
            return { list, users: Array.isArray(users) ? users : [] };
        },
        [status]
    );
    const [approving, setApproving] = useState(null);
    const [denying, setDenying] = useState(null);

    // Super Admin এর জন্য নতুন request নিজে থেকে আসবে
    useEffect(() => {
        if (!isSuper) return;
        const id = setInterval(() => {
            if (!document.hidden) reload();
        }, 30000);
        return () => clearInterval(id);
    }, [isSuper, reload]);

    const list = useMemo(() => data?.list || [], [data]);

    const targetText = a => {
        if (a.action === "kill_switch") return a.target.split(",").join(", ");
        if (a.action === "create_admin" || a.action === "make_admin")
            return a.target;
        const u = data?.users.find(x => x._id === a.target);
        return u ? `${u.fullName} (${u.email})` : a.target;
    };

    return (
        <>
            <PageHead
                title="Approvals"
                sub={
                    isSuper
                        ? "Admins ask you before doing extra actions. Approve with your password."
                        : "Extra actions need the Super Admin's permission. Your requests show here."
                }
            >
                <select
                    className="select sm"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    aria-label="Filter by status"
                    style={{ width: "auto" }}
                >
                    <option value="">All requests</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="denied">Denied</option>
                    <option value="used">Used</option>
                </select>
                <button
                    className="btn btn-secondary"
                    onClick={reload}
                    disabled={loading}
                >
                    <Icon name="refresh" size={15} /> Refresh
                </button>
            </PageHead>

            {!isSuper && (
                <div style={{ marginBottom: 16 }}>
                    <Callout icon="info">
                        <p>
                            After the Super Admin approves, the permission works{" "}
                            <b>once</b> and expires in <b>30 minutes</b>. Open
                            the action page again and repeat the action.
                        </p>
                    </Callout>
                </div>
            )}

            <section className="card">
                {loading && !data ? (
                    <div className="card-body col">
                        {[0, 1, 2].map(i => (
                            <Skeleton key={i} h={52} />
                        ))}
                    </div>
                ) : error && !data ? (
                    <ErrorState message={error} onRetry={reload} />
                ) : list.length === 0 ? (
                    <Empty
                        icon="shieldCheck"
                        title="No requests here"
                        text={
                            isSuper
                                ? "When an admin asks for permission, it will appear here."
                                : "When you ask for permission to do an extra action, it will appear here."
                        }
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table stack">
                            <thead>
                                <tr>
                                    <th>Request</th>
                                    {isSuper && <th>Requested by</th>}
                                    <th>Status</th>
                                    <th>Sent</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {list.map(a => {
                                    const st = a.expired ? "expired" : a.status;
                                    const open =
                                        a.status === "pending" && !a.expired;
                                    const usable =
                                        a.status === "approved" && !a.expired;
                                    return (
                                        <tr key={a._id}>
                                            <td className="cell-main">
                                                <b>
                                                    {ACTION_LABEL[a.action] ||
                                                        a.action}
                                                </b>
                                                <div
                                                    className="help truncate"
                                                    style={{ maxWidth: 360 }}
                                                >
                                                    {targetText(a)}
                                                </div>
                                                {a.reason && (
                                                    <div
                                                        className="help"
                                                        style={{
                                                            maxWidth: 360
                                                        }}
                                                    >
                                                        “{a.reason}”
                                                    </div>
                                                )}
                                                {a.status === "denied" &&
                                                    a.note && (
                                                        <div className="help err">
                                                            Reply: {a.note}
                                                        </div>
                                                    )}
                                            </td>
                                            {isSuper && (
                                                <td data-label="Requested by">
                                                    <div className="cell-user">
                                                        <div
                                                            style={{
                                                                minWidth: 0
                                                            }}
                                                        >
                                                            <b className="truncate">
                                                                {a.requestedBy
                                                                    ?.fullName ||
                                                                    "—"}
                                                            </b>
                                                            <small className="truncate">
                                                                {
                                                                    a
                                                                        .requestedBy
                                                                        ?.email
                                                                }
                                                            </small>
                                                        </div>
                                                    </div>
                                                </td>
                                            )}
                                            <td data-label="Status">
                                                <Badge
                                                    tone={STATUS_TONE[st]}
                                                    dot
                                                >
                                                    {st
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        st.slice(1)}
                                                </Badge>
                                                {usable && (
                                                    <div className="help">
                                                        Use before{" "}
                                                        {fmtDateTime(
                                                            a.expiresAt
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td
                                                data-label="Sent"
                                                className="nowrap muted"
                                            >
                                                {timeAgo(a.createdAt)}
                                            </td>
                                            <td className="cell-actions">
                                                <div
                                                    className="row"
                                                    style={{
                                                        justifyContent:
                                                            "flex-end"
                                                    }}
                                                >
                                                    {isSuper && open && (
                                                        <>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() =>
                                                                    setDenying(
                                                                        a
                                                                    )
                                                                }
                                                            >
                                                                Deny
                                                            </button>
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() =>
                                                                    setApproving(
                                                                        a
                                                                    )
                                                                }
                                                            >
                                                                Approve
                                                            </button>
                                                        </>
                                                    )}
                                                    {!isSuper && usable && (
                                                        <Link
                                                            to={
                                                                USE_PATH[
                                                                    a.action
                                                                ] ||
                                                                "/admin/stats"
                                                            }
                                                            className="btn btn-primary btn-sm"
                                                        >
                                                            Use it{" "}
                                                            <Icon
                                                                name="arrowRight"
                                                                size={14}
                                                            />
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ApproveModal
                item={approving}
                targetText={approving ? targetText(approving) : ""}
                onClose={() => setApproving(null)}
                onDone={() => {
                    setApproving(null);
                    reload();
                }}
                toast={toast}
            />
            <DenyModal
                item={denying}
                targetText={denying ? targetText(denying) : ""}
                onClose={() => setDenying(null)}
                onDone={() => {
                    setDenying(null);
                    reload();
                }}
                toast={toast}
            />
        </>
    );
}

function ApproveModal({ item, targetText, onClose, onDone, toast }) {
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    async function submit(e) {
        e?.preventDefault();
        if (!password) return;
        setError("");
        setBusy(true);
        try {
            await approveApproval(item._id, password);
            toast.success("Approved. It works once for the next 30 minutes");
            setPassword("");
            onDone();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    function close() {
        setPassword("");
        setError("");
        onClose();
    }

    if (!item) return null;
    return (
        <Modal
            open
            onClose={close}
            busy={busy}
            title="Approve this request"
            icon="shieldCheck"
            tone="ok"
            footer={
                <>
                    <button
                        className="btn btn-secondary"
                        onClick={close}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={submit}
                        disabled={busy || !password}
                    >
                        {busy ? <span className="spin" /> : "Approve"}
                    </button>
                </>
            }
        >
            <p>
                <b>{ACTION_LABEL[item.action] || item.action}</b> requested by{" "}
                <b>{item.requestedBy?.fullName}</b>.
            </p>
            <p className="muted">
                Target: <span className="inline-code">{targetText}</span>
            </p>
            {item.reason && <p className="muted">Reason: “{item.reason}”</p>}
            <form onSubmit={submit} className="form">
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}
                <PasswordField
                    id="ap-password"
                    label="Your password"
                    value={password}
                    onChange={setPassword}
                    autoFocus
                    hint="Enter your Super Admin password to confirm."
                />
            </form>
        </Modal>
    );
}

function DenyModal({ item, targetText, onClose, onDone, toast }) {
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit() {
        setBusy(true);
        try {
            await denyApproval(item._id, note.trim());
            toast.info("Request denied");
            setNote("");
            onDone();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusy(false);
        }
    }

    if (!item) return null;
    return (
        <Modal
            open
            onClose={onClose}
            busy={busy}
            title="Deny this request"
            icon="ban"
            tone="danger"
            footer={
                <>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-danger"
                        onClick={submit}
                        disabled={busy}
                    >
                        {busy ? <span className="spin" /> : "Deny request"}
                    </button>
                </>
            }
        >
            <p>
                <b>{ACTION_LABEL[item.action] || item.action}</b> requested by{" "}
                <b>{item.requestedBy?.fullName}</b>.
            </p>
            <p className="muted">
                Target: <span className="inline-code">{targetText}</span>
            </p>
            <div className="field">
                <label className="label" htmlFor="deny-note">
                    Note to the admin{" "}
                    <small>optional · max 300 characters</small>
                </label>
                <textarea
                    id="deny-note"
                    className="textarea"
                    maxLength={300}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Why was it denied?"
                />
            </div>
        </Modal>
    );
}
