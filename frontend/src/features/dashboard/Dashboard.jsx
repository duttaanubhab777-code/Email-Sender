import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
    getDashboard,
    createApiKey,
    deleteApiKey,
    BASE_URL
} from "../../services/api";
import { useToast } from "../../components/Toast";
import ConfirmModal from "../../components/ConfirmModal";
import Avatar from "../../components/Avatar";
import CountUp from "../../components/CountUp";
import Ring from "../../components/Ring";
import Icon from "../../components/Icons";
import logoMark from "../../assets/logo-mark.png";
import "../../styles/Dashboard.css";

const mask = k =>
    k.length > 16 ? `${k.slice(0, 12)}${"•".repeat(12)}${k.slice(-4)}` : k;

// ---- Quick start: ready-made contact form ----
// 1) Upload the badge logo to Cloudinary, 2) paste its URL here.
// Cloudinary tip: w_64,f_auto,q_auto in the URL makes it small and fast.
const LOGO_URL =
    "https://res.cloudinary.com/khvkgpxq/image/upload/w_64,h_64,c_fit,f_auto,q_auto/v1791551108/badge-logo.png";

// Colour variables for dark mode (used twice: system dark + forced dark)
const ES_DARK = `--es-bg:#0f1a24;--es-bd:#1f3140;--es-tx:#e6eef4;--es-mu:#93a7b5;--es-in:#0a141c;--es-inb:#2a4152;--es-ac:#3b82f6;--es-ac2:#06b6d4;--es-ring:rgba(59,130,246,.28);--es-err:#f87171;--es-sh:0 18px 40px rgba(0,0,0,.45);--es-link:#60a5fa;`;

// The same CSS is used in the copied snippet and in the live preview
const ES_CSS = `.es-form{--es-bg:#fff;--es-bd:#e5e7eb;--es-tx:#1f2937;--es-mu:#6b7280;--es-in:#f9fafb;--es-inb:#d1d5db;--es-ac:#2563eb;--es-ac2:#0ea5e9;--es-ring:rgba(37,99,235,.18);--es-err:#dc2626;--es-sh:0 10px 30px rgba(15,23,42,.08);--es-link:#1d4ed8}
@media (prefers-color-scheme:dark){.es-form:not([data-theme="light"]){${ES_DARK}}}
.es-form[data-theme="dark"]{${ES_DARK}}
.es-form,.es-form *{box-sizing:border-box}
.es-form{position:relative;max-width:480px;margin:0 auto;padding:28px;color:var(--es-tx);background:var(--es-bg);border:1px solid var(--es-bd);border-radius:18px;box-shadow:var(--es-sh);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;transition:background .25s,border-color .25s}
.es-field{margin-bottom:16px}
.es-field label{display:block;margin-bottom:6px;font-size:14px;font-weight:600}
.es-field input,.es-field textarea{display:block;width:100%;padding:12px 14px;font:inherit;font-size:16px;color:var(--es-tx);background:var(--es-in);border:1px solid var(--es-inb);border-radius:12px;outline:none;transition:border-color .2s,box-shadow .2s}
.es-field input::placeholder,.es-field textarea::placeholder{color:var(--es-mu);opacity:.7}
.es-field input:focus,.es-field textarea:focus{border-color:var(--es-ac);box-shadow:0 0 0 4px var(--es-ring)}
.es-field textarea{min-height:120px;resize:vertical}
.es-hint{display:none;margin-top:5px;font-size:12.5px;color:var(--es-err)}
.es-field.touched input:invalid,.es-field.touched textarea:invalid{border-color:var(--es-err)}
.es-field.touched input:invalid~.es-hint,.es-field.touched textarea:invalid~.es-hint{display:block}
.es-msg{display:none;margin:0 0 14px;padding:11px 14px;font-size:14px;color:var(--es-err);border:1px solid var(--es-err);border-radius:10px}
.es-msg.show{display:block}
.es-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px 18px;font:inherit;font-size:16px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--es-ac),var(--es-ac2));border:0;border-radius:12px;cursor:pointer;transition:transform .15s,box-shadow .2s,opacity .2s}
.es-btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px var(--es-ring)}
.es-btn:disabled{opacity:.8;cursor:progress;transform:none}
.es-form.is-busy .es-btn::before{content:"";width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:es-spin .8s linear infinite}
@keyframes es-spin{to{transform:rotate(360deg)}}
.es-hp{position:absolute;left:-9999px;width:0;height:0;opacity:0}
.es-done{display:none;text-align:center;padding:18px 0 8px;outline:none}
.es-form.is-sent .es-body{display:none}
.es-form.is-sent .es-done{display:block}
.es-done svg{width:76px;height:76px;margin-bottom:10px}
.es-done circle{fill:none;stroke:var(--es-ac);stroke-width:2.5;stroke-dasharray:145;stroke-dashoffset:145;animation:es-draw .7s ease forwards}
.es-done path{fill:none;stroke:var(--es-ac);stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:40;stroke-dashoffset:40;animation:es-draw .45s .55s ease forwards}
@keyframes es-draw{to{stroke-dashoffset:0}}
.es-done h3{margin:0 0 6px;font-size:22px}
.es-done p{margin:0 auto 18px;max-width:300px;font-size:15px;line-height:1.6;color:var(--es-mu)}
.es-again{padding:10px 18px;font:inherit;font-size:14px;font-weight:700;color:var(--es-tx);background:transparent;border:1px solid var(--es-inb);border-radius:10px;cursor:pointer}
.es-again:hover{border-color:var(--es-ac);color:var(--es-ac)}
.es-badge{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px;font-size:12px;color:var(--es-mu);text-decoration:none}
.es-badge img{width:18px;height:18px;border-radius:4px}
.es-badge b{color:var(--es-link)}
@media (prefers-reduced-motion:reduce){.es-form *{animation-duration:.001ms!important;transition-duration:.001ms!important}}`;

