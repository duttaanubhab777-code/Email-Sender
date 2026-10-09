import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getDashboard, createApiKey, deleteApiKey, BASE_URL } from "../../services/api";
import { useToast } from "../../components/Toast";
import ConfirmModal from "../../components/ConfirmModal";
import Avatar from "../../components/Avatar";
import CountUp from "../../components/CountUp";
import Ring from "../../components/Ring";
import Icon from "../../components/Icons";
import logoMark from "../../assets/logo-mark.png";
import "../../styles/Dashboard.css";

const mask = k => (k.length > 16 ? `${k.slice(0, 12)}${"•".repeat(12)}${k.slice(-4)}` : k);

// ---- Quick start: ready-made form (the same CSS is used in the snippet and in the live preview) ----
const ES_CSS = `.es-form {
  position: relative;
  max-width: 480px;
  margin: 0 auto;
  padding: 28px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
.es-field { margin-bottom: 16px; }
.es-field label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 600; color: #1f2937; }
.es-field input, .es-field textarea {
  width: 100%; box-sizing: border-box; padding: 12px 14px;
  font: inherit; font-size: 15px; color: #111827;
  background: #f9fafb; border: 1px solid #d1d5db; border-radius: 10px;
  outline: none; transition: border-color .2s, box-shadow .2s;
}
.es-field input:focus, .es-field textarea:focus {
  border-color: #2563eb; background: #fff; box-shadow: 0 0 0 4px rgba(37, 99, 235, .15);
}
.es-field textarea { min-height: 120px; resize: vertical; }
.es-btn {
  width: 100%; padding: 13px 18px; font: inherit; font-size: 15px; font-weight: 700;
  color: #fff; background: linear-gradient(135deg, #2563eb, #0ea5e9);
  border: 0; border-radius: 10px; cursor: pointer; transition: transform .15s, box-shadow .2s;
}
.es-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 18px rgba(37, 99, 235, .35); }
.es-hp { position: absolute; left: -9999px; width: 0; height: 0; opacity: 0; }
.es-badge {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  margin-top: 16px; font-size: 12px; color: #6b7280; text-decoration: none;
}
.es-badge img { width: 18px; height: 18px; }
.es-badge b { color: #1d4ed8; }
.es-badge:hover b { color: #ea580c; }`;

