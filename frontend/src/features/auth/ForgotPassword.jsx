import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../../services/api";
import { useToast } from "../../components/Toast";
import { Callout } from "../../components/ui/Bits";
import { EMAIL_RE } from "../../lib/format";
import { maskEmail, savePending } from "../../lib/pending";
import AuthLayout from "./AuthLayout";

export default function ForgotPassword() {
    const toast = useToast();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            const clean = email.trim().toLowerCase();
            const d = await forgotPassword(clean);
            savePending({
                purpose: "forgot_password",
                email: clean,
                maskedEmail: maskEmail(clean),
                resendUntil: Date.now() + (d?.resendAfterSeconds ?? 30) * 1000,
                expiresInMinutes: d?.expiresInMinutes ?? 10
            });
            toast.info(
                "If this email is registered, a reset code has been sent"
            );
            navigate("/users/forgot-password/reset", { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthLayout>
            <h1>Reset your password</h1>
            <p className="sub">
                Enter your account email and we'll send you a 6-digit code.
            </p>
            <form className="form" onSubmit={submit}>
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}
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
                        autoFocus
                        required
                    />
                </div>
                <button
                    className="btn btn-primary btn-lg btn-block"
                    disabled={busy || !EMAIL_RE.test(email)}
                >
                    {busy ? <span className="spin" /> : "Send reset code"}
                </button>
            </form>
            <p className="auth-foot">
                <Link to="/users/login" className="link">
                    Back to sign in
                </Link>
            </p>
        </AuthLayout>
    );
}
