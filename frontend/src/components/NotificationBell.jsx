import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icons";
import NotificationItem from "./NotificationItem";
import { Skeleton } from "./ui/Bits";
import useAsync from "../hooks/useAsync";
import { useNotifications } from "../context/NotificationContext";
import {
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead
} from "../services/api";

// টপবারের ঘণ্টা: unread সংখ্যার ব্যাজ + সর্বশেষ নোটিফিকেশনের dropdown
export default function NotificationBell() {
    const { unread, setUnread } = useNotifications();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const { data, loading, error, setData } = useAsync(
        signal =>
            open
                ? getNotifications({ limit: 8 }, signal)
                : Promise.resolve(null),
        [open, unread]
    );
    const items = data?.items ?? [];

    useEffect(() => setOpen(false), [pathname]);
    useEffect(() => {
        if (!open) return;
        const onDown = e =>
            ref.current && !ref.current.contains(e.target) && setOpen(false);
        const onKey = e => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDown);
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [open]);

    async function openItem(n) {
        setOpen(false);
        if (!n.readAt) {
            setUnread(unread - 1);
            markNotificationRead(n._id).catch(() => {});
        }
        if (n.link) navigate(n.link);
    }

    async function markAll() {
        try {
            await markAllNotificationsRead();
            setUnread(0);
            const now = new Date().toISOString();
            setData(
                d =>
                    d && {
                        ...d,
                        items: d.items.map(i => ({
                            ...i,
                            readAt: i.readAt || now
                        }))
                    }
            );
        } catch {
            /* পরের poll এ সংখ্যা ঠিক হয়ে যাবে */
        }
    }

    return (
        <div className="menu-wrap" ref={ref}>
            <button
                className="btn-icon bell"
                style={{ width: 38 }}
                onClick={() => setOpen(o => !o)}
                aria-label={
                    unread > 0
                        ? `Notifications, ${unread} unread`
                        : "Notifications"
                }
                aria-expanded={open}
            >
                <Icon name="bell" size={18} />
                {unread > 0 && (
                    <span className="bell-count">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="notif-panel"
                    role="dialog"
                    aria-label="Notifications"
                >
                    <div className="notif-head">
                        <b>Notifications</b>
                        <button
                            className="notif-link"
                            onClick={markAll}
                            disabled={unread === 0}
                        >
                            Mark all as read
                        </button>
                    </div>
                    <div className="notif-list">
                        {loading && !data ? (
                            <div className="col" style={{ padding: 12 }}>
                                {[0, 1, 2].map(i => (
                                    <Skeleton key={i} h={46} />
                                ))}
                            </div>
                        ) : error && !data ? (
                            <p className="notif-empty">
                                Couldn't load notifications.
                            </p>
                        ) : items.length === 0 ? (
                            <p className="notif-empty">
                                <Icon name="bell" size={22} />
                                You're all caught up.
                            </p>
                        ) : (
                            items.map(n => (
                                <NotificationItem
                                    key={n._id}
                                    n={n}
                                    onOpen={openItem}
                                />
                            ))
                        )}
                    </div>
                    <Link to="/notifications" className="notif-foot">
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
}
