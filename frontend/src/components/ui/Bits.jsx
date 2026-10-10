import { useState } from "react";
import Icon from "../Icons";
import { copyToClipboard } from "../../lib/format";
import { useToast } from "../Toast";

export function PageHead({ title, sub, children }) {
    return (
        <div className="page-head">
            <div>
                <h1>{title}</h1>
                {sub && <p>{sub}</p>}
            </div>
            {children && <div className="actions">{children}</div>}
        </div>
    );
}

export function Empty({ icon = "inbox", title, text, children }) {
    return (
        <div className="empty">
            <span className="empty-ic">
                <Icon name={icon} size={22} />
            </span>
            <h3>{title}</h3>
            {text && <p>{text}</p>}
            {children}
        </div>
    );
}

export function ErrorState({ message, onRetry }) {
    return (
        <div className="card">
            <Empty icon="alert" title="Couldn't load this page" text={message}>
                {onRetry && (
                    <button className="btn btn-secondary" onClick={onRetry}>
                        <Icon name="refresh" size={15} /> Try again
                    </button>
                )}
            </Empty>
        </div>
    );
}

export function Skeleton({ h = 16, w = "100%", style }) {
    return (
        <div className="skeleton" style={{ height: h, width: w, ...style }} />
    );
}

export function CopyButton({
    text,
    label = "Copy",
    small = true,
    successMsg = "Copied to clipboard"
}) {
    const [done, setDone] = useState(false);
    const toast = useToast();
    async function copy() {
        const ok = await copyToClipboard(text);
        if (!ok)
            return toast.error(
                "Couldn't copy. Select the text and copy it manually."
            );
        setDone(true);
        toast.success(successMsg);
        setTimeout(() => setDone(false), 1600);
    }
    return (
        <button
            type="button"
            className={`btn btn-secondary ${small ? "btn-sm" : ""}`}
            onClick={copy}
        >
            <Icon name={done ? "check" : "copy"} size={14} />{" "}
            {done ? "Copied" : label}
        </button>
    );
}

export function Badge({ tone = "", dot = false, children }) {
    return (
        <span className={`badge ${tone}`}>
            {dot && <i />}
            {children}
        </span>
    );
}

export function RoleBadge({ user }) {
    if (user?.isSuperAdmin)
        return (
            <Badge tone="solid">
                <Icon name="crown" size={12} /> Super Admin
            </Badge>
        );
    if (user?.role === "admin") return <Badge tone="blue">Admin</Badge>;
    return <Badge>User</Badge>;
}

export function Callout({ tone = "", icon = "info", children }) {
    return (
        <div
            className={`callout ${tone}`}
            role={tone === "danger" ? "alert" : undefined}
        >
            <Icon name={icon} size={18} />
            <div>{children}</div>
        </div>
    );
}
