import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    deleteUserById,
    getAdminUsers,
    makeAdmin,
    removeAdmin,
    setUserBlocked
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import useAsync from "../../hooks/useAsync";
import useExtra from "../../hooks/useExtra";
import { useToast } from "../../components/Toast";
import Avatar from "../../components/Avatar";
import Icon from "../../components/Icons";
import Modal from "../../components/ui/Modal";
import ConfirmModal from "../../components/ui/ConfirmModal";
import {
    Badge,
    Callout,
    Empty,
    ErrorState,
    PageHead,
    RoleBadge,
    Skeleton
} from "../../components/ui/Bits";
import { fmtDate, fmtDateTime } from "../../lib/format";

const FILTERS = [
    { id: "all", label: "All" },
    { id: "admin", label: "Admins" },
    { id: "user", label: "Users" },
    { id: "blocked", label: "Blocked" }
];

// GET /admin/users · PATCH /admin/users/:id/block · DELETE /admin/users/:id
// PUT /admin/make-admin · PUT /admin/remove-admin
export default function AdminUsers() {
    const { user: me } = useAuth();
    const toast = useToast();
    const extra = useExtra();
    const { data, loading, error, reload, setData } = useAsync(
        signal => getAdminUsers(signal),
        []
    );
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all");
    const [sel, setSel] = useState(null); // Manage modal এর user
    const [toDelete, setToDelete] = useState(null);
    const [busyId, setBusyId] = useState(null);

    const users = useMemo(
        () => (Array.isArray(data) ? data : data?.users || []),
        [data]
    );

    const counts = useMemo(
        () => ({
            all: users.length,
            admin: users.filter(u => u.role === "admin").length,
            user: users.filter(u => u.role !== "admin").length,
            blocked: users.filter(u => u.isBlocked).length
        }),
        [users]
    );

    const rows = useMemo(() => {
        const t = q.trim().toLowerCase();
        return users.filter(u => {
            if (filter === "admin" && u.role !== "admin") return false;
            if (filter === "user" && u.role === "admin") return false;
            if (filter === "blocked" && !u.isBlocked) return false;
            if (!t) return true;
            return [u.fullName, u.username, u.email].some(v =>
                v?.toLowerCase().includes(t)
            );
        });
    }, [users, q, filter]);

    const label = u => `${u.fullName} (${u.email})`;
    const replaceUser = fresh =>
        setData(list =>
            list.map(x => (x._id === fresh._id ? { ...x, ...fresh } : x))
        );

    // Admin কে Admin এর উপর কাজ করতে হলে Super Admin এর approval লাগে (useExtra সামলায়)
    async function toggleBlock(u) {
        setSel(null);
        setBusyId(u._id);
        const wanted = !u.isBlocked;
        try {
            const res =
                u.role === "admin"
                    ? await extra.run({
                          action: "block_admin",
                          target: u._id,
                          targetLabel: label(u),
                          call: id => setUserBlocked(u._id, wanted, id)
                      })
                    : await setUserBlocked(u._id, wanted);
            if (!res) return; // approval এর ফর্ম খুলেছে
            replaceUser({ _id: u._id, isBlocked: res.isBlocked });
            toast.success(
                res.isBlocked
                    ? `${u.username} has been blocked`
                    : `${u.username} has been unblocked`
            );
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    }

    async function promote(u) {
        setSel(null);
        setBusyId(u._id);
        try {
            const res = await extra.run({
                action: "make_admin",
                target: u.email,
                targetLabel: label(u),
                call: id => makeAdmin(u.email, id)
            });
            if (!res) return;
            replaceUser(res);
            toast.success(`${u.username} is now an admin`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    }

    async function demote(u) {
        setSel(null);
        setBusyId(u._id);
        try {
            const res = await extra.run({
                action: "remove_admin",
                target: u._id,
                targetLabel: label(u),
                call: id => removeAdmin(u.email, id)
            });
            if (!res) return;
            replaceUser(res);
            toast.success(`${u.username} is a regular user again`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    }

    async function confirmDelete() {
        const u = toDelete;
        setBusyId(u._id);
        try {
            const res =
                u.role === "admin"
                    ? await extra.run({
                          action: "delete_admin",
                          target: u._id,
                          targetLabel: label(u),
                          call: id => deleteUserById(u._id, id)
                      })
                    : await deleteUserById(u._id);
            setToDelete(null);
            if (!res) return;
            setData(list => list.filter(x => x._id !== u._id));
            toast.success(`${u.username} was deleted`);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setBusyId(null);
        }
    }

    const protectedUser = u => u._id === me?._id || u.isSuperAdmin;

    return (
        <>
            <PageHead title="Users" sub="Every account in the system.">
                <button
                    className="btn btn-secondary"
                    onClick={reload}
                    disabled={loading}
                >
                    <Icon name="refresh" size={15} /> Refresh
                </button>
                <Link to="/admin/create-admin" className="btn btn-primary">
                    <Icon name="userPlus" size={16} /> Create admin
                </Link>
            </PageHead>

            {!me?.isSuperAdmin && (
                <div style={{ marginBottom: 16 }}>
                    <Callout icon="info">
                        <p>
                            Actions on <b>other admins</b> and promoting users
                            need the Super Admin's approval. You'll be asked to
                            send a request the first time.{" "}
                            <Link to="/approvals" className="link">
                                See my requests
                            </Link>
                        </p>
                    </Callout>
                </div>
            )}

            <section className="card">
                <div className="toolbar">
                    <div className="search">
                        <Icon name="search" size={16} />
                        <input
                            className="input"
                            placeholder="Search name, username or email"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            aria-label="Search users"
                        />
                    </div>
                    <div className="seg" role="group" aria-label="Filter users">
                        {FILTERS.map(f => (
                            <button
                                key={f.id}
                                className={filter === f.id ? "active" : ""}
                                onClick={() => setFilter(f.id)}
                            >
                                {f.label} {counts[f.id]}
                            </button>
                        ))}
                    </div>
                </div>

                {loading && !data ? (
                    <div className="card-body col">
                        {[0, 1, 2, 3].map(i => (
                            <Skeleton key={i} h={48} />
                        ))}
                    </div>
                ) : error && !data ? (
                    <ErrorState message={error} onRetry={reload} />
                ) : rows.length === 0 ? (
                    <Empty
                        icon="users"
                        title="No users found"
                        text="Try a different search or filter."
                    />
                ) : (
                    <div className="table-wrap">
                        <table className="table stack">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map(u => (
                                    <tr
                                        key={u._id}
                                        className="clickable"
                                        onClick={() => setSel(u)}
                                    >
                                        <td className="cell-main">
                                            <div className="cell-user">
                                                <Avatar
                                                    src={u.avatar}
                                                    name={u.fullName}
                                                    size={36}
                                                />
                                                <div style={{ minWidth: 0 }}>
                                                    <b className="truncate">
                                                        {u.fullName}
                                                        {u._id === me?._id && (
                                                            <span className="muted">
                                                                {" "}
                                                                (you)
                                                            </span>
                                                        )}
                                                    </b>
                                                    <small className="truncate">
                                                        @{u.username} ·{" "}
                                                        {u.email}
                                                    </small>
                                                </div>
                                            </div>
                                        </td>
                                        <td data-label="Role">
                                            <RoleBadge user={u} />
                                        </td>
                                        <td data-label="Status">
                                            <Badge
                                                tone={
                                                    u.isBlocked
                                                        ? "red"
                                                        : "green"
                                                }
                                                dot
                                            >
                                                {u.isBlocked
                                                    ? "Blocked"
                                                    : "Active"}
                                            </Badge>
                                        </td>
                                        <td
                                            data-label="Joined"
                                            className="nowrap muted"
                                        >
                                            {fmtDate(u.createdAt)}
                                        </td>
                                        <td className="cell-actions">
                                            <button
                                                className="btn btn-secondary btn-sm"
                                                disabled={busyId === u._id}
                                                onClick={e => {
                                                    e.stopPropagation();
                                                    setSel(u);
                                                }}
                                            >
                                                {busyId === u._id ? (
                                                    <span className="spin" />
                                                ) : (
                                                    "Manage"
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <Modal
                open={!!sel}
                onClose={() => setSel(null)}
                title={sel ? sel.fullName : ""}
                icon="user"
                tone="ok"
                footer={
                    <button
                        className="btn btn-secondary"
                        onClick={() => setSel(null)}
                    >
                        Close
                    </button>
                }
            >
                {sel && (
                    <>
                        <dl className="dl">
                            <dt>Username</dt>
                            <dd>@{sel.username}</dd>
                            <dt>Email</dt>
                            <dd>{sel.email}</dd>
                            <dt>Role</dt>
                            <dd>
                                <RoleBadge user={sel} />
                            </dd>
                            <dt>Status</dt>
                            <dd>{sel.isBlocked ? "Blocked" : "Active"}</dd>
                            <dt>Joined</dt>
                            <dd>{fmtDateTime(sel.createdAt)}</dd>
                            <dt>Monthly limit</dt>
                            <dd>{sel.monthlyEmailLimit ?? "—"} emails</dd>
                        </dl>

                        {protectedUser(sel) ? (
                            <Callout icon="info">
                                {sel._id === me?._id
                                    ? "You can't block, delete or change your own account here."
                                    : "The Super Admin can't be blocked, deleted or changed."}
                            </Callout>
                        ) : (
                            <div className="col" style={{ gap: 8 }}>
                                <button
                                    className="btn btn-secondary btn-block"
                                    onClick={() => toggleBlock(sel)}
                                >
                                    <Icon
                                        name={sel.isBlocked ? "unlock" : "ban"}
                                        size={16}
                                    />{" "}
                                    {sel.isBlocked
                                        ? "Unblock user"
                                        : "Block user"}
                                </button>
                                {sel.role === "admin" ? (
                                    <button
                                        className="btn btn-secondary btn-block"
                                        onClick={() => demote(sel)}
                                    >
                                        <Icon name="shield" size={16} /> Remove
                                        admin role
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-secondary btn-block"
                                        onClick={() => promote(sel)}
                                    >
                                        <Icon name="crown" size={16} /> Make
                                        admin
                                    </button>
                                )}
                                <button
                                    className="btn btn-danger-outline btn-block"
                                    onClick={() => {
                                        setToDelete(sel);
                                        setSel(null);
                                    }}
                                >
                                    <Icon name="trash" size={16} /> Delete user
                                </button>
                            </div>
                        )}
                    </>
                )}
            </Modal>

            <ConfirmModal
                open={!!toDelete}
                danger
                busy={!!toDelete && busyId === toDelete._id}
                title={`Delete ${toDelete?.fullName || "user"}?`}
                confirmLabel="Delete user"
                text="This permanently removes the account together with its API keys and email logs. It can't be undone."
                onConfirm={confirmDelete}
                onCancel={() => setToDelete(null)}
            >
                {toDelete?.role === "admin" && !me?.isSuperAdmin && (
                    <Callout tone="warn" icon="shieldCheck">
                        Deleting an admin needs the Super Admin's approval.
                    </Callout>
                )}
            </ConfirmModal>

            {extra.modal}
        </>
    );
}
