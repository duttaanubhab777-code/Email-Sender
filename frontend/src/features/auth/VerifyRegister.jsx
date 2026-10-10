import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { registerVerify } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { Callout } from "../../components/ui/Bits";
import { clearPending, loadPending } from "../../lib/pending";
import AuthLayout from "./AuthLayout";
import OtpStep from "./OtpStep";

export default function VerifyRegister() {
    const pending = loadPending("register");
    const { signIn } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const [otp, setOtp] = useState("");
    const [error, setError] = useState("");
    const [bad, setBad] = useState(false);
    const [busy, setBusy] = useState(false);

    if (!pending) return <Navigate to="/users/register" replace />;

    async function verify(code = otp) {
        if (busy || code.length !== 6) return;
        setError("");
        setBad(false);
        setBusy(true);
        try {
            const data = await registerVerify(pending.email, code);
            clearPending();
            signIn(data.user);
            toast.success("Account created. Welcome to Email Sender!");
            navigate("/users/dashboard", { replace: true });
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
            <h1>Check your email</h1>
            <p className="sub">
                Enter the 6-digit code we sent to <b>{pending.maskedEmail}</b>.
                It expires in {pending.expiresInMinutes || 10} minutes.
            </p>
            <form
                className="form"
                onSubmit={e => {
                    e.preventDefault();
                    verify();
                }}
            >
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
                    onComplete={verify}
                    disabled={busy}
                />
                <button
                    className="btn btn-primary btn-lg btn-block"
                    disabled={busy || otp.length !== 6}
                >
                    {busy ? (
                        <span className="spin" />
                    ) : (
                        "Verify and create account"
                    )}
                </button>
            </form>
            <p className="auth-foot">
                Wrong email?{" "}
                <Link
                    to="/users/register"
                    className="link"
                    onClick={clearPending}
                >
                    Start over
                </Link>
            </p>
        </AuthLayout>
    );
}
