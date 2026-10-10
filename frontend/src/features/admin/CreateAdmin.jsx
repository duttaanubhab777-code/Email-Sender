import { useState } from "react";
import { Link } from "react-router-dom";
import { createAdmin, makeAdmin } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import useExtra from "../../hooks/useExtra";
import { useToast } from "../../components/Toast";
import Icon from "../../components/Icons";
import PasswordField from "../../components/ui/PasswordField";
import { Callout, PageHead } from "../../components/ui/Bits";
import {
    EMAIL_RE,
    USERNAME_RE,
    passwordScore,
    usernameFromEmail
} from "../../lib/format";

const STRENGTH = ["", "Weak", "Fair", "Good", "Strong"];

// POST /admin/create-admin (নতুন account) · PUT /admin/make-admin (আগের user কে promote)
export default function CreateAdmin() {
    const { user } = useAuth();
    const toast = useToast();
    const extra = useExtra();
    const [mode, setMode] = useState("create"); // create | promote

    return (
        <>
            <PageHead
                title="Create admin"
                sub="Add a brand-new admin account or promote someone who already has one."
            />

            {!user?.isSuperAdmin && (
                <div style={{ marginBottom: 16 }}>
                    <Callout tone="warn" icon="shieldCheck">
                        <p>
                            This needs the <b>Super Admin's approval</b>. When
                            you submit, a request is sent. Once it's approved,
                            come back and submit again. The approval works once,
                            for 30 minutes.{" "}
                            <Link to="/approvals" className="link">
                                See my requests
                            </Link>
                        </p>
                    </Callout>
                </div>
            )}

            <div
                className="seg"
                role="group"
                aria-label="Mode"
                style={{ marginBottom: 16 }}
            >
                <button
                    className={mode === "create" ? "active" : ""}
                    onClick={() => setMode("create")}
                >
                    New account
                </button>
                <button
                    className={mode === "promote" ? "active" : ""}
                    onClick={() => setMode("promote")}
                >
                    Promote existing user
                </button>
            </div>

            {mode === "create" ? (
                <NewAdminForm extra={extra} toast={toast} />
            ) : (
                <PromoteForm extra={extra} toast={toast} />
            )}
            {extra.modal}
        </>
    );
}

function NewAdminForm({ extra, toast }) {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [edited, setEdited] = useState(false);
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [created, setCreated] = useState(null);

    const score = passwordScore(password);
    const effectiveUsername = edited ? username : usernameFromEmail(email);
    const usernameBad = edited && username && !USERNAME_RE.test(username);
    const ready =
        fullName.trim() &&
        EMAIL_RE.test(email) &&
        password.length >= 8 &&
        !usernameBad;

    async function submit(e) {
        e.preventDefault();
        if (!ready) return;
        setError("");
        setCreated(null);
        setBusy(true);
        const clean = email.trim().toLowerCase();
        const body = { fullName: fullName.trim(), email: clean, password };
        if (edited && username) body.username = username;
        try {
            const res = await extra.run({
                action: "create_admin",
                target: clean,
                targetLabel: clean,
                call: id => createAdmin(body, id)
            });
            if (!res) return; // approval এর ফর্ম খুলেছে
            setCreated(res);
            setFullName("");
            setEmail("");
            setUsername("");
            setEdited(false);
            setPassword("");
            toast.success("Admin created");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="card">
            <div className="card-head">
                <div>
                    <h2>New admin account</h2>
                    <p>
                        No email code is needed. The account is ready to sign
                        in.
                    </p>
                </div>
            </div>
            <form className="card-body form" onSubmit={submit}>
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}
                {created && (
                    <Callout tone="ok" icon="checkCircle">
                        <p>
                            <b>{created.fullName}</b> (@{created.username}) is
                            now an admin. Share the password with them securely.{" "}
                            <Link to="/admin/users" className="link">
                                View users
                            </Link>
                        </p>
                    </Callout>
                )}
                <div className="two">
                    <div className="field">
                        <label className="label" htmlFor="ca-name">
                            Full name
                        </label>
                        <input
                            id="ca-name"
                            className="input"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            autoComplete="off"
                            required
                        />
                    </div>
                    <div className="field">
                        <label className="label" htmlFor="ca-email">
                            Email
                        </label>
                        <input
                            id="ca-email"
                            type="email"
                            className="input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="off"
                            required
                        />
                    </div>
                </div>
                <div className="field">
                    <label className="label" htmlFor="ca-username">
                        Username <small>optional</small>
                    </label>
                    <input
                        id="ca-username"
                        className={`input ${usernameBad ? "is-error" : ""}`}
                        value={edited ? username : effectiveUsername}
                        onChange={e => {
                            setEdited(true);
                            setUsername(
                                e.target.value.toLowerCase().replace(/\s/g, "")
                            );
                        }}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="Filled from the email"
                    />
                    {usernameBad ? (
                        <span className="help err">
                            3–20 characters: lowercase letters, numbers, dot,
                            underscore or dash
                        </span>
                    ) : (
                        <span className="help">
                            Defaults to the part of the email before @. If it's
                            taken, the server picks a free one.
                        </span>
                    )}
                </div>
                <div className="field">
                    <PasswordField
                        id="ca-password"
                        label="Password"
                        value={password}
                        onChange={setPassword}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                    />
                    {password && (
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
                            </span>
                        </>
                    )}
                </div>
                <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button
                        className="btn btn-primary"
                        disabled={busy || !ready}
                    >
                        {busy ? (
                            <span className="spin" />
                        ) : (
                            <>
                                <Icon name="userPlus" size={16} /> Create admin
                            </>
                        )}
                    </button>
                </div>
            </form>
        </section>
    );
}

function PromoteForm({ extra, toast }) {
    const [email, setEmail] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(null);

    async function submit(e) {
        e.preventDefault();
        if (!EMAIL_RE.test(email)) return;
        setError("");
        setDone(null);
        setBusy(true);
        const clean = email.trim().toLowerCase();
        try {
            const res = await extra.run({
                action: "make_admin",
                target: clean,
                targetLabel: clean,
                call: id => makeAdmin(clean, id)
            });
            if (!res) return;
            setDone(res);
            setEmail("");
            toast.success("User promoted to admin");
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="card">
            <div className="card-head">
                <div>
                    <h2>Promote an existing user</h2>
                    <p>
                        Enter the email of someone who already has an account.
                    </p>
                </div>
            </div>
            <form className="card-body form" onSubmit={submit}>
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}
                {done && (
                    <Callout tone="ok" icon="checkCircle">
                        <p>
                            <b>{done.fullName}</b> (@{done.username}) is now an
                            admin.
                        </p>
                    </Callout>
                )}
                <div className="field">
                    <label className="label" htmlFor="pr-email">
                        User's email
                    </label>
                    <input
                        id="pr-email"
                        type="email"
                        className="input"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="person@example.com"
                        autoComplete="off"
                        required
                    />
                </div>
                <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button
                        className="btn btn-primary"
                        disabled={busy || !EMAIL_RE.test(email)}
                    >
                        {busy ? (
                            <span className="spin" />
                        ) : (
                            <>
                                <Icon name="crown" size={16} /> Make admin
                            </>
                        )}
                    </button>
                </div>
            </form>
        </section>
    );
}
