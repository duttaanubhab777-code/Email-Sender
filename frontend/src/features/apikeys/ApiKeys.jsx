import { useState } from "react";
import { Link } from "react-router-dom";
import { createApiKey, deleteApiKey, getApiKeys } from "../../services/api";
import useAsync from "../../hooks/useAsync";
import { useToast } from "../../components/Toast";
import Icon from "../../components/Icons";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
    Badge,
    CopyButton,
    Empty,
    ErrorState,
    PageHead,
    Skeleton
} from "../../components/ui/Bits";
import { fmtDate, fmtNum, maskKey } from "../../lib/format";

export default function ApiKeys() {
    const toast = useToast();
    const { data, loading, error, reload, setData } = useAsync(
        signal => getApiKeys(signal),
        []
    );
    const [name, setName] = useState("");
    const [creating, setCreating] = useState(false);
    const [shown, setShown] = useState({});
    const [fresh, setFresh] = useState(null);
    const [toDelete, setToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    async function create(e) {
        e.preventDefault();
        if (!name.trim()) return;
        setCreating(true);
        try {
            const k = await createApiKey(name.trim());
            setData(list => [k, ...(list || [])]);
            setShown(s => ({ ...s, [k._id]: true }));
            setFresh(k._id);
            setName("");
            toast.success("API key created");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setCreating(false);
        }
    }

    async function remove() {
        setDeleting(true);
        try {
            await deleteApiKey(toDelete._id);
            setData(list => list.filter(k => k._id !== toDelete._id));
            toast.success("API key deleted");
            setToDelete(null);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setDeleting(false);
        }
    }

    const keys = data || [];

    return (
        <>
            <PageHead
                title="API keys"
                sub="Each key connects one website or form to your inbox. Keep keys private to the sites that use them."
            />

            <section className="card" style={{ marginBottom: 16 }}>
                <div className="card-head">
                    <div>
                        <h2>Create a key</h2>
                        <p>
                            Name it after the site or project it will be used
                            on.
                        </p>
                    </div>
                </div>
                <form
                    className="card-body row-wrap"
                    onSubmit={create}
                    style={{ alignItems: "flex-end" }}
                >
                    <div className="field grow" style={{ minWidth: 220 }}>
                        <label className="label" htmlFor="key-name">
                            Project name
                        </label>
                        <input
                            id="key-name"
                            className="input"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="My portfolio site"
                            maxLength={60}
                        />
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ height: 38 }}
                        disabled={creating || !name.trim()}
                    >
                        {creating ? (
                            <span className="spin" />
                        ) : (
                            <>
                                <Icon name="plus" size={16} /> Create key
                            </>
                        )}
                    </button>
                </form>
            </section>

            <section className="card">
                <div className="card-head">
                    <div>
                        <h2>Your keys</h2>
                        <p>
                            {keys.length} {keys.length === 1 ? "key" : "keys"}
                        </p>
                    </div>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={reload}
                        disabled={loading}
                    >
                        <Icon name="refresh" size={14} /> Refresh
                    </button>
                </div>
                {loading && !data ? (
                    <div className="card-body col">
                        {[0, 1, 2].map(i => (
                            <Skeleton key={i} h={44} />
                        ))}
                    </div>
                ) : error && !data ? (
                    <ErrorState message={error} onRetry={reload} />
                ) : keys.length === 0 ? (
                    <Empty
                        icon="key"
                        title="No API keys yet"
                        text="Create your first key above, then copy it into your form."
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table stack">
                            <thead>
                                <tr>
                                    <th>Project</th>
                                    <th>Key</th>
                                    <th className="num">Emails</th>
                                    <th>Created</th>
                                    <th>Status</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {keys.map(k => (
                                    <tr
                                        key={k._id}
                                        style={
                                            k._id === fresh
                                                ? {
                                                      background:
                                                          "var(--brand-soft)"
                                                  }
                                                : undefined
                                        }
                                    >
                                        <td className="cell-main">
                                            <b>{k.name}</b>
                                        </td>
                                        <td
                                            data-label="Key"
                                            style={{ maxWidth: 360 }}
                                        >
                                            <div className="keybox">
                                                <span title="API key">
                                                    {shown[k._id]
                                                        ? k.key
                                                        : maskKey(k.key)}
                                                </span>
                                                <button
                                                    className="btn-icon"
                                                    style={{
                                                        width: 28,
                                                        height: 28
                                                    }}
                                                    onClick={() =>
                                                        setShown(s => ({
                                                            ...s,
                                                            [k._id]: !s[k._id]
                                                        }))
                                                    }
                                                    aria-label={
                                                        shown[k._id]
                                                            ? "Hide key"
                                                            : "Show key"
                                                    }
                                                >
                                                    <Icon
                                                        name={
                                                            shown[k._id]
                                                                ? "eyeOff"
                                                                : "eye"
                                                        }
                                                        size={15}
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                        <td data-label="Emails" className="num">
                                            {fmtNum(k.usageCount)}
                                        </td>
                                        <td
                                            data-label="Created"
                                            className="nowrap muted"
                                        >
                                            {fmtDate(k.createdAt)}
                                        </td>
                                        <td data-label="Status">
                                            <Badge
                                                tone={k.isActive ? "green" : ""}
                                                dot
                                            >
                                                {k.isActive
                                                    ? "Active"
                                                    : "Disabled"}
                                            </Badge>
                                        </td>
                                        <td className="cell-actions">
                                            <div
                                                className="row"
                                                style={{
                                                    justifyContent: "flex-end"
                                                }}
                                            >
                                                <CopyButton
                                                    text={k.key}
                                                    label="Copy key"
                                                    successMsg="API key copied"
                                                />
                                                <Link
                                                    to={`/mail/send?key=${k._id}`}
                                                    className="btn btn-secondary btn-sm"
                                                >
                                                    <Icon
                                                        name="code"
                                                        size={14}
                                                    />{" "}
                                                    Use
                                                </Link>
                                                <button
                                                    className="btn-icon"
                                                    onClick={() =>
                                                        setToDelete(k)
                                                    }
                                                    aria-label={`Delete ${k.name}`}
                                                    style={{
                                                        color: "var(--danger)"
                                                    }}
                                                >
                                                    <Icon
                                                        name="trash"
                                                        size={16}
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ConfirmModal
                open={!!toDelete}
                danger
                busy={deleting}
                title={`Delete "${toDelete?.name}"?`}
                confirmLabel="Delete key"
                text="Forms that use this key will stop sending emails immediately. This can't be undone."
                onConfirm={remove}
                onCancel={() => setToDelete(null)}
            />
        </>
    );
}
