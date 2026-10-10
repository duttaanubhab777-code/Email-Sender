import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
    changePassword,
    checkUsername,
    getCurrentUser,
    updateAccount,
    updateAvatar
} from "../../services/api";
import useAsync from "../../hooks/useAsync";
import { useToast } from "../../components/Toast";
import Avatar from "../../components/Avatar";
import Icon from "../../components/Icons";
import PasswordField from "../../components/ui/PasswordField";
import {
    Badge,
    Callout,
    Empty,
    PageHead,
    RoleBadge,
    Skeleton
} from "../../components/ui/Bits";
import {
    USERNAME_RE,
    fmtDate,
    fmtDateTime,
    passwordScore
} from "../../lib/format";

const STRENGTH = ["", "Weak", "Fair", "Good", "Strong"];
const MAX_IMG = 5 * 1024 * 1024;

// GET /users/current-user · PATCH /users/update-account · PATCH /users/avatar · POST /users/change-password
export default function UserProfile() {
    const { user, setUser } = useAuth();
    const toast = useToast();
    const isAdmin = user?.role === "admin";

    return (
        <>
            <PageHead
                title="Account"
                sub="Your profile, sign-in details and security."
            />
            <div className="stack">
                <ProfileHero user={user} setUser={setUser} toast={toast} />
                <div className="split">
                    <DetailsCard user={user} setUser={setUser} toast={toast} />
                    <PasswordCard toast={toast} />
                </div>
                {isAdmin && <LoginHistory />}
            </div>
        </>
    );
}

// ---------- ছবি + নাম ----------
function ProfileHero({ user, setUser, toast }) {
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const preview = useMemo(
        () => (file ? URL.createObjectURL(file) : ""),
        [file]
    );

    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview]
    );

    function pick(e) {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        if (!f.type.startsWith("image/"))
            return toast.error("Please choose an image file");
        if (f.size > MAX_IMG)
            return toast.error("Image must be 5 MB or smaller");
        setFile(f);
    }

    async function save() {
        setSaving(true);
        try {
            const u = await updateAvatar(file);
            setUser(prev => ({ ...prev, ...u }));
            setFile(null);
            toast.success("Profile photo updated");
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="card profile-hero">
            <div className="avatar-edit">
                <Avatar
                    src={preview || user?.avatar}
                    name={user?.fullName}
                    size={84}
                />
                <label
                    className="cam"
                    htmlFor="avatar-input"
                    title="Change photo"
                >
                    <Icon name="camera" size={14} />
                </label>
                <input
                    id="avatar-input"
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={pick}
                />
            </div>
            <div className="grow">
                <h2 className="truncate">{user?.fullName}</h2>
                <p className="muted truncate">
                    @{user?.username} · {user?.email}
                </p>
                <div className="row-wrap" style={{ marginTop: 8 }}>
                    <RoleBadge user={user} />
                    {user?.createdAt && (
                        <span className="help">
                            Member since {fmtDate(user.createdAt)}
                        </span>
                    )}
                </div>
            </div>
            {file && (
                <div className="row-wrap">
                    <button
                        className="btn btn-secondary"
                        onClick={() => setFile(null)}
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={save}
                        disabled={saving}
                    >
                        {saving ? <span className="spin" /> : "Save photo"}
                    </button>
                </div>
            )}
        </section>
    );
}