// Tiny script: sends the form with fetch (no redirect). URLSearchParams = urlencoded body,
// which the backend's express.urlencoded() already parses (FormData would be multipart and would NOT be parsed).
const ES_JS = `(function () {
  var form = document.getElementById("es-form");
  var msg = form.querySelector(".es-msg");
  var btn = form.querySelector(".es-btn");
  var label = btn.textContent;

  function touch(el) {
    var f = el.closest(".es-field");
    if (f) f.classList.add("touched");
  }
  form.querySelectorAll("input,textarea").forEach(function (el) {
    el.addEventListener("blur", function () { touch(el); });
  });
  form.addEventListener("invalid", function (e) { touch(e.target); }, true);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.classList.remove("show");
    form.classList.add("is-busy");
    btn.disabled = true;
    btn.textContent = "Sending...";

    fetch(form.action, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams(new FormData(form))
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          form.querySelectorAll(".touched").forEach(function (f) { f.classList.remove("touched"); });
          form.classList.add("is-sent");
          form.querySelector(".es-done").focus();
          return;
        }
        throw new Error(
          res.status === 429 ? "Monthly limit reached. Please try again later."
          : res.status === 401 || res.status === 403 ? "This form is not set up correctly."
          : "Something went wrong. Please try again."
        );
      })
      .catch(function (err) {
        msg.textContent = err instanceof TypeError ? "Network error. Please check your connection." : err.message;
        msg.classList.add("show");
      })
      .then(function () {
        form.classList.remove("is-busy");
        btn.disabled = false;
        btn.textContent = label;
      });
  });

  form.querySelector(".es-again").addEventListener("click", function () {
    form.classList.remove("is-sent");
  });
})();`;

// Form markup (used for the snippet and for the preview; preview passes the bundled logo and no key)
const buildForm = ({
    key,
    action,
    theme,
    logo,
    home
}) => `<form class="es-form" id="es-form" data-theme="${theme}" action="${action}" method="POST">
  <div class="es-body">
    <input type="hidden" name="access_key" value="${key}">
    <input type="text" name="botcheck" class="es-hp" tabindex="-1" autocomplete="off" aria-hidden="true">

    <div class="es-field">
      <label for="es-name">Name</label>
      <input id="es-name" type="text" name="name" placeholder="John Doe" autocomplete="name" required>
      <small class="es-hint">Please enter your name</small>
    </div>
    <div class="es-field">
      <label for="es-email">Email</label>
      <input id="es-email" type="email" name="email" placeholder="john@example.com" autocomplete="email" required>
      <small class="es-hint">Enter a valid email address</small>
    </div>
    <div class="es-field">
      <label for="es-subject">Subject</label>
      <input id="es-subject" type="text" name="subject" placeholder="How can we help?" required>
      <small class="es-hint">Add a short subject</small>
    </div>
    <div class="es-field">
      <label for="es-message">Message</label>
      <textarea id="es-message" name="message" rows="5" maxlength="1000" placeholder="Write your message..." required></textarea>
      <small class="es-hint">Write a few words</small>
    </div>

    <p class="es-msg" role="alert"></p>
    <button type="submit" class="es-btn">Send message</button>
  </div>

  <div class="es-done" role="status" aria-live="polite" tabindex="-1">
    <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 14-16"/></svg>
    <h3>Message sent!</h3>
    <p>Thank you for reaching out. We will get back to you soon.</p>
    <button type="button" class="es-again">Send another message</button>
  </div>

  <a class="es-badge" href="${home}" target="_blank" rel="noopener">
    Powered by <img src="${logo}" alt="" onerror="this.style.display='none'"> <b>Email Sender</b>
  </a>
</form>`;

