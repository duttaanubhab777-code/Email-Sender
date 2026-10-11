import Icon from "./Icons";
import { timeAgo } from "../lib/format";

// notification এর type অনুযায়ী আইকন + রং
const META = {
    email_received: { icon: "mail", tone: "green" },
    email_activity: { icon: "inbox", tone: "blue" },
    approval_request: { icon: "shieldCheck", tone: "amber" },
    approval_approved: { icon: "checkCircle", tone: "green" },
    approval_denied: { icon: "xCircle", tone: "red" },
    user_joined: { icon: "userPlus", tone: "blue" },
    welcome: { icon: "bolt", tone: "green" },
    password_changed: { icon: "lock", tone: "amber" },
    api_key_created: { icon: "key", tone: "green" },
    api_key_deleted: { icon: "key", tone: "red" },
    user_blocked: { icon: "ban", tone: "red" },
    user_unblocked: { icon: "unlock", tone: "green" },
    user_deleted: { icon: "trash", tone: "red" },
    admin_added: { icon: "crown", tone: "blue" },
    role_changed: { icon: "shield", tone: "amber" }
};

export default function NotificationItem({ n, onOpen, onDelete }) {
    const meta = META[n.type] || { icon: "bell", tone: "blue" };
    const unread = !n.readAt;
    return (
        <div className={`notif-item ${unread ? "unread" : ""}`}>
            <button className="notif-main" onClick={() => onOpen(n)}>
                <span className={`n-ic ${meta.tone}`}>
                    <Icon name={meta.icon} size={17} />
                </span>
                <span className="n-text">
                    <b>{n.title}</b>
                    {n.body && <span className="n-body">{n.body}</span>}
                    <small>{timeAgo(n.createdAt)}</small>
                </span>
                {unread && <span className="n-dot" aria-label="Unread" />}
            </button>
            {onDelete && (
                <button
                    className="btn-icon notif-del"
                    onClick={() => onDelete(n)}
                    aria-label="Delete notification"
                >
                    <Icon name="x" size={15} />
                </button>
            )}
        </div>
    );
}