// ---------- নাম + username ----------
function DetailsCard({ user, setUser, toast }) {
    const [fullName, setFullName] = useState(user?.fullName || "");
    const [username, setUsername] = useState(user?.username || "");
    const [uStatus, setUStatus] = useState("idle"); // idle | checking | ok | taken | invalid
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const nameChanged = fullName.trim() && fullName.trim() !== user?.fullName;
    const unameChanged = username && username !== user?.username;
    const dirty = nameChanged || unameChanged;

    // username বদলালে 450ms পর available কিনা দেখে
    useEffect(() => {
        if (!unameChanged) {
            setUStatus("idle");
            return;
        }
        if (!USERNAME_RE.test(username)) {
            setUStatus("invalid");
            return;
        }
        setUStatus("checking");
        const ctrl = new AbortController();
        const t = setTimeout(() => {
            checkUsername({ username }, ctrl.signal)
                .then(d => setUStatus(d.available ? "ok" : "taken"))
                .catch(err => {
                    if (err.name !== "AbortError") setUStatus("idle");
                });
        }, 450);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [username, unameChanged]);

    async function submit(e) {
        e.preventDefault();
        setError("");
        const body = {};
        if (nameChanged) body.fullName = fullName.trim();
        if (unameChanged) body.username = username;
        setSaving(true);
        try {
            const u = await updateAccount(body);
            setUser(prev => ({ ...prev, ...u }));
            setFullName(u.fullName);
            setUsername(u.username);
            toast.success("Account details updated");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    const blocked =
        uStatus === "taken" || uStatus === "invalid" || uStatus === "checking";

    return (
        <section className="card">
            <div className="card-head">
                <div>
                    <h2>Account details</h2>
                    <p>Change your name or username.</p>
                </div>
            </div>
            <form className="card-body form" onSubmit={submit}>
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}
                <div className="field">
                    <label className="label" htmlFor="acc-name">
                        Full name
                    </label>
                    <input
                        id="acc-name"
                        className="input"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        autoComplete="name"
                        required
                    />
                </div>
                <div className="field">
                    <label className="label" htmlFor="acc-username">
                        Username
                    </label>
                    <div className="input-wrap">
                        <input
                            id="acc-username"
                            className={`input ${uStatus === "taken" || uStatus === "invalid" ? "is-error" : uStatus === "ok" ? "is-ok" : ""}`}
                            value={username}
                            onChange={e =>
                                setUsername(
                                    e.target.value
                                        .toLowerCase()
                                        .replace(/\s/g, "")
                                )
                            }
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                        />
                        <span className="adorn static">
                            {uStatus === "checking" ? (
                                <span className="spin" />
                            ) : uStatus === "ok" ? (
                                <Icon name="checkCircle" size={17} />
                            ) : uStatus === "taken" || uStatus === "invalid" ? (
                                <Icon name="xCircle" size={17} />
                            ) : null}
                        </span>
                    </div>
                    {uStatus === "taken" ? (
                        <span className="help err">
                            That username is already taken
                        </span>
                    ) : uStatus === "invalid" ? (
                        <span className="help err">
                            3–20 characters: lowercase letters, numbers, dot,
                            underscore or dash
                        </span>
                    ) : uStatus === "ok" ? (
                        <span className="help ok">
                            @{username} is available
                        </span>
                    ) : (
                        <span className="help">
                            Your sign-in name and public handle.
                        </span>
                    )}
                </div>
                <div className="field">
                    <label className="label" htmlFor="acc-email">
                        Email
                    </label>
                    <input
                        id="acc-email"
                        className="input"
                        value={user?.email || ""}
                        disabled
                        readOnly
                    />
                    <span className="help">Email can't be changed.</span>
                </div>
                <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button
                        className="btn btn-primary"
                        disabled={saving || !dirty || blocked}
                    >
                        {saving ? <span className="spin" /> : "Save changes"}
                    </button>
                </div>
            </form>
        </section>
    );
}

// ---------- password বদলানো ----------
function PasswordCard({ toast }) {
    const [oldPw, setOldPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [newPw2, setNewPw2] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const score = passwordScore(newPw);
    const mismatch = newPw2 && newPw !== newPw2;
    const ready = oldPw && newPw.length >= 8 && newPw === newPw2;

    async function submit(e) {
        e.preventDefault();
        if (!ready) return;
        if (oldPw === newPw) {
            setError("Your new password must be different from the old one");
            return;
        }
        setError("");
        setSaving(true);
        try {
            await changePassword(oldPw, newPw);
            setOldPw("");
            setNewPw("");
            setNewPw2("");
            toast.success("Password changed");
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <section className="card">
            <div className="card-head">
                <div>
                    <h2>Change password</h2>
                    <p>Use at least 8 characters.</p>
                </div>
            </div>
            <form className="card-body form" onSubmit={submit}>
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}
                <PasswordField
                    id="old-pw"
                    label="Current password"
                    value={oldPw}
                    onChange={setOldPw}
                />
                <div className="field">
                    <PasswordField
                        id="new-pw"
                        label="New password"
                        value={newPw}
                        onChange={setNewPw}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                    />
                    {newPw && (
                        <>
                            <div
                                className={`strength s${score}`}
                                aria-hidden="true"
                            >
                                <i />
                                <i />
                                <i />
                                <i />
                            </div>
                            <span className="help">
                                Strength: <b>{STRENGTH[score]}</b>
                                {newPw.length < 8 &&
                                    " · use at least 8 characters"}
                            </span>
                        </>
                    )}
                </div>
                <PasswordField
                    id="new-pw2"
                    label="Confirm new password"
                    value={newPw2}
                    onChange={setNewPw2}
                    autoComplete="new-password"
                    error={mismatch ? "Passwords don't match" : ""}
                />
                <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button
                        className="btn btn-primary"
                        disabled={saving || !ready}
                    >
                        {saving ? <span className="spin" /> : "Update password"}
                    </button>
                </div>
            </form>
        </section>
    );
}

// ---------- login history: শুধু Admin / Super Admin দেখে ----------
function LoginHistory() {
    // /users/current-user শুধু admin দের loginHistory দেয় (select: false ফিল্ড)
    const { data, loading, error, reload } = useAsync(
        () => getCurrentUser(),
        []
    );
    const rows = useMemo(
        () => [...(data?.loginHistory || [])].reverse(),
        [data]
    );

    return (
        <section className="card">
            <div className="card-head">
                <div>
                    <h2>Login history</h2>
                    <p>
                        Your last sign-ins with IP address and time. Visible to
                        admins only.
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
                        <Skeleton key={i} h={36} />
                    ))}
                </div>
            ) : error && !data ? (
                <Empty
                    icon="alert"
                    title="Couldn't load login history"
                    text={error}
                >
                    <button className="btn btn-secondary" onClick={reload}>
                        <Icon name="refresh" size={15} /> Try again
                    </button>
                </Empty>
            ) : rows.length === 0 ? (
                <Empty
                    icon="clock"
                    title="No sign-ins recorded yet"
                    text="Each time you sign in, the IP address and time show up here."
                />
            ) : (
                <div className="table-wrap">
                    <table className="table stack">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>IP address</th>
                                <th>Signed in</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((h, i) => (
                                <tr key={h._id || `${h.loginTime}-${i}`}>
                                    <td className="cell-main muted">{i + 1}</td>
                                    <td
                                        data-label="IP address"
                                        className="mono"
                                    >
                                        {h.ipAddress || "—"}
                                    </td>
                                    <td
                                        data-label="Signed in"
                                        className="nowrap"
                                    >
                                        {fmtDateTime(h.loginTime)}{" "}
                                        {i === 0 && (
                                            <Badge tone="green">Latest</Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
