import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { getAdminStats } from "../services/api";
import Avatar from "./Avatar";
import Icon from "./Icons";
import ThemeToggle from "./ThemeToggle";
import { Brand } from "./Logo";
import { RoleBadge } from "./ui/Bits";

const MAIN = [
    { to: "/users/dashboard", label: "Dashboard", icon: "home" },
    { to: "/apiKeys/all", label: "API keys", icon: "key" },
    { to: "/mail/send", label: "Send & embed", icon: "send" },
    { to: "/users/current-user", label: "Account", icon: "user" }
];
const ADMIN = [
    { to: "/admin/stats", label: "Overview", icon: "grid" },
    { to: "/admin/users", label: "Users", icon: "users" },
    { to: "/admin/create-admin", label: "Create admin", icon: "userPlus" },
    { to: "/approvals", label: "Approvals", icon: "shieldCheck", badge: true },
    { to: "/kill-switch", label: "Kill switch", icon: "power", kill: true }
];
const TITLES = {
    "/users/dashboard": "Dashboard",
    "/users/current-user": "Account",
    "/apiKeys/all": "API keys",
    "/mail/send": "Send & embed",
    "/admin/stats": "Admin overview",
    "/admin/users": "Users",
    "/admin/create-admin": "Create admin",
    "/approvals": "Approvals",
    "/kill-switch": "Kill switch"
};
const isAdminPath = p =>
    p.startsWith("/admin") ||
    p.startsWith("/approvals") ||
    p.startsWith("/kill-switch");

function SideLink({ item, pending }) {
    return (
        <NavLink
            to={item.to}
            className={({ isActive }) =>
                `side-link ${item.kill ? "kill" : ""} ${isActive ? "active" : ""}`
            }
        >
            <Icon name={item.icon} size={17} />
            <span>{item.label}</span>
            {item.badge && pending > 0 && (
                <span className="count">{pending}</span>
            )}
        </NavLink>
    );
}

export default function ConsoleLayout() {
    const { user, logout } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isAdmin = user?.role === "admin";
    const [pending, setPending] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Super Admin এর জন্য pending approval সংখ্যা (sidebar এ লাল ব্যাজ)
    useEffect(() => {
        if (!user?.isSuperAdmin) return;
        let alive = true;
        const load = () =>
            getAdminStats()
                .then(s => alive && setPending(s.pendingApprovals || 0))
                .catch(() => {});
        load();
        const id = setInterval(load, 60000);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, [user?.isSuperAdmin, pathname]);

    useEffect(() => setMenuOpen(false), [pathname]);
    useEffect(() => {
        if (!menuOpen) return;
        const h = e => {
            if (menuRef.current && !menuRef.current.contains(e.target))
                setMenuOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [menuOpen]);

    async function handleLogout() {
        try {
            await logout();
        } catch {
            /* cookie যাই হোক, local state পরিষ্কার হয়েছে */
        }
        toast.success("You have successfully logged out.");
        navigate("/users/login", { replace: true });
    }

    const title = TITLES[pathname] || "Console";
    const tabs = [
        ...MAIN.slice(0, 3),
        isAdmin
            ? {
                  to: "/admin/stats",
                  label: "Admin",
                  icon: "shield",
                  match: isAdminPath
              }
            : MAIN[3]
    ];

    return (
        <div className="shell">
            <aside className="sidebar">
                <NavLink to="/users/dashboard" className="side-brand">
                    <Brand size={32} />
                </NavLink>
                <nav className="side-nav" aria-label="Main">
                    <div className="side-group">Workspace</div>
                    {MAIN.map(i => (
                        <SideLink key={i.to} item={i} />
                    ))}
                    {isAdmin && (
                        <>
                            <div className="side-group">Administration</div>
                            {ADMIN.map(i => (
                                <SideLink
                                    key={i.to}
                                    item={i}
                                    pending={pending}
                                />
                            ))}
                        </>
                    )}
                </nav>
                <div className="side-foot">
                    <NavLink to="/system/status" className="side-status">
                        <span className="dot" /> System status
                    </NavLink>
                    <NavLink to="/users/current-user" className="side-user">
                        <Avatar
                            src={user?.avatar}
                            name={user?.fullName}
                            size={34}
                        />
                        <span className="who">
                            <b className="truncate">{user?.fullName}</b>
                            <small className="truncate">
                                @{user?.username}
                            </small>
                        </span>
                    </NavLink>
                </div>
            </aside>

            <div className="main">
                <header className="topbar">
                    <NavLink to="/users/dashboard" className="top-brand">
                        <Brand size={28} />
                    </NavLink>
                    <div className="crumbs">
                        <span>Email Sender</span>
                        <Icon name="chevronRight" size={14} />
                        <b>{title}</b>
                    </div>
                    <div className="top-actions">
                        <ThemeToggle />
                        <div className="menu-wrap" ref={menuRef}>
                            <button
                                className="btn-icon"
                                style={{ width: 38 }}
                                onClick={() => setMenuOpen(o => !o)}
                                aria-label="Account menu"
                                aria-expanded={menuOpen}
                            >
                                <Avatar
                                    src={user?.avatar}
                                    name={user?.fullName}
                                    size={30}
                                />
                            </button>
                            {menuOpen && (
                                <div className="menu" role="menu">
                                    <div className="menu-head">
                                        <Avatar
                                            src={user?.avatar}
                                            name={user?.fullName}
                                            size={38}
                                        />
                                        <div style={{ minWidth: 0 }}>
                                            <b className="truncate">
                                                {user?.fullName}
                                            </b>
                                            <small
                                                className="truncate"
                                                style={{ display: "block" }}
                                            >
                                                {user?.email}
                                            </small>
                                        </div>
                                    </div>
                                    <div style={{ padding: "2px 10px 8px" }}>
                                        <RoleBadge user={user} />
                                    </div>
                                    <NavLink
                                        to="/users/current-user"
                                        className="menu-item"
                                    >
                                        <Icon name="user" size={16} /> Account
                                    </NavLink>
                                    <NavLink
                                        to="/system/status"
                                        className="menu-item"
                                    >
                                        <Icon name="activity" size={16} />{" "}
                                        System status
                                    </NavLink>
                                    <button
                                        className="menu-item danger"
                                        onClick={handleLogout}
                                    >
                                        <Icon name="logout" size={16} /> Sign
                                        out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="content">
                    {isAdmin && isAdminPath(pathname) && (
                        <div className="admin-tabs tabs" role="tablist">
                            {ADMIN.map(i => (
                                <NavLink
                                    key={i.to}
                                    to={i.to}
                                    className={({ isActive }) =>
                                        `tab-btn ${isActive ? "active" : ""}`
                                    }
                                >
                                    <Icon name={i.icon} size={15} /> {i.label}
                                    {i.badge && pending > 0 && (
                                        <span className="badge red">
                                            {pending}
                                        </span>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    )}
                    <Outlet />
                </main>
            </div>

            <nav
                className="tabbar"
                style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
                aria-label="Primary"
            >
                {tabs.map(t => (
                    <NavLink
                        key={t.to}
                        to={t.to}
                        className={({ isActive }) =>
                            (t.match ? t.match(pathname) : isActive)
                                ? "active"
                                : ""
                        }
                    >
                        <Icon name={t.icon} size={21} />
                        <span>{t.label}</span>
                        {t.icon === "shield" && pending > 0 && (
                            <span className="badge-dot">{pending}</span>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}
