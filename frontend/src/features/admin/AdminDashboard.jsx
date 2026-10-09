import { useCallback, useEffect, useMemo, useState } from "react";
import {
    getAdminStats,
    getAdminUsers,
    toggleBlockUser
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import Avatar from "../../components/Avatar";
import CountUp from "../../components/CountUp";
import Icon from "../../components/Icons";
import "../../styles/Admin.css";

export default function AdminDashboard() {
    const { user: me } = useAuth();
    const toast = useToast();

    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [q, setQ] = useState("");
    const [busyId, setBusyId] = useState(null);

    const load = useCallback(async signal => {
        setLoading(true);
        setError(null);
        try {
            const [s, u] = await Promise.all([
                getAdminStats(signal),
                getAdminUsers(signal)
            ]);
            setStats(s);
            setUsers(Array.isArray(u) ? u : u?.users || []);
        } catch (err) {
            if (err.name !== "AbortError") setError(err);
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        const c = new AbortController();
        load(c.signal);
        return () => c.abort();
    }, [load]);

    const filtered = useMemo(() => {
        const t = q.trim().toLowerCase();
        if (!t) return users;
        return users.filter(u =>
            [u.fullName, u.username, u.email].some(v =>
                v?.toLowerCase().includes(t)
            )
        );
    }, [users, q]);

    async function toggle(u) {
        setBusyId(u._id);
        try {
            await toggleBlockUser(u._id, !u.isBlocked);
            setUsers(list =>
                list.map(x =>
                    x._id === u._id ? { ...x, isBlocked: !x.isBlocked } : x
                )
            );
            toast.success(
                u.isBlocked
                    ? `${u.username} has been unblocked`
                    : `${u.username} has been blocked`
            );
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    }

    if (loading) {
        return (
            <div className="stack">
                <div className="stats-grid">
                    <div className="skeleton sk-stat" />
                    <div className="skeleton sk-stat" />
                    <div className="skeleton sk-stat" />
                </div>
                <div className="skeleton sk-block" />
            </div>
        );
    }

    // ব্যাকএন্ডে অ্যাডমিন রাউট না থাকলে (404) পরিষ্কার করে বলে দেবে
    if (error) {
        const missing = error.status === 404;
        return (
            <div className="card empty reveal">
                <div className="empty-ic bad">
                    <Icon name={missing ? "terminal" : "alert"} size={30} />
                </div>
                <h3>
                    {missing
                        ? "Admin API not available yet"
                        : "Could not load data"}
                </h3>
                <p>
                    {missing
                        ? "This page expects the endpoints below. Add them to the backend and it will start working:"
                        : error.message}
                </p>
                {missing && (
                    <pre className="snippet">
                        <code>{`GET   /api/v1/admin/stats
GET   /api/v1/admin/users
PATCH /api/v1/admin/users/:id/block   { isBlocked }`}</code>
                    </pre>
                )}
                <button className="btn btn-primary" onClick={() => load()}>
                    Try again
                </button>
            </div>
        );
    }

    const cards = [
        {
            label: "Total users",
            v: stats?.totalUsers ?? users.length,
            icon: "users",
            tone: "violet"
        },
        {
            label: "Total API keys",
            v: stats?.totalApiKeys ?? 0,
            icon: "key",
            tone: "cyan"
        },
        {
            label: "Total emails",
            v: stats?.totalEmails ?? 0,
            icon: "mail",
            tone: "pink"
        }
    ];

    return (
        <div className="stack">
            <div className="page-title reveal">
                <h1>
                    <Icon name="shield" size={26} /> Admin Panel
                </h1>
                <p>Users and usage across the whole system at a glance.</p>
            </div>

            <section className="stats-grid">
                {cards.map((c, i) => (
                    <div
                        key={c.label}
                        className="card stat reveal tilt"
                        style={{ "--i": i + 1 }}
                    >
                        <span className={`stat-ic ${c.tone}`}>
                            <Icon name={c.icon} size={22} />
                        </span>
                        <div>
                            <small>{c.label}</small>
                            <h2>
                                <CountUp value={c.v} />
                            </h2>
                        </div>
                    </div>
                ))}
            </section>

            <section className="card reveal" style={{ "--i": 4 }}>
                <div className="card-head">
                    <h3>
                        <Icon name="users" size={18} /> Users
                    </h3>
                    <span className="chip">{filtered.length}</span>
                </div>

                <span className="field-box search">
                    <Icon name="spark" size={18} />
                    <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Search by name, username or email"
                    />
                </span>

                <ul className="user-list">
                    {filtered.map((u, i) => {
                        const isMe = u._id === me?._id;
                        return (
                            <li
                                key={u._id}
                                className={`user-row ${u.isBlocked ? "blocked" : ""}`}
                                style={{ "--i": i }}
                            >
                                <Avatar
                                    src={u.avatar}
                                    name={u.fullName}
                                    size={44}
                                />
                                <div className="user-info">
                                    <b>
                                        {u.fullName} {isMe && <em>(you)</em>}
                                    </b>
                                    <small>
                                        @{u.username} · {u.email}
                                    </small>
                                </div>
                                {u.role === "admin" && (
                                    <span className="badge on">Admin</span>
                                )}
                                {u.isBlocked && (
                                    <span className="badge off">Blocked</span>
                                )}
                                <button
                                    className={`btn btn-sm ${u.isBlocked ? "btn-ghost" : "btn-danger"}`}
                                    disabled={
                                        isMe ||
                                        u.isSuperAdmin ||
                                        busyId === u._id
                                    }
                                    onClick={() => toggle(u)}
                                >
                                    {busyId === u._id ? (
                                        <span className="spin" />
                                    ) : u.isBlocked ? (
                                        "Unblock"
                                    ) : (
                                        "Block"
                                    )}
                                </button>
                            </li>
                        );
                    })}
                    {filtered.length === 0 && (
                        <li className="muted center">No users found.</li>
                    )}
                </ul>
            </section>
        </div>
    );
}
