import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { checkUsername, registerStart } from "../../services/api";
import { useToast } from "../../components/Toast";
import Icon from "../../components/Icons";
import PasswordField from "../../components/ui/PasswordField";
import { Callout } from "../../components/ui/Bits";
import {
    EMAIL_RE,
    USERNAME_RE,
    passwordScore,
    usernameFromEmail
} from "../../lib/format";
import { savePending } from "../../lib/pending";
import AuthLayout from "./AuthLayout";

const STRENGTH = ["", "Weak", "Fair", "Good", "Strong"];

export default function Register() {
    const toast = useToast();
    const navigate = useNavigate();
    const fileRef = useRef(null);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [edited, setEdited] = useState(false); // user নিজে username বদলালে auto-fill বন্ধ
    const [password, setPassword] = useState("");
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState("");
    const [uStatus, setUStatus] = useState("idle"); // idle | checking | ok | taken | invalid
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    // email লিখলে @ এর আগের অংশ username এ বসে (instant), তারপর server থেকে ফাঁকা নাম এনে ঠিক করে
    useEffect(() => {
        if (edited) return;
        if (!EMAIL_RE.test(email)) {
            setUsername(usernameFromEmail(email));
            setUStatus("idle");
            return;
        }
        setUsername(usernameFromEmail(email));
        const ctrl = new AbortController();
        const t = setTimeout(() => {
            setUStatus("checking");
            checkUsername({ email }, ctrl.signal)
                .then(d => {
                    setUsername(d.suggested);
                    setUStatus("ok");
                })
                .catch(err => {
                    if (err.name !== "AbortError") setUStatus("idle");
                });
        }, 450);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [email, edited]);

    // username নিজে লিখলে availability check
    useEffect(() => {
        if (!edited) return;
        if (!username) {
            setUStatus("idle");
            return;
        }
        if (!USERNAME_RE.test(username)) {
            setUStatus("invalid");
            return;
        }
        const ctrl = new AbortController();
        setUStatus("checking");
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
    }, [username, edited]);

    useEffect(
        () => () => {
            if (preview) URL.revokeObjectURL(preview);
        },
        [preview]
    );

    function pickFile(e) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith("image/"))
            return toast.error("Please choose an image file");
        if (f.size > 5 * 1024 * 1024)
            return toast.error("Image must be 5 MB or smaller");
        setAvatar(f);
        setPreview(URL.createObjectURL(f));
    }

    const score = passwordScore(password);
    const canSubmit =
        fullName.trim() &&
        EMAIL_RE.test(email) &&
        password.length >= 8 &&
        uStatus !== "taken" &&
        uStatus !== "invalid" &&
        uStatus !== "checking";

    async function submit(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append("fullName", fullName.trim());
            fd.append("email", email.trim().toLowerCase());
            if (username) fd.append("username", username);
            fd.append("password", password);
            if (avatar) fd.append("avatar", avatar);
            const data = await registerStart(fd);
            savePending({
                purpose: "register",
                email: data.email,
                maskedEmail: data.maskedEmail,
                resendUntil: Date.now() + data.resendAfterSeconds * 1000,
                expiresInMinutes: data.expiresInMinutes
            });
            toast.success("Verification code sent to your email");
            navigate("/users/register/verify", { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    const uHelp = {
        checking: <span className="help">Checking availability…</span>,
        ok: <span className="help ok">@{username} is available</span>,
        taken: <span className="help err">That username is already taken</span>,
        invalid: (
            <span className="help err">
                3–20 characters: lowercase letters, numbers, dot, underscore or
                dash
            </span>
        ),
        idle: (
            <span className="help">
                {edited ? "" : "Filled from your email. You can change it."}
            </span>
        )
    }[uStatus];

    return (
        <AuthLayout>
            <h1>Create your account</h1>
            <p className="sub">
                We'll email a 6-digit code to confirm it's you.
            </p>
            <form className="form" onSubmit={submit}>
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}

                <div className="avatar-pick">
                    <div className="preview">
                        {preview ? (
                            <img src={preview} alt="Selected avatar" />
                        ) : (
                            <Icon name="camera" size={22} />
                        )}
                    </div>
                    <div>
                        <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => fileRef.current?.click()}
                        >
                            {preview ? "Change photo" : "Add a photo"}
                        </button>
                        <div className="help" style={{ marginTop: 4 }}>
                            Optional · JPG or PNG up to 5 MB
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={pickFile}
                        />
                    </div>
                </div>

                <div className="field">
                    <label className="label" htmlFor="fullName">
                        Full name
                    </label>
                    <input
                        id="fullName"
                        className="input"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        autoComplete="name"
                        placeholder="Anubhab Dutta"
                        required
                    />
                </div>
                <div className="field">
                    <label className="label" htmlFor="email">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        className="input"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        autoComplete="email"
                        placeholder="you@example.com"
                        required
                    />
                </div>
                <div className="field">
                    <label className="label" htmlFor="username">
                        Username
                    </label>
                    <div className="input-wrap">
                        <input
                            id="username"
                            className={`input ${uStatus === "taken" || uStatus === "invalid" ? "is-error" : uStatus === "ok" ? "is-ok" : ""}`}
                            value={username}
                            onChange={e => {
                                setEdited(true);
                                setUsername(
                                    e.target.value
                                        .toLowerCase()
                                        .replace(/\s/g, "")
                                );
                            }}
                            autoComplete="off"
                            autoCapitalize="none"
                            spellCheck={false}
                            placeholder="Anubhab Dutta"
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
                    {uHelp}
                </div>
                <div className="field">
                    <PasswordField
                        id="password"
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
                                {password.length < 8 &&
                                    " · use at least 8 characters"}
                            </span>
                        </>
                    )}
                </div>

                <button
                    className="btn btn-primary btn-lg btn-block"
                    disabled={busy || !canSubmit}
                >
                    {busy ? <span className="spin" /> : "Continue"}
                </button>
            </form>
            <p className="auth-foot">
                Already have an account?{" "}
                <Link to="/users/login" className="link">
                    Sign in
                </Link>
            </p>
        </AuthLayout>
    );
}
