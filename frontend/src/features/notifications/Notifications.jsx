import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAsync from "../../hooks/useAsync";
import Icon from "../../components/Icons";
import NotificationItem from "../../components/NotificationItem";
import { PushCard } from "../../components/PushControls";
import { Empty, ErrorState, PageHead, Skeleton } from "../../components/ui/Bits";
import { useNotifications } from "../../context/NotificationContext";
import { useToast } from "../../components/Toast";
import {
    deleteNotification,
    getNotifications,
    markAllNotificationsRead,
    markNotificationRead
} from "../../services/api";
import { fmtNum } from "../../lib/format";

const PAGE_SIZE = 15;

// সব notification: All / Unread, পড়া হিসেবে চিহ্নিত করা, মুছে ফেলা
export default function Notifications() {
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const navigate = useNavigate();
    const toast = useToast();
    const { unread, setUnread, refresh } = useNotifications();

    useEffect(() => setPage(1), [filter]);

    const { data, loading, error, reload, setData } = useAsync(
        signal => getNotifications({ filter, page, limit: PAGE_SIZE }, signal),
        [filter, page]
    );
    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 1;

    async function openItem(n) {
        if (!n.readAt) {
            setUnread(unread - 1);
            setData(d => d && { ...d, items: d.items.map(i => (i._id === n._id ? { ...i, readAt: new Date().toISOString() } : i)) });
            markNotificationRead(n._id).catch(() => {});
        }
        if (n.link) navigate(n.link);
    }

    async function markAll() {
        try {
            await markAllNotificationsRead();
            setUnread(0);
            reload();
            toast.success("All notifications marked as read.");
        } catch (e) {
            toast.error(e.message);
        }
    }

    async function remove(n) {
        try {
            await deleteNotification(n._id);
            setData(d => d && { ...d, items: d.items.filter(i => i._id !== n._id), total: d.total - 1 });
            refresh();
        } catch (e) {
            toast.error(e.message);
        }
    }

    return (
        <>
            <PageHead title="Notifications" sub="Emails, approvals and everything else that needs your attention.">
                <button className="btn btn-secondary" onClick={markAll} disabled={unread === 0}>
                    <Icon name="check" size={15} /> Mark all as read
                </button>
            </PageHead>

            <PushCard />

            <section className="card">
                <div className="tabs" role="tablist" style={{ padding: "0 8px" }}>
                    {[
                        { id: "all", label: "All" },
                        { id: "unread", label: "Unread" }
                    ].map(t => (
                        <button
                            key={t.id}
                            role="tab"
                            aria-selected={filter === t.id}
                            className={`tab-btn ${filter === t.id ? "active" : ""}`}
                            onClick={() => setFilter(t.id)}
                        >
                            {t.label}
                            {t.id === "unread" && unread > 0 && (
                                <span className="n-pill">{unread > 99 ? "99+" : unread}</span>
                            )}
                        </button>
                    ))}
                </div>

                {loading && !data ? (
                    <div className="card-body col">
                        {[0, 1, 2, 3].map(i => (
                            <Skeleton key={i} h={58} />
                        ))}
                    </div>
                ) : error && !data ? (
                    <ErrorState message={error} onRetry={reload} />
                ) : items.length === 0 ? (
                    <Empty
                        icon="bell"
                        title={filter === "unread" ? "You're all caught up" : "No notifications yet"}
                        text={
                            filter === "unread"
                                ? "There's nothing new to read right now."
                                : "New emails, approvals and account activity will show up here."
                        }
                    />
                ) : (
                    <div className="notif-page-list">
                        {items.map(n => (
                            <NotificationItem key={n._id} n={n} onOpen={openItem} onDelete={remove} />
                        ))}
                    </div>
                )}

                {(data?.total ?? 0) > PAGE_SIZE && (
                    <div className="pager">
                        <span>
                            Page {page} of {totalPages} · {fmtNum(data.total)} total
                        </span>
                        <div className="row-wrap" style={{ gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(p => p - 1)}>
                                <Icon name="chevronLeft" size={14} /> Prev
                            </button>
                            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages || loading} onClick={() => setPage(p => p + 1)}>
                                Next <Icon name="chevronRight" size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </>
    );
}
