import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
    getAdminDirectory,
    getAdminEmails,
    getAdminLoginHistory
} from "../../services/api";
import useAsync from "../../hooks/useAsync";
import Avatar from "../../components/Avatar";
import Icon from "../../components/Icons";
import EmailDetailDrawer from "../../components/ui/EmailDetail";
import {
    Badge,
    Callout,
    CopyButton,
    Empty,
    ErrorState,
    PageHead,
    RoleBadge,
    Skeleton
} from "../../components/ui/Bits";
import { fmtDate, fmtNum, maskKey, timeAgo } from "../../lib/format";

const TABS = [
    { id: "keys", label: "Emails & API keys", icon: "key" },
    { id: "emails", label: "Sent emails", icon: "inbox" },
    { id: "logins", label: "Login history", icon: "clock" }
];
const PAGE_SIZE = 15;

// তারিখ + সময় সেকেন্ড সহ (login এর timestamp)
const stampFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
});
const fmtStamp = d => (d ? stampFmt.format(new Date(d)) : "—");

// টাইপ করা থামলে তবেই search চলবে (প্রতি অক্ষরে request যাবে না)
function useDebounced(value, ms = 350) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setV(value), ms);
        return () => clearTimeout(id);
    }, [value, ms]);
    return v;
}

// GET /admin/directory · GET /admin/login-history — Admin + Super Admin দুজনেই দেখতে পারে
export default function AdminDirectory() {
    const [sp] = useSearchParams();
    const urlTab = sp.get("tab");
    const [tab, setTab] = useState(
        TABS.some(t => t.id === urlTab) ? urlTab : "keys"
    );
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(1);
    const [open, setOpen] = useState(null);
    const search = useDebounced(q.trim());

    // নোটিফিকেশন থেকে ?tab=emails দিয়ে এলে সেই ট্যাব খোলা
    useEffect(() => {
        if (TABS.some(t => t.id === urlTab)) setTab(urlTab);
    }, [urlTab]);

    // tab বা search বদলালে প্রথম পাতায় ফেরা
    useEffect(() => setPage(1), [tab, search, status]);

    const { data, loading, error, reload } = useAsync(
        signal => {
            const params = { page, limit: PAGE_SIZE };
            if (search) params.q = search;
            if (tab === "emails") {
                if (status !== "all") params.status = status;
                return getAdminEmails(params, signal);
            }
            return tab === "keys"
                ? getAdminDirectory(params, signal)
                : getAdminLoginHistory(params, signal);
        },
        [tab, search, page, status]
    );

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = data?.totalPages ?? 1;

    return (
        <>
            <PageHead
                title="Keys & logins"
                sub="Every user's email, API keys and sign-in history."
            >
                <button
                    className="btn btn-secondary"
                    onClick={reload}
                    disabled={loading}
                >
                    <Icon name="refresh" size={15} /> Refresh
                </button>
            </PageHead>

            <div className="stack">
                <Callout icon="shield">
                    <p>
                        This page shows private data. API keys are hidden until
                        you press the eye icon. Never share them.
                    </p>
                </Callout>

                <section className="card">
                    <div className="tabs" role="tablist" style={{ padding: "0 8px" }}>
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                role="tab"
                                aria-selected={tab === t.id}
                                className={`tab-btn ${tab === t.id ? "active" : ""}`}
                                onClick={() => setTab(t.id)}
                            >
                                <Icon name={t.icon} size={15} /> {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="toolbar">
                        <div className="search">
                            <Icon name="search" size={16} />
                            <input
                                className="input"
                                placeholder={
                                    tab === "keys"
                                        ? "Search name, email, username or API key"
                                        : tab === "emails"
                                          ? "Search sender, subject, message, user or IP"
                                          : "Search name, email or IP address"
                                }
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                aria-label="Search"
                            />
                        </div>
                        {tab === "emails" && (
                            <select
                                className="select sm"
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                aria-label="Filter by status"
                            >
                                <option value="all">All statuses</option>
                                <option value="sent">Sent</option>
                                <option value="pending">Delivering</option>
                                <option value="failed">Failed</option>
                            </select>
                        )}
                        <span className="muted" style={{ fontSize: 13 }}>
                            {loading && !data
                                ? "Loading…"
                                : tab === "keys"
                                  ? `${fmtNum(total)} user${total === 1 ? "" : "s"}`
                                  : tab === "emails"
                                    ? `${fmtNum(total)} email${total === 1 ? "" : "s"}`
                                    : `${fmtNum(total)} sign-in${total === 1 ? "" : "s"}`}
                        </span>
                    </div>

                    {loading && !data ? (
                        <div className="card-body col">
                            {[0, 1, 2, 3].map(i => (
                                <Skeleton key={i} h={56} />
                            ))}
                        </div>
                    ) : error && !data ? (
                        <ErrorState message={error} onRetry={reload} />
                    ) : items.length === 0 ? (
                        <Empty
                            icon={
                                tab === "keys"
                                    ? "users"
                                    : tab === "emails"
                                      ? "inbox"
                                      : "clock"
                            }
                            title={
                                tab === "keys"
                                    ? "No users found"
                                    : tab === "emails"
                                      ? "No emails found"
                                      : "No sign-ins found"
                            }
                            text={
                                search || status !== "all"
                                    ? "Try a different search or filter."
                                    : tab === "keys"
                                      ? "Users will appear here once they register."
                                      : tab === "emails"
                                        ? "Emails sent through any user's API key will show up here."
                                        : "Sign-ins are recorded from now on."
                            }
                        />
                    ) : tab === "keys" ? (
                        <ul className="dir-list">
                            {items.map(u => (
                                <UserBlock key={u._id} u={u} />
                            ))}
                        </ul>
                    ) : tab === "emails" ? (
                        <>
                            <div className="mail-stats">
                                <Badge tone="green" dot>
                                    {fmtNum(data?.sent ?? 0)} sent
                                </Badge>
                                <Badge tone="red" dot>
                                    {fmtNum(data?.failed ?? 0)} failed
                                </Badge>
                            </div>
                            <EmailTable items={items} onOpen={setOpen} />
                        </>
                    ) : (
                        <LoginTable items={items} />
                    )}

                    {total > PAGE_SIZE && (
                        <div className="pager">
                            <span>
                                Page {page} of {totalPages}
                            </span>
                            <div className="row-wrap" style={{ gap: 8 }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={page <= 1 || loading}
                                    onClick={() => setPage(p => p - 1)}
                                >
                                    <Icon name="chevronLeft" size={14} /> Prev
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={page >= totalPages || loading}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Next <Icon name="chevronRight" size={14} />
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                <EmailDetailDrawer
                    onClose={() => setOpen(null)}
                    m={
                        open && {
                            id: open._id,
                            subject: open.subject,
                            status: open.status,
                            createdAt: open.createdAt,
                            senderName: open.senderName,
                            senderEmail: open.senderEmail,
                            receiverEmail: open.receiverEmail,
                            message: open.message || "",
                            ipAddress: open.ipAddress,
                            sourceUrl: open.sourceUrl,
                            apiKeyName: open.apiKeyName,
                            owner: open.owner || null
                        }
                    }
                />

                {tab === "logins" && (
                    <p className="muted" style={{ fontSize: 12.5 }}>
                        The latest sign-ins of each user are kept (up to 20 per
                        user), newest first.
                    </p>
                )}
            </div>
        </>
    );
}

// একজন ইউজার: নাম, email, role, status + তার সব API key
function UserBlock({ u }) {
    const [shown, setShown] = useState({});
    const keys = u.apiKeys || [];

    return (
        <li className="dir-user">
            <div className="dir-head">
                <div className="cell-user" style={{ flex: 1, minWidth: 0 }}>
                    <Avatar src={u.avatar} name={u.fullName} size={38} />
                    <div style={{ minWidth: 0 }}>
                        <b className="truncate">{u.fullName}</b>
                        <small className="truncate">
                            @{u.username} · joined {fmtDate(u.createdAt)}
                        </small>
                    </div>
                </div>
                <div className="row-wrap" style={{ gap: 6 }}>
                    <RoleBadge user={u} />
                    {u.isBlocked && (
                        <Badge tone="red" dot>
                            Blocked
                        </Badge>
                    )}
                </div>
            </div>

            <div className="dir-email">
                <Icon name="mail" size={15} />
                <span className="truncate">{u.email}</span>
                <CopyButton
                    text={u.email}
                    label="Copy"
                    successMsg="Email copied"
                />
            </div>

            {keys.length === 0 ? (
                <p className="muted dir-nokey">No API keys yet.</p>
            ) : (
                <ul className="dir-keys">
                    {keys.map(k => (
                        <li key={k._id}>
                            <div className="dir-key-name">
                                <b className="truncate">{k.name}</b>
                                <small className="muted">
                                    {fmtNum(k.usageCount)} emails ·{" "}
                                    {fmtDate(k.createdAt)}
                                </small>
                            </div>
                            <div className="keybox">
                                <span title="API key">
                                    {shown[k._id] ? k.key : maskKey(k.key)}
                                </span>
                                <button
                                    className="btn-icon"
                                    style={{ width: 28, height: 28 }}
                                    onClick={() =>
                                        setShown(s => ({
                                            ...s,
                                            [k._id]: !s[k._id]
                                        }))
                                    }
                                    aria-label={
                                        shown[k._id] ? "Hide key" : "Show key"
                                    }
                                >
                                    <Icon
                                        name={shown[k._id] ? "eyeOff" : "eye"}
                                        size={15}
                                    />
                                </button>
                            </div>
                            <div className="row-wrap" style={{ gap: 6 }}>
                                <Badge tone={k.isActive ? "green" : "amber"} dot>
                                    {k.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <CopyButton
                                    text={k.key}
                                    label="Copy"
                                    successMsg="API key copied"
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </li>
    );
}

// সব login: ইউজার, IP address, সময় (সেকেন্ড সহ)
function LoginTable({ items }) {
    return (
        <div className="table-wrap">
            <table className="table stack">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>IP address</th>
                        <th>Signed in</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((r, i) => (
                        <tr key={`${r.userId}-${r.loginTime}-${i}`}>
                            <td className="cell-main">
                                <div className="cell-user">
                                    <Avatar
                                        src={r.avatar}
                                        name={r.fullName}
                                        size={34}
                                    />
                                    <div style={{ minWidth: 0 }}>
                                        <b className="truncate">
                                            {r.fullName}
                                        </b>
                                        <small className="truncate">
                                            @{r.username} · {r.email}
                                        </small>
                                    </div>
                                </div>
                            </td>
                            <td data-label="IP address">
                                <span className="mono">
                                    {r.ipAddress || "unknown"}
                                </span>
                            </td>
                            <td data-label="Signed in" className="nowrap">
                                {fmtStamp(r.loginTime)}
                                <small
                                    className="muted"
                                    style={{ display: "block" }}
                                >
                                    {timeAgo(r.loginTime)}
                                </small>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// সব ইউজারের email: sender, কার API key এ এসেছে, status, সময়
function EmailTable({ items, onOpen }) {
    return (
        <div className="table-wrap">
            <table className="table stack">
                <thead>
                    <tr>
                        <th>Sender</th>
                        <th>Subject</th>
                        <th>Received by</th>
                        <th>Status</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(m => (
                        <tr
                            key={m._id}
                            className="clickable"
                            onClick={() => onOpen(m)}
                        >
                            <td className="cell-main">
                                <div style={{ minWidth: 0 }}>
                                    <b className="truncate">{m.senderName}</b>
                                    <small className="truncate" style={{ display: "block" }}>
                                        {m.senderEmail}
                                    </small>
                                </div>
                            </td>
                            <td data-label="Subject">
                                <span
                                    className="truncate"
                                    style={{ display: "block", maxWidth: 240 }}
                                >
                                    {m.subject || "—"}
                                </span>
                            </td>
                            <td data-label="Received by">
                                {m.owner ? (
                                    <div className="cell-user">
                                        <Avatar
                                            src={m.owner.avatar}
                                            name={m.owner.fullName}
                                            size={28}
                                        />
                                        <div style={{ minWidth: 0 }}>
                                            <b className="truncate">{m.owner.fullName}</b>
                                            <small className="truncate">
                                                {m.owner.email}
                                            </small>
                                        </div>
                                    </div>
                                ) : (
                                    <span className="muted">Deleted user</span>
                                )}
                            </td>
                            <td data-label="Status">
                                <Badge
                                    tone={m.status === "sent" ? "green" : m.status === "failed" ? "red" : "amber"}
                                    dot
                                >
                                    {m.status === "sent" ? "Sent" : m.status === "failed" ? "Failed" : "Delivering"}
                                </Badge>
                            </td>
                            <td data-label="Time" className="nowrap">
                                {fmtStamp(m.createdAt)}
                                <small className="muted" style={{ display: "block" }}>
                                    {timeAgo(m.createdAt)}
                                </small>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
