import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getDashboard, createApiKey, deleteApiKey, BASE_URL } from "../../services/api";
import { useToast } from "../../components/Toast";
import ConfirmModal from "../../components/ConfirmModal";
import Avatar from "../../components/Avatar";
import CountUp from "../../components/CountUp";
import Ring from "../../components/Ring";
import Icon from "../../components/Icons";
import "../../styles/Dashboard.css";

const mask = k => (k.length > 16 ? `${k.slice(0, 12)}${"•".repeat(12)}${k.slice(-4)}` : k);

function DashboardSkeleton() {
  return (
    <div className="stack">
      <div className="skeleton sk-hero" />
      <div className="stats-grid">
        <div className="skeleton sk-stat" /><div className="skeleton sk-stat" /><div className="skeleton sk-stat" />
      </div>
      <div className="skeleton sk-block" />
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [newId, setNewId] = useState(null); // নতুন কার্ডে হাইলাইট অ্যানিমেশন

  const load = useCallback(signal => {
    setLoading(true);
    setError("");
    return getDashboard(signal)
      .then(setData)
      .catch(err => { if (err.name !== "AbortError") setError(err.message); })
      .finally(() => { if (!signal?.aborted) setLoading(false); });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const newKey = await createApiKey(name.trim());
      setData(d => ({ ...d, totalApiKeys: d.totalApiKeys + 1, apiKeysList: [newKey, ...d.apiKeysList] }));
      setNewId(newKey._id);
      setName("");
      toast.success("New API key created");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function copyText(text, id) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(c => (c === id ? null : c)), 1600);
    } catch {
      window.prompt("Copy this key:", text);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteApiKey(toDelete._id);
      setData(d => ({
        ...d,
        totalApiKeys: d.totalApiKeys - 1,
        apiKeysList: d.apiKeysList.filter(k => k._id !== toDelete._id)
      }));
      toast.success("API key deleted");
      setToDelete(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading && !data) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="card empty reveal">
        <div className="empty-ic bad"><Icon name="alert" size={30} /></div>
        <h3>Could not load data</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => load()}>Try again</button>
      </div>
    );
  }

  const { fullName, avatar, totalApiKeys, totalEmailsSent, apiKeysList = [] } = data;
  const used = apiKeysList.reduce((s, k) => s + (k.usageCount || 0), 0);
  const limit = apiKeysList.reduce((s, k) => s + (k.monthlyLimit || 0), 0);
  const totalPercent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  const snippet = `fetch("${BASE_URL}/mail/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_KEY"
  },
  body: JSON.stringify({
    senderName: "Rahim",
    senderEmail: "rahim@example.com",
    subject: "Hello",
    message: "Contact form message"
  })
});`;

  return (
    <div className="stack">
      {/* হিরো */}
      <section className="card hero reveal" style={{ "--i": 0 }}>
        <Avatar src={avatar} name={fullName} size={64} className="hero-avatar" />
        <div className="hero-text">
          <small>Welcome back</small>
          <h1>{fullName}</h1>
          <span className="chip"><Icon name="user" size={14} /> @{user?.username}</span>
        </div>
        <Ring percent={totalPercent} size={74} />
      </section>

      {/* স্ট্যাটস */}
      <section className="stats-grid">
        <div className="card stat reveal tilt" style={{ "--i": 1 }}>
          <span className="stat-ic violet"><Icon name="key" size={22} /></span>
          <div><small>Total API keys</small><h2><CountUp value={totalApiKeys} /></h2></div>
        </div>
        <div className="card stat reveal tilt" style={{ "--i": 2 }}>
          <span className="stat-ic cyan"><Icon name="mail" size={22} /></span>
          <div><small>Total emails sent</small><h2><CountUp value={totalEmailsSent} /></h2></div>
        </div>
        <div className="card stat reveal tilt" style={{ "--i": 3 }}>
          <span className="stat-ic pink"><Icon name="activity" size={22} /></span>
          <div><small>Monthly quota used</small><h2><CountUp value={used} /><em> / {limit.toLocaleString()}</em></h2></div>
        </div>
      </section>

      {/* নতুন কী */}
      <section className="card reveal" style={{ "--i": 4 }}>
        <div className="card-head"><h3><Icon name="plus" size={18} /> New API key</h3></div>
        <form onSubmit={handleCreate} className="inline-form">
          <span className="field-box grow">
            <Icon name="globe" size={18} />
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Website or project name"
              maxLength={60}
              required
            />
          </span>
          <button type="submit" disabled={creating} className="btn btn-primary">
            {creating ? <span className="spin" /> : <><Icon name="spark" size={17} /> Generate</>}
          </button>
        </form>
      </section>

      {/* কী লিস্ট */}
      <section className="reveal" style={{ "--i": 5 }}>
        <div className="section-title"><h3>My API keys</h3><span className="chip">{apiKeysList.length}</span></div>

        {apiKeysList.length === 0 ? (
          <div className="card empty">
            <div className="empty-ic"><Icon name="key" size={30} /></div>
            <h3>No API keys yet</h3>
            <p>Use the form above to create your first key.</p>
          </div>
        ) : (
          <div className="keys">
            {apiKeysList.map((k, idx) => {
              const percent = k.monthlyLimit ? Math.min(100, Math.round((k.usageCount / k.monthlyLimit) * 100)) : 0;
              const show = revealed[k._id];
              return (
                <article key={k._id} className={`card key-card tilt ${newId === k._id ? "is-new" : ""}`} style={{ "--i": idx }}>
                  <Ring percent={percent} size={58} />
                  <div className="key-main">
                    <div className="key-top">
                      <h4>{k.name}</h4>
                      <span className={`badge ${k.isActive === false ? "off" : "on"}`}>{k.isActive === false ? "Inactive" : "Active"}</span>
                    </div>
                    <code className="key-code">{show ? k.key : mask(k.key)}</code>
                    <div className="key-meta">
                      <span><Icon name="mail" size={14} /> {k.usageCount} / {k.monthlyLimit}</span>
                      <span><Icon name="clock" size={14} /> {new Date(k.createdAt).toLocaleDateString("en-US")}</span>
                    </div>
                  </div>
                  <div className="key-actions">
                    <button className="icon-btn" onClick={() => setRevealed(r => ({ ...r, [k._id]: !r[k._id] }))} aria-label="Show or hide key">
                      <Icon name={show ? "eyeOff" : "eye"} size={18} />
                    </button>
                    <button className={`icon-btn ${copiedId === k._id ? "ok" : ""}`} onClick={() => copyText(k.key, k._id)} aria-label="Copy key">
                      <Icon name={copiedId === k._id ? "check" : "copy"} size={18} />
                    </button>
                    <button className="icon-btn danger" onClick={() => setToDelete(k)} aria-label="Delete key">
                      <Icon name="trash" size={18} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick start */}
      <section className="card reveal" style={{ "--i": 6 }}>
        <div className="card-head">
          <h3><Icon name="terminal" size={18} /> Quick start</h3>
          <button className={`btn btn-ghost btn-sm ${copiedId === "snip" ? "ok" : ""}`} onClick={() => copyText(snippet, "snip")}>
            <Icon name={copiedId === "snip" ? "check" : "copy"} size={15} /> {copiedId === "snip" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="snippet"><code>{snippet}</code></pre>
      </section>

      <ConfirmModal
        open={!!toDelete}
        danger
        busy={deleting}
        title="Delete this API key?"
        text={`"${toDelete?.name}" will be permanently deleted and can no longer be used to send emails. This cannot be undone.`}
        confirmLabel="Delete key"
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setToDelete(null)}
      />
    </div>
  );
}