// Public origin of the API (used for the badge logo hosted in backend/public)
const apiOrigin = () => {
  try { return new URL(BASE_URL).origin; } catch { return window.location.origin; }
};

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
  const [snipTab, setSnipTab] = useState("styled"); // "styled" | "plain"
  const [snipKeyId, setSnipKeyId] = useState(null); // কুইক স্টার্টে কোন Key দেখাবে

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

  // কুইক স্টার্টের Key: বেছে নেওয়াটা, না থাকলে প্রথমটা
  const snipKey = apiKeysList.find(k => k._id === snipKeyId) || apiKeysList[0];

  // shown = স্ক্রিনে (মাস্কড Key), copy = কপি করলে (আসল Key)
  const buildSnippet = key => {
    const fields = `  <input type="hidden" name="access_key" value="${key}">
  <input type="hidden" name="redirect" value="https://your-site.com/thank-you">
  <input type="text" name="botcheck" class="es-hp" style="position:absolute;left:-9999px;opacity:0" tabindex="-1" autocomplete="off" aria-hidden="true">`;

    if (snipTab === "plain") {
      return `<!-- Email Sender contact form (unstyled: add your own CSS) -->
<form class="es-form" action="${BASE_URL}/mail/send" method="POST">
${fields}

  <div class="es-field">
    <label for="es-name">Name</label>
    <input id="es-name" type="text" name="name" required>
  </div>
  <div class="es-field">
    <label for="es-email">Email</label>
    <input id="es-email" type="email" name="email" required>
  </div>
  <div class="es-field">
    <label for="es-subject">Subject</label>
    <input id="es-subject" type="text" name="subject" required>
  </div>
  <div class="es-field">
    <label for="es-message">Message</label>
    <textarea id="es-message" name="message" rows="5" required></textarea>
  </div>

  <button type="submit" class="es-btn">Send message</button>
</form>`;
    }

    return `<!-- Email Sender contact form -->
<style>
${ES_CSS}
</style>

<form class="es-form" action="${BASE_URL}/mail/send" method="POST">
${fields}

  <div class="es-field">
    <label for="es-name">Name</label>
    <input id="es-name" type="text" name="name" placeholder="John Doe" required>
  </div>
  <div class="es-field">
    <label for="es-email">Email</label>
    <input id="es-email" type="email" name="email" placeholder="john@example.com" required>
  </div>
  <div class="es-field">
    <label for="es-subject">Subject</label>
    <input id="es-subject" type="text" name="subject" placeholder="How can we help?" required>
  </div>
  <div class="es-field">
    <label for="es-message">Message</label>
    <textarea id="es-message" name="message" rows="5" placeholder="Write your message..." required></textarea>
  </div>

  <button type="submit" class="es-btn">Send message</button>

  <a class="es-badge" href="${window.location.origin}" target="_blank" rel="noopener">
    Powered by <img src="${apiOrigin()}/badge-logo.png" alt=""> <b>Email Sender</b>
  </a>
</form>`;
  };
  const shownSnippet = buildSnippet(snipKey ? mask(snipKey.key) : "YOUR_API_KEY");
  const copySnippet = buildSnippet(snipKey ? snipKey.key : "YOUR_API_KEY");

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
  const [snipTab, setSnipTab] = useState("styled"); // "styled" | "plain"
  const [snipKeyId, setSnipKeyId] = useState(null); // কুইক স্টার্টে কোন Key দেখাবে

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

  // কুইক স্টার্টের Key: বেছে নেওয়াটা, না থাকলে প্রথমটা
  const snipKey = apiKeysList.find(k => k._id === snipKeyId) || apiKeysList[0];

  // shown = স্ক্রিনে (মাস্কড Key), copy = কপি করলে (আসল Key)
  const buildSnippet = key => (snipTab === "form"
    ? `<form action="${BASE_URL}/mail/send" method="POST">
  <!-- Your API key -->
  <input type="hidden" name="access_key" value="${key}">
  <!-- Where to send the visitor after submit -->
  <input type="hidden" name="redirect" value="https://your-site.com/thank-you">
  <!-- Spam trap: keep hidden -->
  <input type="text" name="botcheck" style="display:none" tabindex="-1" autocomplete="off">

  <input type="text" name="name" placeholder="Your name" required>
  <input type="email" name="email" placeholder="Your email" required>
  <input type="text" name="subject" placeholder="Subject" required>
  <textarea name="message" placeholder="Your message" required></textarea>
  <button type="submit">Send message</button>
</form>`
    : `fetch("${BASE_URL}/mail/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${key}"
  },
  body: JSON.stringify({
    name: "Rahim",
    email: "rahim@example.com",
    subject: "Hello",
    message: "Contact form message"
  })
});`);
  const shownSnippet = buildSnippet(snipKey ? mask(snipKey.key) : "YOUR_API_KEY");
  const copySnippet = buildSnippet(snipKey ? snipKey.key : "YOUR_API_KEY");

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
  const [snipTab, setSnipTab] = useState("styled"); // "styled" | "plain"
  const [snipKeyId, setSnipKeyId] = useState(null); // কুইক স্টার্টে কোন Key দেখাবে

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
          <button className={`btn btn-ghost btn-sm ${copiedId === "snip" ? "ok" : ""}`} onClick={() => copyText(copySnippet, "snip")}>
            <Icon name={copiedId === "snip" ? "check" : "copy"} size={15} /> {copiedId === "snip" ? "Copied" : "Copy code"}
          </button>
        </div>

        <ol className="steps">
          <li><b>1</b><span>Choose a form style and copy the code.</span></li>
          <li><b>2</b><span>Paste it into your website's HTML where the form should appear.</span></li>
          <li><b>3</b><span>Replace the <code>redirect</code> URL with your own thank-you page.</span></li>
        </ol>

        <div className="snippet-bar">
          <div className="code-tabs" role="tablist">
            <button role="tab" aria-selected={snipTab === "styled"} className={`code-tab ${snipTab === "styled" ? "active" : ""}`} onClick={() => setSnipTab("styled")}>Ready-made form</button>
            <button role="tab" aria-selected={snipTab === "plain"} className={`code-tab ${snipTab === "plain" ? "active" : ""}`} onClick={() => setSnipTab("plain")}>HTML only</button>
          </div>
          {apiKeysList.length > 1 && (
            <select className="key-select" value={snipKey?._id} onChange={e => setSnipKeyId(e.target.value)} aria-label="Choose API key">
              {apiKeysList.map(k => <option key={k._id} value={k._id}>{k.name}</option>)}
            </select>
          )}
        </div>

        <p className="muted small">
          {snipTab === "styled"
            ? "A complete, responsive contact form with built-in styling and spam protection."
            : "Only the form structure with all required fields wired up. Style it with your own CSS."}
        </p>

        {snipTab === "styled" && (
          <div className="preview-frame">
            <div className="frame-bar"><i /><i /><i /><span>your-website.com/contact</span></div>
            <div className="frame-body">
              <style>{ES_CSS}</style>
              <form className="es-form" onSubmit={e => { e.preventDefault(); toast.info("This is a preview. The form is not submitted."); }}>
                <div className="es-field"><label htmlFor="pv-name">Name</label><input id="pv-name" type="text" placeholder="John Doe" /></div>
                <div className="es-field"><label htmlFor="pv-email">Email</label><input id="pv-email" type="email" placeholder="john@example.com" /></div>
                <div className="es-field"><label htmlFor="pv-subject">Subject</label><input id="pv-subject" type="text" placeholder="How can we help?" /></div>
                <div className="es-field"><label htmlFor="pv-message">Message</label><textarea id="pv-message" rows="4" placeholder="Write your message..." /></div>
                <button type="submit" className="es-btn">Send message</button>
                <a className="es-badge" href={window.location.origin} target="_blank" rel="noopener noreferrer" onClick={e => e.preventDefault()}>
                  Powered by <img src={logoMark} alt="" /> <b>Email Sender</b>
                </a>
              </form>
            </div>
          </div>
        )}

        <div className="code-label">{snipTab === "styled" ? "Code" : "HTML"}</div>
        <pre className="snippet snippet-tall"><code>{shownSnippet}</code></pre>
        {!snipKey && <p className="hint">Create an API key above and it will be filled in here automatically.</p>}
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
