import { Link } from "react-router-dom";
import { getAdminStats } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import useAsync from "../../hooks/useAsync";
import CountUp from "../../components/CountUp";
import Icon from "../../components/Icons";
import {
    Callout,
    ErrorState,
    PageHead,
    Skeleton
} from "../../components/ui/Bits";

// GET /admin/stats — Admin + Super Admin দুজনেই দেখতে পারে
export default function AdminDashboard() {
    const { user } = useAuth();
    const { data, loading, error, reload } = useAsync(
        signal => getAdminStats(signal),
        []
    );
    const isSuper = !!user?.isSuperAdmin;

    if (loading && !data) {
        return (
            <>
                <PageHead title="Admin overview" />
                <section className="stats">
                    {[0, 1, 2, 3].map(i => (
                        <Skeleton key={i} h={96} />
                    ))}
                </section>
            </>
        );
    }
    if (error && !data) return <ErrorState message={error} onRetry={reload} />;

    const cards = [
        {
            label: "Total users",
            v: data.totalUsers,
            icon: "users",
            sub: "All accounts"
        },
        {
            label: "Admins",
            v: data.totalAdmins,
            icon: "shield",
            sub: "Including the Super Admin"
        },
        {
            label: "Blocked",
            v: data.blockedUsers,
            icon: "ban",
            sub: "Can't sign in"
        },
        {
            label: "API keys",
            v: data.totalApiKeys,
            icon: "key",
            sub: "Across all users"
        },
        {
            label: "Emails sent",
            v: data.totalEmails,
            icon: "mail",
            sub: "All time"
        },
        ...(isSuper
            ? [
                  {
                      label: "Pending approvals",
                      v: data.pendingApprovals,
                      icon: "shieldCheck",
                      sub: "Waiting for you"
                  }
              ]
            : [])
    ];

    const quick = [
        {
            to: "/admin/users",
            icon: "users",
            title: "Manage users",
            text: "Search, block, unblock or delete accounts."
        },
        {
            to: "/admin/create-admin",
            icon: "userPlus",
            title: "Create admin",
            text: "Add a new admin or promote an existing user."
        },
        {
            to: "/approvals",
            icon: "shieldCheck",
            title: isSuper ? "Review approvals" : "My requests",
            text: isSuper
                ? "Approve or deny permission requests from admins."
                : "Track the permission requests you sent."
        },
        {
            to: "/kill-switch",
            icon: "power",
            title: "Kill switch",
            text: "Shut the system down and wipe data. No cancel.",
            kill: true
        }
    ];

    return (
        <>
            <PageHead
                title="Admin overview"
                sub="Users and usage across the whole system."
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
                <section className="stats">
                    {cards.map(c => (
                        <div className="card stat" key={c.label}>
                            <span className="lab">
                                <Icon name={c.icon} size={16} /> {c.label}
                            </span>
                            <span className="val">
                                <CountUp value={c.v ?? 0} />
                            </span>
                            <span className="sub">{c.sub}</span>
                        </div>
                    ))}
                </section>

                <Callout icon="info">
                    {isSuper ? (
                        <p>
                            You are the <b>Super Admin</b>. Every action works
                            directly for you, and you decide on the requests
                            admins send.
                        </p>
                    ) : (
                        <>
                            <p>
                                You are an <b>Admin</b>. Blocking or deleting
                                regular users works directly.
                            </p>
                            <p>
                                Creating admins, changing admin roles, acting on
                                other admins and the kill switch need the Super
                                Admin's approval first.
                            </p>
                        </>
                    )}
                </Callout>

                <section className="quick-grid">
                    {quick.map(q => (
                        <Link
                            key={q.to}
                            to={q.to}
                            className={`card quick ${q.kill ? "kill" : ""}`}
                        >
                            <span className="ic">
                                <Icon name={q.icon} size={19} />
                            </span>
                            <div>
                                <b>{q.title}</b>
                                <small>{q.text}</small>
                            </div>
                        </Link>
                    ))}
                </section>
            </div>
        </>
    );
}
