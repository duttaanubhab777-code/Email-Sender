import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import PasswordField from "../../components/ui/PasswordField";
import { Callout } from "../../components/ui/Bits";
import AuthLayout from "./AuthLayout";

export default function Login() {
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const location = useLocation();
    const redirectTo = location.state?.from?.pathname || "/users/dashboard";

    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function submit(e) {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
            const u = await login(identifier.trim().toLowerCase(), password);
            toast.success(`Signed in as ${u.fullName}`);
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <AuthLayout>
            <h1>Sign in</h1>
            <p className="sub">
                Use your email or username to open your dashboard.
            </p>
            <form className="form" onSubmit={submit}>
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}
                <div className="field">
                    <label className="label" htmlFor="identifier">
                        Email or username
                    </label>
                    <input
                        id="identifier"
                        className="input"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        autoComplete="username"
                        placeholder="you@example.com"
                        autoFocus
                        required
                    />
                </div>
                <PasswordField
                    id="password"
                    value={password}
                    onChange={setPassword}
                    right={
                        <Link
                            to="/users/forgot-password"
                            className="link"
                            style={{ fontWeight: 500, fontSize: 13 }}
                        >
                            Forgot password?
                        </Link>
                    }
                />
                <button
                    className="btn btn-primary btn-lg btn-block"
                    disabled={busy || !identifier || !password}
                >
                    {busy ? <span className="spin" /> : "Sign in"}
                </button>
            </form>
            <p className="auth-foot">
                New to Email Sender?{" "}
                <Link to="/users/register" className="link">
                    Create an account
                </Link>
            </p>
        </AuthLayout>
    );
}
