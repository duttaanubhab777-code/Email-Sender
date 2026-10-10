import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getDashboard } from "../../services/api";
import useAsync from "../../hooks/useAsync";
import Icon from "../../components/Icons";
import Drawer from "../../components/ui/Drawer";
import {
    Badge,
    Empty,
    ErrorState,
    PageHead,
    Skeleton
} from "../../components/ui/Bits";
import { fmtDate, fmtDateTime, fmtNum, timeAgo } from "../../lib/format";

const PAGE = 8;

function monthWindow() {
    const now = new Date();
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    const next = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );
    return { start, resetOn: next };
}

// শেষ N দিনের প্রতিদিনের email সংখ্যা
function buildDays(subs, n) {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        days.push({ key: d.toDateString(), date: d, count: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.key, i]));
    subs.forEach(s => {
        const k = new Date(s.createdAt).toDateString();
        if (idx.has(k)) days[idx.get(k)].count++;
    });
    return days;
}

function DashSkeleton() {
    return (
        <div className="stack">
            <Skeleton h={34} w={260} />
            <div className="stats">
                {[0, 1, 2, 3].map(i => (
                    <Skeleton key={i} h={96} />
                ))}
            </div>
            <Skeleton h={260} />
        </div>
    );
}

export default function Dashboard() {
    const { user } = useAuth();
    const { data, loading, error, reload } = useAsync(
        signal => getDashboard(signal),
        []
    );
    const [range, setRange] = useState(14);
    const [q, setQ] = useState("");
    const [status, setStatus] = useState("all");
    const [page, setPage] = useState(0);
    const [open, setOpen] = useState(null);

    const subs = useMemo(
        () =>
            [...(data?.allSubmissions || [])].sort(
                (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            ),
        [data]
    );
    const keys = data?.apiKeysList || [];
    const keyName = id => keys.find(k => k._id === id)?.name || "Deleted key";

    const { start, resetOn } = monthWindow();
    const usedMonth = useMemo(
        () => subs.filter(s => new Date(s.createdAt).getTime() >= start).length,
        [subs, start]
    );
    const days = useMemo(() => buildDays(subs, range), [subs, range]);
    const maxDay = Math.max(1, ...days.map(d => d.count));
    const rangeTotal = days.reduce((a, d) => a + d.count, 0);

    const filtered = useMemo(() => {
        const term = q.trim().toLowerCase();
        return subs.filter(s => {
            if (status !== "all" && s.status !== status) return false;
            if (!term) return true;
            return [s.senderName, s.senderEmail, s.subject, s.message].some(v =>
                String(v || "")
                    .toLowerCase()
                    .includes(term)
            );
        });
    }, [subs, q, status]);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
    const safePage = Math.min(page, pages - 1);
    const rows = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);

    if (loading && !data) return <DashSkeleton />;
    if (error && !data) return <ErrorState message={error} onRetry={reload} />;

    const limit = data.monthlyEmailLimit || 0;
    const pct = limit
        ? Math.min(100, Math.round((usedMonth / limit) * 100))
        : 0;
    const tone = pct >= 90 ? "bad" : pct >= 70 ? "warn" : "";
    const first = (data.fullName || user?.fullName || "").split(" ")[0];

    return (
        <>
            <PageHead
                title={`Welcome back, ${first}`}
                sub="Your email activity, quota and the latest messages sent through your API keys."
            >
                <button
                    className="btn btn-secondary"
                    onClick={reload}
                    disabled={loading}
                >
                    <Icon name="refresh" size={15} /> Refresh
                </button>
                <Link to="/apiKeys/all" className="btn btn-primary">
                    <Icon name="plus" size={16} /> New API key
                </Link>
            </PageHead>

            <section className="stats">
                <div className="card stat">
                    <span className="lab">
                        <Icon name="mail" size={16} /> Emails this month
                    </span>
                    <span className="val">
                        {fmtNum(usedMonth)} <small>/ {fmtNum(limit)}</small>
                    </span>
                    <span className="sub">
                        {fmtNum(Math.max(0, limit - usedMonth))} remaining
                    </span>
                </div>
                <div className="card stat">
                    <span className="lab">
                        <Icon name="inbox" size={16} /> Total emails sent
                    </span>
                    <span className="val">{fmtNum(data.totalEmailsSent)}</span>
                    <span className="sub">All time</span>
                </div>
                <div className="card stat">
                    <span className="lab">
                        <Icon name="key" size={16} /> API keys
                    </span>
                    <span className="val">{fmtNum(data.totalApiKeys)}</span>
                    <span className="sub">
                        {keys.filter(k => k.isActive).length} active
                    </span>
                </div>
                <div className="card stat">
                    <span className="lab">
                        <Icon name="clock" size={16} /> Last email
                    </span>
                    <span className="val" style={{ fontSize: 22 }}>
                        {subs[0] ? timeAgo(subs[0].createdAt) : "—"}
                    </span>
                    <span className="sub">
                        {subs[0]
                            ? fmtDateTime(subs[0].createdAt)
                            : "Nothing sent yet"}
                    </span>
                </div>
            </section>

            {keys.length === 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                    <Empty
                        icon="key"
                        title="Create your first API key"
                        text="An API key connects your website form to your inbox. It takes about a minute."
                    >
                        <Link to="/apiKeys/all" className="btn btn-primary">
                            <Icon name="plus" size={16} /> Create API key
                        </Link>
                    </Empty>
                </div>
            )}

            <div className="grid-2" style={{ marginBottom: 16 }}>
                <section className="card">
                    <div className="card-head">
                        <div>
                            <h2>Email activity</h2>
                            <p>
                                {fmtNum(rangeTotal)} emails in the last {range}{" "}
                                days
                            </p>
                        </div>
                        <div className="seg" role="group" aria-label="Range">
                            {[7, 14, 30].map(n => (
                                <button
                                    key={n}
                                    className={range === n ? "active" : ""}
                                    onClick={() => setRange(n)}
                                >
                                    {n}d
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="card-body">
                        <div
                            className="chart"
                            role="img"
                            aria-label={`Emails per day for the last ${range} days`}
                        >
                            {days.map(d => (
                                <div
                                    key={d.key}
                                    className={`bar ${d.count === 0 ? "zero" : ""}`}
                                    tabIndex={0}
                                >
                                    <span className="tip">
                                        {d.count} ·{" "}
                                        {fmtDate(d.date).replace(/ \d{4}$/, "")}
                                    </span>
                                    <i
                                        style={{
                                            height: `${d.count === 0 ? 0 : Math.max(6, (d.count / maxDay) * 100)}%`
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="chart-x">
                            <span>
                                {fmtDate(days[0].date).replace(/ \d{4}$/, "")}
                            </span>
                            <span>Today</span>
                        </div>
                    </div>
                </section>

                <section className="card">
                    <div className="card-head">
                        <div>
                            <h2>Monthly quota</h2>
                            <p>Resets on {fmtDate(resetOn)}</p>
                        </div>
                    </div>
                    <div className="card-body">
                        <div className="quota-top">
                            <b>{pct}%</b>
                            <span className="muted">
                                {fmtNum(usedMonth)} of {fmtNum(limit)} emails
                            </span>
                        </div>
                        <div
                            className={`meter ${tone}`}
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        >
                            <i style={{ width: `${pct}%` }} />
                        </div>
                        {pct >= 90 && (
                            <p className="help err" style={{ marginTop: 10 }}>
                                You're close to your limit. New emails are
                                rejected once it's reached.
                            </p>
                        )}
                    </div>
                    <div
                        className="link-list"
                        style={{ borderTop: "1px solid var(--line)" }}
                    >
                        <Link to="/mail/send">
                            <Icon name="send" size={17} /> Send a test email{" "}
                            <Icon
                                name="chevronRight"
                                size={16}
                                className="chev"
                            />
                        </Link>
                        <Link to="/apiKeys/all">
                            <Icon name="key" size={17} /> Manage API keys{" "}
                            <Icon
                                name="chevronRight"
                                size={16}
                                className="chev"
                            />
                        </Link>
                    </div>
                </section>
            </div>

            <section className="card">
                <div className="card-head">
                    <div>
                        <h2>Recent emails</h2>
                        <p>
                            {fmtNum(filtered.length)}{" "}
                            {filtered.length === 1 ? "message" : "messages"}
                        </p>
                    </div>
                </div>
                {subs.length > 0 && (
                    <div className="toolbar">
                        <div className="search">
                            <Icon name="search" size={16} />
                            <input
                                className="input"
                                placeholder="Search sender, subject or message"
                                value={q}
                                onChange={e => {
                                    setQ(e.target.value);
                                    setPage(0);
                                }}
                                aria-label="Search emails"
                            />
                        </div>
                        <select
                            className="select sm"
                            value={status}
                            onChange={e => {
                                setStatus(e.target.value);
                                setPage(0);
                            }}
                            aria-label="Filter by status"
                        >
                            <option value="all">All statuses</option>
                            <option value="sent">Sent</option>
                            <option value="failed">Failed</option>
                        </select>
                    </div>
                )}
                {subs.length === 0 ? (
                    <Empty
                        icon="inbox"
                        title="No emails yet"
                        text="Messages sent through your forms will show up here with their sender, subject and status."
                    >
                        <Link to="/mail/send" className="btn btn-secondary">
                            Get the form snippet
                        </Link>
                    </Empty>
                ) : filtered.length === 0 ? (
                    <Empty
                        icon="search"
                        title="No matching emails"
                        text="Try a different search term or status."
                    />
                ) : (
                    <>
                        <div className="table-wrap">
                            <table className="table stack">
                                <thead>
                                    <tr>
                                        <th>Sender</th>
                                        <th>Subject</th>
                                        <th>API key</th>
                                        <th>Status</th>
                                        <th>Received</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(s => (
                                        <tr
                                            key={s._id}
                                            className="clickable"
                                            onClick={() => setOpen(s)}
                                        >
                                            <td className="cell-main">
                                                <div className="cell-user">
                                                    <div
                                                        style={{ minWidth: 0 }}
                                                    >
                                                        <b className="truncate">
                                                            {s.senderName}
                                                        </b>
                                                        <small className="truncate">
                                                            {s.senderEmail}
                                                        </small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Subject">
                                                <span
                                                    className="truncate"
                                                    style={{
                                                        display: "block",
                                                        maxWidth: 260
                                                    }}
                                                >
                                                    {s.subject || "—"}
                                                </span>
                                            </td>
                                            <td data-label="API key">
                                                {keyName(s.apiKey)}
                                            </td>
                                            <td data-label="Status">
                                                <Badge
                                                    tone={
                                                        s.status === "sent"
                                                            ? "green"
                                                            : "red"
                                                    }
                                                    dot
                                                >
                                                    {s.status === "sent"
                                                        ? "Sent"
                                                        : "Failed"}
                                                </Badge>
                                            </td>
                                            <td
                                                data-label="Received"
                                                className="nowrap muted"
                                            >
                                                {timeAgo(s.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="pager">
                            <span>
                                Page {safePage + 1} of {pages}
                            </span>
                            <div className="row">
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={safePage === 0}
                                    onClick={() => setPage(safePage - 1)}
                                >
                                    <Icon name="chevronLeft" size={14} /> Prev
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={safePage >= pages - 1}
                                    onClick={() => setPage(safePage + 1)}
                                >
                                    Next <Icon name="chevronRight" size={14} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            <Drawer
                open={!!open}
                onClose={() => setOpen(null)}
                title="Email details"
            >
                {open && (
                    <>
                        <div className="row-wrap">
                            <Badge
                                tone={open.status === "sent" ? "green" : "red"}
                                dot
                            >
                                {open.status === "sent" ? "Sent" : "Failed"}
                            </Badge>
                            <span className="muted">
                                {fmtDateTime(open.createdAt)}
                            </span>
                        </div>
                        <h3 style={{ fontSize: 18 }}>
                            {open.subject || "(no subject)"}
                        </h3>
                        <dl className="dl">
                            <dt>From</dt>
                            <dd>
                                {open.senderName}{" "}
                                <span className="muted">
                                    &lt;{open.senderEmail}&gt;
                                </span>
                            </dd>
                            <dt>Delivered to</dt>
                            <dd>{open.receiverEmail}</dd>
                            <dt>API key</dt>
                            <dd>{keyName(open.apiKey)}</dd>
                            <dt>Sender IP</dt>
                            <dd className="mono">{open.ipAddress || "—"}</dd>
                        </dl>
                        <div>
                            <div className="label" style={{ marginBottom: 8 }}>
                                Message
                            </div>
                            <div className="msg-box">{open.message}</div>
                        </div>
                    </>
                )}
            </Drawer>
        </>
    );
}
