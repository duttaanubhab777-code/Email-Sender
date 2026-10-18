import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getApiKeys, sendMailRaw } from "../../services/api";
import useAsync from "../../hooks/useAsync";
import { useToast } from "../../components/Toast";
import { useTheme } from "../../context/ThemeContext";
import Icon from "../../components/Icons";
import {
    Callout,
    CopyButton,
    Empty,
    ErrorState,
    PageHead,
    Skeleton
} from "../../components/ui/Bits";
import { fmtBytes, maskKey } from "../../lib/format";
import { highlight, TAB_LANG } from "../../lib/highlight";
import {
    SNIPPET_TABS as TABS,
    buildSnippet,
    endpoint,
    previewDoc
} from "../../lib/embedForm";

export default function MailSend() {
    const toast = useToast();
    const { theme } = useTheme();
    const [params] = useSearchParams();
    const { data, loading, error, reload } = useAsync(
        signal => getApiKeys(signal),
        []
    );
    const keys = useMemo(() => data || [], [data]);

    const [keyId, setKeyId] = useState(params.get("key") || "");
    const [tab, setTab] = useState("styled");
    const [formTheme, setFormTheme] = useState("auto");
    // "page" = complete HTML5 file (doctype, head, body) · "snippet" = only the form
    const [mode, setMode] = useState("page");
    const [expanded, setExpanded] = useState(false);
    const [form, setForm] = useState({
        name: "",
        email: "",
        subject: "Test from Email Sender",
        message: "This is a test message from my dashboard."
    });
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (keys.length && !keys.some(k => k._id === keyId))
            setKeyId(keys[0]._id);
    }, [keys, keyId]);

    const active = keys.find(k => k._id === keyId);
    const hasModes = tab === "styled" || tab === "plain";
    const realSnippet = buildSnippet(
        tab,
        active?.key || "YOUR_API_KEY",
        formTheme,
        mode
    );
    const shownSnippet = buildSnippet(
        tab,
        active ? maskKey(active.key) : "YOUR_API_KEY",
        formTheme,
        mode
    );
    const lineCount = shownSnippet.split("\n").length;

    // Saves the complete file (with the real key) so nothing has to be copied by hand
    function downloadFile() {
        const blob = new Blob([realSnippet], { type: "text/html;charset=utf-8" });
        const href = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = href;
        a.download = "contact.html";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 1500);
        toast.success("contact.html downloaded");
    }
    const previewDark =
        formTheme === "dark" || (formTheme === "auto" && theme === "dark");

    // VS Code style colours for the code box (the text is escaped by highlight)
    const lang = TAB_LANG[tab] || "js";
    const shownHtml = useMemo(
        () => highlight(shownSnippet, lang),
        [shownSnippet, lang]
    );

    const respLang = result?.body ? "json" : "text";
    const responseHtml = useMemo(() => {
        if (!result) return "";
        const text = result.body
            ? JSON.stringify(result.body, null, 2)
            : result.raw || "(empty)";
        return highlight(text, respLang);
    }, [result, respLang]);

    async function send(e) {
        e.preventDefault();
        if (!active) return;
        setSending(true);
        setResult(null);
        const r = await sendMailRaw(active.key, form);
        setResult(r);
        setSending(false);
        if (r.ok) toast.success("Test email sent. Check your inbox.");
        else
            toast.error(
                r.body?.message ||
                    (r.status === 0
                        ? "Couldn't reach the server"
                        : `Request failed (${r.status})`)
            );
    }

    if (loading && !data)
        return (
            <div className="stack">
                <Skeleton h={34} w={240} />
                <Skeleton h={320} />
            </div>
        );
    if (error && !data) return <ErrorState message={error} onRetry={reload} />;

    if (keys.length === 0) {
        return (
            <>
                <PageHead
                    title="Send & embed"
                    sub="Add a contact form to your website or send a test request."
                />
                <div className="card">
                    <Empty
                        icon="key"
                        title="You need an API key first"
                        text="Create a key, then come back here to copy a ready-made form."
                    >
                        <Link to="/apiKeys/all" className="btn btn-primary">
                            <Icon name="plus" size={16} /> Create API key
                        </Link>
                    </Empty>
                </div>
            </>
        );
    }

    return (
        <>
            <PageHead
                title="Send & embed"
                sub="Copy a ready-made contact form for your site, preview it, and send a real test request."
            >
                <div className="field" style={{ minWidth: 220 }}>
                    <select
                        className="select"
                        value={keyId}
                        onChange={e => setKeyId(e.target.value)}
                        aria-label="API key"
                    >
                        {keys.map(k => (
                            <option key={k._id} value={k._id}>
                                {k.name}
                            </option>
                        ))}
                    </select>
                </div>
            </PageHead>

            <div className="split">
                <section className="card">
                    <div className="tabs" role="tablist">
                        {TABS.map(t => (
                            <button
                                key={t.id}
                                role="tab"
                                aria-selected={tab === t.id}
                                className={`tab-btn ${tab === t.id ? "active" : ""}`}
                                onClick={() => setTab(t.id)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="card-body col">
                        {tab === "styled" && (
                            <div className="row-wrap between">
                                <span className="muted">Form colours</span>
                                <div
                                    className="seg"
                                    role="group"
                                    aria-label="Form theme"
                                >
                                    {["auto", "light", "dark"].map(t => (
                                        <button
                                            key={t}
                                            className={
                                                formTheme === t ? "active" : ""
                                            }
                                            onClick={() => setFormTheme(t)}
                                        >
                                            {t[0].toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        {hasModes && (
                            <div className="row-wrap between">
                                <span className="muted">Code type</span>
                                <div
                                    className="seg"
                                    role="group"
                                    aria-label="Code type"
                                >
                                    <button
                                        className={
                                            mode === "page" ? "active" : ""
                                        }
                                        onClick={() => setMode("page")}
                                    >
                                        Full HTML page
                                    </button>
                                    <button
                                        className={
                                            mode === "snippet" ? "active" : ""
                                        }
                                        onClick={() => setMode("snippet")}
                                    >
                                        Form only
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className={`code ${expanded ? "expanded" : ""}`}>
                            <div className="code-bar">
                                <span>
                                    {TABS.find(t => t.id === tab).label}
                                    <small className="code-meta">
                                        {lineCount} lines ·{" "}
                                        {fmtBytes(realSnippet.length)}
                                    </small>
                                </span>
                                <span className="code-actions">
                                    {hasModes && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={downloadFile}
                                        >
                                            <Icon name="download" size={14} />{" "}
                                            .html
                                        </button>
                                    )}
                                    <CopyButton
                                        text={realSnippet}
                                        label="Copy code"
                                        successMsg={`Full code copied (${lineCount} lines) with your real key`}
                                    />
                                </span>
                            </div>
                            <pre className="code-pre" data-lang={lang}>
                                <code
                                    dangerouslySetInnerHTML={{
                                        __html: shownHtml
                                    }}
                                />
                            </pre>
                            {lineCount > 28 && (
                                <button
                                    type="button"
                                    className={`code-more ${expanded ? "open" : ""}`}
                                    onClick={() => setExpanded(v => !v)}
                                >
                                    <Icon name="chevronDown" size={15} />{" "}
                                    {expanded
                                        ? "Show less"
                                        : `Show all ${lineCount} lines`}
                                </button>
                            )}
                        </div>
                        <p className="help">
                            The key is masked on screen. Copying (or the .html
                            download) gives you the complete code with the full
                            key. Save it as <b>contact.html</b> and open it in a
                            browser.
                        </p>
                        <div className="callout">
                            <Icon name="info" size={18} />
                            <div>
                                Endpoint:{" "}
                                <span className="inline-code">
                                    POST {endpoint()}
                                </span>
                                <br />
                                <span className="muted">
                                    Send the key as{" "}
                                    <span className="inline-code">
                                        access_key
                                    </span>{" "}
                                    in the form or an{" "}
                                    <span className="inline-code">
                                        x-api-key
                                    </span>{" "}
                                    header.
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="stack">
                    {tab === "styled" && (
                        <section className="card">
                            <div className="card-head">
                                <div>
                                    <h2>Live preview</h2>
                                    <p>
                                        Try it. Nothing is sent from the
                                        preview.
                                    </p>
                                </div>
                            </div>
                            <div className="card-body">
                                <iframe
                                    title="Form preview"
                                    className="preview-frame"
                                    sandbox="allow-scripts"
                                    srcDoc={previewDoc(formTheme, previewDark)}
                                />
                            </div>
                        </section>
                    )}

                    <section className="card">
                        <div className="card-head">
                            <div>
                                <h2>Send a test request</h2>
                                <p>
                                    Sends a real email to your account address
                                    using <b>{active?.name}</b>.
                                </p>
                            </div>
                        </div>
                        <form className="card-body form" onSubmit={send}>
                            <div className="two">
                                <div className="field">
                                    <label className="label" htmlFor="t-name">
                                        Name
                                    </label>
                                    <input
                                        id="t-name"
                                        className="input"
                                        value={form.name}
                                        onChange={e =>
                                            setForm({
                                                ...form,
                                                name: e.target.value
                                            })
                                        }
                                        placeholder="John Doe"
                                        required
                                    />
                                </div>
                                <div className="field">
                                    <label className="label" htmlFor="t-email">
                                        Email
                                    </label>
                                    <input
                                        id="t-email"
                                        type="email"
                                        className="input"
                                        value={form.email}
                                        onChange={e =>
                                            setForm({
                                                ...form,
                                                email: e.target.value
                                            })
                                        }
                                        placeholder="john@example.com"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="field">
                                <label className="label" htmlFor="t-sub">
                                    Subject
                                </label>
                                <input
                                    id="t-sub"
                                    className="input"
                                    value={form.subject}
                                    onChange={e =>
                                        setForm({
                                            ...form,
                                            subject: e.target.value
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="field">
                                <label className="label" htmlFor="t-msg">
                                    Message
                                </label>
                                <textarea
                                    id="t-msg"
                                    className="textarea"
                                    style={{ minHeight: 90 }}
                                    value={form.message}
                                    onChange={e =>
                                        setForm({
                                            ...form,
                                            message: e.target.value
                                        })
                                    }
                                    required
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                disabled={sending}
                            >
                                {sending ? (
                                    <span className="spin" />
                                ) : (
                                    <>
                                        <Icon name="send" size={15} /> Send test
                                        email
                                    </>
                                )}
                            </button>
                            <p className="help">
                                Counts toward your monthly quota.
                            </p>
                        </form>

                        {result && (
                            <div
                                className="card-body col fade-in"
                                style={{ borderTop: "1px solid var(--line)" }}
                            >
                                <div className="resp-meta">
                                    <span
                                        className={`pill-stat ${result.ok ? "good" : "bad"}`}
                                    >
                                        {result.status || "ERR"}{" "}
                                        {result.statusText}
                                    </span>
                                    <span className="pill-stat">
                                        <Icon name="clock" size={13} />{" "}
                                        {result.ms} ms
                                    </span>
                                    <span className="pill-stat">
                                        <Icon name="database" size={13} />{" "}
                                        {fmtBytes(result.bytes)} ·{" "}
                                        {result.bytes * 8} bits
                                    </span>
                                </div>
                                {!result.ok && result.status === 0 && (
                                    <Callout tone="danger" icon="alert">
                                        The server didn't respond. Check that
                                        the backend is running and CORS allows
                                        this site.
                                    </Callout>
                                )}
                                <div className="code">
                                    <div className="code-bar">
                                        <span>Response body</span>
                                    </div>
                                    <pre className="code-pre" data-lang={respLang}>
                                        <code
                                            dangerouslySetInnerHTML={{
                                                __html: responseHtml
                                            }}
                                        />
                                    </pre>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}
