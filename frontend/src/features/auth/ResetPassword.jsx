import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { resetPassword } from "../../services/api";
import { useToast } from "../../components/Toast";
import PasswordField from "../../components/ui/PasswordField";
import { Callout } from "../../components/ui/Bits";
import { passwordScore } from "../../lib/format";
import { clearPending, loadPending } from "../../lib/pending";
import AuthLayout from "./AuthLayout";
import OtpStep from "./OtpStep";

export default function ResetPassword() {
    const pending = loadPending("forgot_password");
    const toast = useToast();
    const navigate = useNavigate();
    const [otp, setOtp] = useState("");
    const [pw, setPw] = useState("");
    const [pw2, setPw2] = useState("");
    const [error, setError] = useState("");
    const [bad, setBad] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!pending) return <Navigate to="/users/forgot-password" replace />;

    const mismatch = pw2 && pw !== pw2;
    const ready = otp.length === 6 && pw.length >= 8 && pw === pw2;
    const score = passwordScore(pw);

    async function submit(e) {
        e.preventDefault();
        if (!ready) return;
        setError("");
        setBad(false);
        setBusy(true);
        try {
            await resetPassword({ email: pending.email, otp, newPassword: pw });
            clearPending();
            toast.success(
                "Password reset successfully. Please sign in with your new password."
            );
            navigate("/users/login", { replace: true });
        } catch (err) {
            setError(err.message);
            setBad(true);
            setTimeout(() => setBad(false), 500);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthLayout>
            <h1>Set a new password</h1>
            <p className="sub">
                Enter the code sent to <b>{pending.maskedEmail}</b> and choose a
                new password.
            </p>
            <form className="form" onSubmit={submit}>
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}
                <OtpStep
                    pending={pending}
                    otp={otp}
                    setOtp={setOtp}
                    bad={bad}
                    disabled={busy}
                />
                <div className="field">
                    <PasswordField
                        id="new-pw"
                        label="New password"
                        value={pw}
                        onChange={setPw}
                        autoComplete="new-password"
                        placeholder="At least 8 characters"
                    />
                    {pw && (
                        <div
                            className={`strength s${score}`}
                            aria-hidden="true"
                        >
                            <i />
                            <i />
                            <i />
                            <i />
                        </div>
                    )}
                </div>
                <PasswordField
                    id="new-pw2"
                    label="Confirm new password"
                    value={pw2}
                    onChange={setPw2}
                    autoComplete="new-password"
                    error={mismatch ? "Passwords don't match" : ""}
                />
                <button
                    className="btn btn-primary btn-lg btn-block"
                    disabled={busy || !ready}
                >
                    {busy ? <span className="spin" /> : "Reset password"}
                </button>
            </form>
            <p className="auth-foot">
                <Link to="/users/login" className="link" onClick={clearPending}>
                    Back to sign in
                </Link>
            </p>
        </AuthLayout>
    );
}
