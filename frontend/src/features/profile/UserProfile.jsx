import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { updateAccount, updateAvatar, changePassword, getCurrentUser } from "../../services/api";
import { useToast } from "../../components/Toast";
import Avatar from "../../components/Avatar";
import Icon from "../../components/Icons";
import "../../styles/Profile.css";

// স্টেটে refreshToken/password রাখব না
const sanitize = u => {
  const { refreshToken, password, ...safe } = u; // eslint-disable-line no-unused-vars
  return safe;
};

export default function UserProfile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const fileRef = useRef(null);

  // ---- লগইন হিস্ট্রি: শুধু অ্যাডমিন দেখবে ----
  const isAdmin = user?.role === "admin";
  const [history, setHistory] = useState([]);
  useEffect(() => {
    if (!isAdmin) return;
    let ignore = false;
    getCurrentUser()
      .then(u => { if (!ignore) setHistory([...(u.loginHistory || [])].reverse()); })
      .catch(() => { if (!ignore) setHistory([]); });
    return () => { ignore = true; };
  }, [isAdmin]);

  // ---- অ্যাভাটার ----
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  async function saveAvatar() {
    setUploading(true);
    try {
      const u = await updateAvatar(file);
      setUser(prev => ({ ...prev, ...sanitize(u) }));
      setFile(null);
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  }

  // ---- নাম ----
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [savingName, setSavingName] = useState(false);
  const nameChanged = fullName.trim() && fullName.trim() !== user?.fullName;

  async function saveName(e) {
    e.preventDefault();
    setSavingName(true);
    try {
      const u = await updateAccount(fullName.trim());
      setUser(prev => ({ ...prev, ...sanitize(u) }));
      toast.success("Name updated");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingName(false);
    }
  }

  // ---- পাসওয়ার্ড ----
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState("");

  async function savePassword(e) {
    e.preventDefault();
    setPwError("");
    if (newPw.length < 8) return setPwError("New password must be at least 8 characters");
    if (newPw !== confirmPw) return setPwError("New passwords do not match");
    if (newPw === oldPw) return setPwError("New password must be different from the old one");

    setSavingPw(true);
    try {
      await changePassword(oldPw, newPw);
      setOldPw(""); setNewPw(""); setConfirmPw("");
      toast.success("Password changed successfully");
    } catch (err) {
      setPwError(err.message);
    } finally {
      setSavingPw(false);
    }
  }

  const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null;

  return (
    <div className="stack">
      {/* প্রোফাইল হিরো */}
      <section className="card profile-hero reveal" style={{ "--i": 0 }}>
        <div className="avatar-edit">
          <Avatar src={preview || user?.avatar} name={user?.fullName} size={104} />
          <button className="avatar-btn" onClick={() => fileRef.current?.click()} aria-label="Change picture">
            <Icon name="camera" size={18} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => setFile(e.target.files[0] || null)} />
          <span className="avatar-ring" />
        </div>

        <div className="profile-info">
          <h1>{user?.fullName}</h1>
          <p>@{user?.username}</p>
          <div className="chips">
            <span className="chip"><Icon name="mail" size={14} /> {user?.email}</span>
            {user?.role === "admin" && <span className="chip chip-accent"><Icon name="shield" size={14} /> Admin</span>}
            {joined && <span className="chip"><Icon name="clock" size={14} /> Joined {joined}</span>}
          </div>
        </div>

        {file && (
          <div className="avatar-bar">
            <span>New picture: <b>{file.name}</b></span>
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => setFile(null)} disabled={uploading}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveAvatar} disabled={uploading}>
                {uploading ? <span className="spin" /> : "Save"}
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="two-col">
        {/* নাম */}
        <section className="card reveal" style={{ "--i": 1 }}>
          <div className="card-head"><h3><Icon name="edit" size={18} /> Account details</h3></div>
          <form onSubmit={saveName} className="form">
            <label className="field">
              <span className="field-label">Full name</span>
              <span className="field-box">
                <Icon name="user" size={18} />
                <input value={fullName} onChange={e => setFullName(e.target.value)} required />
              </span>
            </label>
            <label className="field">
              <span className="field-label">Username</span>
              <span className="field-box locked"><b className="at">@</b><input value={user?.username || ""} disabled /></span>
            </label>
            <label className="field">
              <span className="field-label">Email</span>
              <span className="field-box locked"><Icon name="mail" size={18} /><input value={user?.email || ""} disabled /></span>
            </label>
            <button className="btn btn-primary" disabled={!nameChanged || savingName}>
              {savingName ? <span className="spin" /> : "Save name"}
            </button>
          </form>
        </section>

        {/* পাসওয়ার্ড */}
        <section className="card reveal" style={{ "--i": 2 }}>
          <div className="card-head"><h3><Icon name="lock" size={18} /> Change password</h3></div>
          {pwError && <div className="alert alert-error"><Icon name="alert" size={18} /> <span>{pwError}</span></div>}
          <form onSubmit={savePassword} className="form">
            {[
              ["Current password", oldPw, setOldPw, "current-password"],
              ["New password", newPw, setNewPw, "new-password"],
              ["Confirm new password", confirmPw, setConfirmPw, "new-password"]
            ].map(([label, val, set, ac], i) => (
              <label className="field" key={label}>
                <span className="field-label">{label}</span>
                <span className="field-box">
                  <Icon name="lock" size={18} />
                  <input type={showPw ? "text" : "password"} value={val} onChange={e => set(e.target.value)} autoComplete={ac} required />
                  {i === 0 && (
                    <button type="button" className="eye" onClick={() => setShowPw(v => !v)} aria-label="Show or hide password">
                      <Icon name={showPw ? "eyeOff" : "eye"} size={18} />
                    </button>
                  )}
                </span>
              </label>
            ))}
            <button className="btn btn-primary" disabled={savingPw}>
              {savingPw ? <span className="spin" /> : "Update password"}
            </button>
          </form>
        </section>
      </div>

      {/* লগইন হিস্ট্রি — শুধু অ্যাডমিন */}
      {isAdmin && (
      <section className="card reveal" style={{ "--i": 3 }}>
        <div className="card-head">
          <h3><Icon name="clock" size={18} /> Recent sign-ins</h3>
          <span className="chip">{history.length}</span>
        </div>
        {history.length === 0 ? (
          <p className="muted">No sign-in records yet.</p>
        ) : (
          <ol className="timeline">
            {history.slice(0, 10).map((h, i) => (
              <li key={h._id || i} style={{ "--i": i }}>
                <span className="dot" />
                <div>
                  <b>{new Date(h.loginTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</b>
                  <small><Icon name="globe" size={13} /> {h.ipAddress || "Unknown IP"}</small>
                </div>
                {i === 0 && <span className="badge on">Latest</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
      )}
    </div>
  );
}
