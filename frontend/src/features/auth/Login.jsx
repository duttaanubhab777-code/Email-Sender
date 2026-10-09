import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/Toast";
import { Brand } from "../../components/AppShell";
import Icon from "../../components/Icons";
import AuthHero from "./AuthHero";
import "../../styles/auth.css";

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // পাহারাদার থেকে আসলে আগের পেজের ঠিকানা মনে রাখা
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(0); // এরর এলে কার্ড ঝাঁকানোর জন্য
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const id = identifier.trim();
      // @ থাকলে ইমেইল, না থাকলে ইউজারনেম
      const payload = id.includes("@")
        ? { email: id.toLowerCase(), password }
        : { username: id.toLowerCase(), password };

      const u = await login(payload);
      toast.success(`Welcome back, ${u.fullName}!`);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
      setShake(s => s + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthHero />

      <section className="auth-side">
        <div key={shake} className={`card auth-card reveal ${shake ? "shake" : ""}`}>
          <div className="auth-mobile-brand"><Brand /></div>
          <h2>Welcome back</h2>
          <p className="sub">Sign in to manage your API keys.</p>

          {error && (
            <div className="alert alert-error" role="alert">
              <Icon name="alert" size={18} /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <label className="field">
              <span className="field-label">Email or username</span>
              <span className="field-box">
                <Icon name="user" size={18} />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value.toLowerCase())}
                  placeholder="you@example.com"
                  autoComplete="username"
                  required
                />
              </span>
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <span className="field-box">
                <Icon name="lock" size={18} />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="eye" onClick={() => setShowPw(v => !v)} aria-label="Show or hide password">
                  <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
                </button>
              </span>
            </label>

            <button type="submit" disabled={submitting} className="btn btn-primary btn-block">
              {submitting ? <><span className="spin" /> Signing in...</> : <>Sign in <Icon name="send" size={17} className="fly" /></>}
            </button>
          </form>

          <p className="switch-text">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
