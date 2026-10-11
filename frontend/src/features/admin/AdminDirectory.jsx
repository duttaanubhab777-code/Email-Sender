import { useEffect, useState } from "react";
import { getAdminDirectory, getAdminLoginHistory } from "../../services/api";
import useAsync from "../../hooks/useAsync";
import Avatar from "../../components/Avatar";
import Icon from "../../components/Icons";
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
    const [tab, setTab] = useState("keys");
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const search = useDebounced(q.trim());

    // tab বা search বদলালে প্রথম পাতায় ফেরা
    useEffect(() => setPage(1), [tab, search]);

    const { data, loading, error, reload } = useAsync(
        signal => {
            const params = { page, limit: PAGE_SIZE };
            if (search) params.q = search;
            return tab === "keys"
                ? getAdminDirectory(params, signal)
                : getAdminLoginHistory(params, signal);
        },
        [tab, search, page]
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
                                        : "Search name, email or IP address"
                                }
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                aria-label="Search"
                            />
                        </div>
                        <span className="muted" style={{ fontSize: 13 }}>
                            {loading && !data
                                ? "Loading…"
                                : tab === "keys"
                                  ? `${fmtNum(total)} user${total === 1 ? "" : "s"}`
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
                            icon={tab === "keys" ? "users" : "clock"}
                            title={
                                tab === "keys"
                                    ? "No users found"
                                    : "No sign-ins found"
                            }
                            text={
                                search
                                    ? "Try a different search."
                                    : tab === "keys"
                                      ? "Users will appear here once they register."
                                      : "Sign-ins are recorded from now on."
                            }
                        />
                    ) : tab === "keys" ? (
                        <ul className="dir-list">
                            {items.map(u => (
                                <UserBlock key={u._id} u={u} />
                            ))}
                        </ul>
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
