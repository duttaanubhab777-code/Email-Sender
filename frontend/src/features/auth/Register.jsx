import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/api";
import { useToast } from "../../components/Toast";
import { LogoFull } from "../../components/Logo";
import Icon from "../../components/Icons";
import AuthHero from "./AuthHero";
import "../../styles/auth.css";

// পাসওয়ার্ডের জোর মাপা (০–4)
function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const LABELS = ["Very weak", "Weak", "Fair", "Good", "Strong"];

export default function Register() {
  const navigate = useNavigate();
  const toast = useToast();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [avatar, setAvatar] = useState(null);

  const [error, setError] = useState("");
  const [shake, setShake] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // ছবির প্রিভিউ (ব্রাউজারের মেমোরির URL — আনমাউন্টে মুছে ফেলতে হয়)
  const preview = useMemo(() => (avatar ? URL.createObjectURL(avatar) : ""), [avatar]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const score = strength(password);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("username", username.toLowerCase());
      formData.append("email", email.toLowerCase());
      formData.append("password", password);
      if (avatar) formData.append("avatar", avatar);

      await registerUser(formData);

      toast.success("Account created! Please sign in.");
      navigate("/login", { replace: true });
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
          <div className="auth-mobile-brand"><LogoFull width={210} className="auth-logo-full" /></div>
          <h2>Create your account</h2>
          <p className="sub">Get started in under a minute.</p>

          {error && (
            <div className="alert alert-error" role="alert">
              <Icon name="alert" size={18} /> <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="form">
            <label className="avatar-pick">
              <span className={`avatar-pick-circle ${preview ? "has" : ""}`}>
                {preview ? <img src={preview} alt="Preview" /> : <Icon name="camera" size={26} />}
              </span>
              <span className="avatar-pick-text">
                <b>Profile picture</b>
                <small>{avatar ? avatar.name : "Optional — tap to choose"}</small>
              </span>
              <input type="file" accept="image/*" hidden onChange={e => setAvatar(e.target.files[0] || null)} />
            </label>

            <label className="field">
              <span className="field-label">Full name</span>
              <span className="field-box">
                <Icon name="user" size={18} />
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} autoComplete="name" required />
              </span>
            </label>

            <label className="field">
              <span className="field-label">Username</span>
              <span className="field-box">
                <b className="at">@</b>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                  autoComplete="username"
                  required
                />
              </span>
              <small className="hint">Lowercase letters and numbers only</small>
            </label>

            <label className="field">
              <span className="field-label">Email</span>
              <span className="field-box">
                <Icon name="mail" size={18} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value.toLowerCase())} autoComplete="email" required />
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
                  autoComplete="new-password"
                  required
                />
                <button type="button" className="eye" onClick={() => setShowPw(v => !v)} aria-label="Show or hide password">
                  <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
                </button>
              </span>
              {password && (
                <span className="meter" data-score={score}>
                  <i /><i /><i /><i />
                  <em>{LABELS[score]}</em>
                </span>
              )}
            </label>

            <button type="submit" disabled={submitting} className="btn btn-primary btn-block">
              {submitting ? <><span className="spin" /> Creating account...</> : <>Create account <Icon name="spark" size={17} className="fly" /></>}
            </button>
          </form>

          <p className="switch-text">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