function DashboardSkeleton() {
    return (
        <div className="stack">
            <div className="skeleton sk-hero" />
            <div className="stats-grid">
                <div className="skeleton sk-stat" />
                <div className="skeleton sk-stat" />
                <div className="skeleton sk-stat" />
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
    const [formTheme, setFormTheme] = useState("auto"); // "auto" | "light" | "dark"

    const load = useCallback(signal => {
        setLoading(true);
        setError("");
        return getDashboard(signal)
            .then(setData)
            .catch(err => {
                if (err.name !== "AbortError") setError(err.message);
            })
            .finally(() => {
                if (!signal?.aborted) setLoading(false);
            });
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
            setData(d => ({
                ...d,
                totalApiKeys: d.totalApiKeys + 1,
                apiKeysList: [newKey, ...d.apiKeysList]
            }));
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
                <div className="empty-ic bad">
                    <Icon name="alert" size={30} />
                </div>
                <h3>Could not load data</h3>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => load()}>
                    Try again
                </button>
            </div>
        );
    }

    const {
        fullName,
        avatar,
        totalApiKeys,
        totalEmailsSent,
        apiKeysList = []
    } = data;
    const used = apiKeysList.reduce((s, k) => s + (k.usageCount || 0), 0);
    const limit = apiKeysList.reduce((s, k) => s + (k.monthlyLimit || 0), 0);
    const totalPercent = limit
        ? Math.min(100, Math.round((used / limit) * 100))
        : 0;

    // কুইক স্টার্টের Key: বেছে নেওয়াটা, না থাকলে প্রথমটা
    const snipKey =
        apiKeysList.find(k => k._id === snipKeyId) || apiKeysList[0];

    // shown = স্ক্রিনে (মাস্কড Key), copy = কপি করলে (আসল Key)
    const buildSnippet = key => {
        if (snipTab === "plain") {
            // No JS: normal HTML form. The "redirect" field sends the visitor to your own thank-you page.
            return `<!-- Email Sender contact form (unstyled: add your own CSS) -->
<form action="${BASE_URL}/mail/send" method="POST">
  <input type="hidden" name="access_key" value="${key}">
  <input type="hidden" name="redirect" value="https://your-site.com/thank-you">
  <input type="text" name="botcheck" style="position:absolute;left:-9999px;opacity:0" tabindex="-1" autocomplete="off" aria-hidden="true">

  <label>Name <input type="text" name="name" required></label>
  <label>Email <input type="email" name="email" required></label>
  <label>Subject <input type="text" name="subject" required></label>
  <label>Message <textarea name="message" rows="5" required></textarea></label>

  <button type="submit">Send message</button>
</form>`;
        }
        return `<!-- Email Sender contact form -->
<style>
${ES_CSS}
</style>

${buildForm({ key, action: `${BASE_URL}/mail/send`, theme: formTheme, logo: LOGO_URL, home: window.location.origin })}

<script>
${ES_JS}
</script>`;
    };
    const shownSnippet = buildSnippet(
        snipKey ? mask(snipKey.key) : "YOUR_API_KEY"
    );
    const copySnippet = buildSnippet(snipKey ? snipKey.key : "YOUR_API_KEY");

    const previewDark =
        formTheme === "dark" ||
        (formTheme === "auto" &&
            window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    const previewHtml =
        `<style>${ES_CSS}</style>` +
        buildForm({
            key: "",
            action: "#",
            theme: formTheme,
            logo: logoMark,
            home: "#"
        });

    return (
        <div className="stack">
            {/* হিরো */}
            <section className="card hero reveal" style={{ "--i": 0 }}>
                <Avatar
                    src={avatar}
                    name={fullName}
                    size={64}
                    className="hero-avatar"
                />
                <div className="hero-text">
                    <small>Welcome back</small>
                    <h1>{fullName}</h1>
                    <span className="chip">
                        <Icon name="user" size={14} /> @{user?.username}
                    </span>
                </div>
                <Ring percent={totalPercent} size={74} />
            </section>

            {/* স্ট্যাটস */}
            <section className="stats-grid">
                <div className="card stat reveal tilt" style={{ "--i": 1 }}>
                    <span className="stat-ic violet">
                        <Icon name="key" size={22} />
                    </span>
                    <div>
                        <small>Total API keys</small>
                        <h2>
                            <CountUp value={totalApiKeys} />
                        </h2>
                    </div>
                </div>
                <div className="card stat reveal tilt" style={{ "--i": 2 }}>
                    <span className="stat-ic cyan">
                        <Icon name="mail" size={22} />
                    </span>
                    <div>
                        <small>Total emails sent</small>
                        <h2>
                            <CountUp value={totalEmailsSent} />
                        </h2>
                    </div>
                </div>
                <div className="card stat reveal tilt" style={{ "--i": 3 }}>
                    <span className="stat-ic pink">
                        <Icon name="activity" size={22} />
                    </span>
                    <div>
                        <small>Monthly quota used</small>
                        <h2>
                            <CountUp value={used} />
                            <em> / {limit.toLocaleString()}</em>
                        </h2>
                    </div>
                </div>
            </section>

            {/* নতুন কী */}
            <section className="card reveal" style={{ "--i": 4 }}>
                <div className="card-head">
                    <h3>
                        <Icon name="plus" size={18} /> New API key
                    </h3>
                </div>
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
                    <button
                        type="submit"
                        disabled={creating}
                        className="btn btn-primary"
                    >
                        {creating ? (
                            <span className="spin" />
                        ) : (
                            <>
                                <Icon name="spark" size={17} /> Generate
                            </>
                        )}
                    </button>
                </form>
            </section>

            {/* কী লিস্ট */}
            <section className="reveal" style={{ "--i": 5 }}>
                <div className="section-title">
                    <h3>My API keys</h3>
                    <span className="chip">{apiKeysList.length}</span>
                </div>

                {apiKeysList.length === 0 ? (
                    <div className="card empty">
                        <div className="empty-ic">
                            <Icon name="key" size={30} />
                        </div>
                        <h3>No API keys yet</h3>
                        <p>Use the form above to create your first key.</p>
                    </div>
                ) : (
                    <div className="keys">
                        {apiKeysList.map((k, idx) => {
                            const percent = k.monthlyLimit
                                ? Math.min(
                                      100,
                                      Math.round(
                                          (k.usageCount / k.monthlyLimit) * 100
                                      )
                                  )
                                : 0;
                            const show = revealed[k._id];
                            return (
                                <article
                                    key={k._id}
                                    className={`card key-card tilt ${newId === k._id ? "is-new" : ""}`}
                                    style={{ "--i": idx }}
                                >
                                    <Ring percent={percent} size={58} />
                                    <div className="key-main">
                                        <div className="key-top">
                                            <h4>{k.name}</h4>
                                            <span
                                                className={`badge ${k.isActive === false ? "off" : "on"}`}
                                            >
                                                {k.isActive === false
                                                    ? "Inactive"
                                                    : "Active"}
                                            </span>
                                        </div>
                                        <code className="key-code">
                                            {show ? k.key : mask(k.key)}
                                        </code>
                                        <div className="key-meta">
                                            <span>
                                                <Icon name="mail" size={14} />{" "}
                                                {k.usageCount} /{" "}
                                                {k.monthlyLimit}
                                            </span>
                                            <span>
                                                <Icon name="clock" size={14} />{" "}
                                                {new Date(
                                                    k.createdAt
                                                ).toLocaleDateString("en-US")}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="key-actions">
                                        <button
                                            className="icon-btn"
                                            onClick={() =>
                                                setRevealed(r => ({
                                                    ...r,
                                                    [k._id]: !r[k._id]
                                                }))
                                            }
                                            aria-label="Show or hide key"
                                        >
                                            <Icon
                                                name={show ? "eyeOff" : "eye"}
                                                size={18}
                                            />
                                        </button>
                                        <button
                                            className={`icon-btn ${copiedId === k._id ? "ok" : ""}`}
                                            onClick={() =>
                                                copyText(k.key, k._id)
                                            }
                                            aria-label="Copy key"
                                        >
                                            <Icon
                                                name={
                                                    copiedId === k._id
                                                        ? "check"
                                                        : "copy"
                                                }
                                                size={18}
                                            />
                                        </button>
                                        <button
                                            className="icon-btn danger"
                                            onClick={() => setToDelete(k)}
                                            aria-label="Delete key"
                                        >
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
                    <h3>
                        <Icon name="terminal" size={18} /> Quick start
                    </h3>
                    <button
                        className={`btn btn-ghost btn-sm ${copiedId === "snip" ? "ok" : ""}`}
                        onClick={() => copyText(copySnippet, "snip")}
                    >
                        <Icon
                            name={copiedId === "snip" ? "check" : "copy"}
                            size={15}
                        />{" "}
                        {copiedId === "snip" ? "Copied" : "Copy code"}
                    </button>
                </div>

                <ol className="steps">
                    <li>
                        <b>1</b>
                        <span>Choose a form style and copy the code.</span>
                    </li>
                    <li>
                        <b>2</b>
                        <span>
                            Paste it into your website's HTML where the form
                            should appear.
                        </span>
                    </li>
                    <li>
                        <b>3</b>
                        <span>
                            {snipTab === "styled" ? (
                                <>
                                    Done: the form shows a success message by
                                    itself, no redirect needed.
                                </>
                            ) : (
                                <>
                                    Replace the <code>redirect</code> URL with
                                    your own thank-you page.
                                </>
                            )}
                        </span>
                    </li>
                </ol>

                <div className="snippet-bar">
                    <div className="code-tabs" role="tablist">
                        <button
                            role="tab"
                            aria-selected={snipTab === "styled"}
                            className={`code-tab ${snipTab === "styled" ? "active" : ""}`}
                            onClick={() => setSnipTab("styled")}
                        >
                            Ready-made form
                        </button>
                        <button
                            role="tab"
                            aria-selected={snipTab === "plain"}
                            className={`code-tab ${snipTab === "plain" ? "active" : ""}`}
                            onClick={() => setSnipTab("plain")}
                        >
                            HTML only
                        </button>
                    </div>
                    {snipTab === "styled" && (
                        <div
                            className="code-tabs"
                            role="group"
                            aria-label="Form theme"
                        >
                            {["auto", "light", "dark"].map(t => (
                                <button
                                    key={t}
                                    className={`code-tab ${formTheme === t ? "active" : ""}`}
                                    onClick={() => setFormTheme(t)}
                                >
                                    {t[0].toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                    {apiKeysList.length > 1 && (
                        <select
                            className="key-select"
                            value={snipKey?._id}
                            onChange={e => setSnipKeyId(e.target.value)}
                            aria-label="Choose API key"
                        >
                            {apiKeysList.map(k => (
                                <option key={k._id} value={k._id}>
                                    {k.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <p className="muted small">
                    {snipTab === "styled"
                        ? "A complete contact form with dark and light mode, a built-in success message (no redirect) and spam protection. Auto follows the visitor's device theme."
                        : "Only the form structure with all required fields wired up. Style it with your own CSS."}
                </p>

                {snipTab === "styled" && (
                    <div className="preview-frame">
                        <div className="frame-bar">
                            <i />
                            <i />
                            <i />
                            <span>your-website.com/contact</span>
                        </div>
                        <div
                            className={`frame-body ${previewDark ? "dark" : ""}`}
                            onSubmit={e => {
                                e.preventDefault();
                                toast.info(
                                    "This is a preview. The form is not submitted."
                                );
                            }}
                            dangerouslySetInnerHTML={{ __html: previewHtml }}
                        />
                    </div>
                )}

                <div className="code-label">
                    {snipTab === "styled" ? "Code" : "HTML"}
                </div>
                <pre className="snippet snippet-tall">
                    <code>{shownSnippet}</code>
                </pre>
                {!snipKey && (
                    <p className="hint">
                        Create an API key above and it will be filled in here
                        automatically.
                    </p>
                )}
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
