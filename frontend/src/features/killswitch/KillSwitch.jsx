import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
    getKillOptions,
    killConfirm,
    killExecute,
    killResendOtp,
    killStart,
    killVerifyOtp
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import useAsync from "../../hooks/useAsync";
import useCooldown from "../../hooks/useCooldown";
import useExtra from "../../hooks/useExtra";
import { useToast } from "../../components/Toast";
import Icon from "../../components/Icons";
import OtpInput from "../../components/ui/OtpInput";
import PasswordField from "../../components/ui/PasswordField";
import {
    Badge,
    Callout,
    ErrorState,
    PageHead,
    Skeleton
} from "../../components/ui/Bits";
import { normalizeKillTargets } from "../../lib/approvals";
import { secondsLeft } from "../../lib/pending";

const STORE = "es-kill";
const SESSION_MS = 14 * 60 * 1000; // ব্যাকএন্ডে session ১৫ মিনিট

const ORDER = [
    "submissions",
    "apiKeys",
    "users",
    "admins",
    "media",
    "database",
    "code",
    "everything"
];
const TITLE = {
    submissions: "Email logs",
    apiKeys: "API keys",
    users: "User accounts",
    admins: "Admin accounts",
    media: "Uploaded files",
    database: "Entire database",
    code: "Source code",
    everything: "Everything"
};
const STEPS = ["Targets", "Are you sure?", "Email code", "Final check"];
const STAGE_NO = { setup: 0, confirm1: 1, otp: 2, confirm2: 3 };

const isYes = v => v.trim().toLowerCase() === "yes";

const readStore = () => {
    try {
        const s = JSON.parse(sessionStorage.getItem(STORE));
        if (!s || Date.now() - s.at > SESSION_MS) return null;
        return s;
    } catch {
        return null;
    }
};
const writeStore = v => {
    try {
        sessionStorage.setItem(
            STORE,
            JSON.stringify({ ...v, at: v.at || Date.now() })
        );
    } catch {
        /* ignore */
    }
};
const clearStore = () => {
    try {
        sessionStorage.removeItem(STORE);
    } catch {
        /* ignore */
    }
};

// GET /kill-switch/options · POST /start · /confirm · /resend-otp · /verify-otp · /execute
// ইচ্ছে করেই কোনো cancel route নেই: timer শুরু হলে আর থামানো যায় না
export default function KillSwitch() {
    const { user } = useAuth();
    const {
        data: opts,
        loading,
        error,
        reload
    } = useAsync(() => getKillOptions(), []);
    const saved = readStore();
    const [stage, setStage] = useState(saved?.stage || "setup");
    const [session, setSession] = useState(saved?.session || null);
    const [resendUntil, setResendUntil] = useState(saved?.resendUntil || 0);
    const [notice, setNotice] = useState("");

    function go(next, patch = {}) {
        const s = patch.session ?? session;
        const r = patch.resendUntil ?? resendUntil;
        if (patch.session) setSession(patch.session);
        if (patch.resendUntil !== undefined) setResendUntil(patch.resendUntil);
        setNotice("");
        setStage(next);
        writeStore({ stage: next, session: s, resendUntil: r, at: saved?.at });
    }

    function reset(message = "") {
        clearStore();
        setSession(null);
        setResendUntil(0);
        setStage("setup");
        setNotice(message);
    }

    // server বলে session শেষ / ভুল ধাপ হলে শুরু থেকে
    function onFail(err, toast) {
        if (err.status === 410 || err.status === 409) {
            reset(err.message);
            return true;
        }
        toast.error(err.message);
        return false;
    }

    if (loading && !opts) {
        return (
            <>
                <PageHead title="Kill switch" />
                <Skeleton h={320} />
            </>
        );
    }
    if (error && !opts) return <ErrorState message={error} onRetry={reload} />;
    if (opts?.status?.active) return <Navigate to="/system/status" replace />;

    const minutes = Math.round((opts.countdownSeconds || 600) / 60);

    return (
        <>
            <PageHead
                title="Kill switch"
                sub="Stops the whole system, then permanently deletes the data you choose."
            />

            <div className="danger-banner">
                <span className="big">
                    <Icon name="power" size={22} />
                </span>
                <div>
                    <b>This can't be undone</b>
                    <p>
                        Once armed, every page and API stops for {minutes}{" "}
                        minute
                        {minutes === 1 ? "" : "s"} with a public countdown.
                        There is <b>no cancel</b>. Then the selected data is
                        deleted and the system restarts fresh.
                    </p>
                </div>
            </div>

            {opts.dryRun && (
                <div style={{ marginBottom: 16 }}>
                    <Callout tone="warn" icon="info">
                        <p>
                            <b>Dry-run mode.</b> The countdown runs and the site
                            stops, but nothing is actually deleted.
                        </p>
                    </Callout>
                </div>
            )}

            <Stepper stage={stage} />

            {notice && (
                <div style={{ marginBottom: 16 }}>
                    <Callout tone="warn" icon="alert">
                        {notice}
                    </Callout>
                </div>
            )}

            {stage === "setup" && (
                <SetupStage
                    opts={opts}
                    isSuper={!!user?.isSuperAdmin}
                    onStarted={res => {
                        clearStore();
                        go("confirm1", { session: res, resendUntil: 0 });
                    }}
                />
            )}
            {stage === "confirm1" && session && (
                <Confirm1Stage
                    session={session}
                    onFail={onFail}
                    onSent={d =>
                        go("otp", {
                            resendUntil:
                                Date.now() +
                                (d?.resendAfterSeconds ?? 30) * 1000
                        })
                    }
                    onAborted={() =>
                        reset("Kill switch cancelled. Nothing was changed.")
                    }
                />
            )}
            {stage === "otp" && session && (
                <OtpStage
                    session={session}
                    resendUntil={resendUntil}
                    setResendUntil={ts => {
                        setResendUntil(ts);
                        writeStore({
                            stage,
                            session,
                            resendUntil: ts,
                            at: saved?.at
                        });
                    }}
                    onFail={onFail}
                    onVerified={d =>
                        go("confirm2", { session: { ...session, ...d } })
                    }
                    onRestart={() => reset()}
                />
            )}
            {stage === "confirm2" && session && (
                <Confirm2Stage
                    session={session}
                    minutes={minutes}
                    onFail={onFail}
                    onAborted={() =>
                        reset("Kill switch cancelled. Nothing was changed.")
                    }
                    onRestart={() => reset()}
                />
            )}
        </>
    );
}

function Stepper({ stage }) {
    const now = STAGE_NO[stage];
    return (
        <div className="steps" aria-label="Progress">
            {STEPS.map((t, i) => (
                <div
                    key={t}
                    className={`step ${i === now ? "now" : i < now ? "done" : ""}`}
                    aria-current={i === now ? "step" : undefined}
                >
                    <span className="n">
                        {i < now ? (
                            <Icon name="check" size={12} strokeWidth={3} />
                        ) : (
                            i + 1
                        )}
                    </span>
                    <span className="t truncate">{t}</span>
                </div>
            ))}
        </div>
    );
}

// ---------- ধাপ ১: কী কী ডিলিট হবে + নিজের password ----------
function SetupStage({ opts, isSuper, onStarted }) {
    const extra = useExtra();
    const [selected, setSelected] = useState([]);
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const keys = ORDER.filter(k => k in opts.targets);
    const everything = selected.includes("everything");
    const codeOff = !opts.codeDeleteAllowed;

    function toggle(k) {
        if (k === "everything") {
            setSelected(everything ? [] : ["everything"]);
            return;
        }
        setSelected(s =>
            s.includes(k)
                ? s.filter(x => x !== k)
                : [...s.filter(x => x !== "everything"), k]
        );
    }

    async function submit(e) {
        e.preventDefault();
        setError("");
        if (!selected.length)
            return setError("Select at least one thing to delete");
        if (!password) return setError("Enter your account password");
        setBusy(true);
        try {
            const res = await extra.run({
                action: "kill_switch",
                targets: selected,
                targetLabel: normalizeKillTargets(selected).join(", "),
                call: id => killStart({ password, targets: selected }, id)
            });
            if (!res) return; // Admin: approval এর ফর্ম খুলেছে
            setPassword("");
            onStarted(res);
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <section className="card">
            <div className="card-head">
                <div>
                    <h2>1. What should be destroyed?</h2>
                    <p>
                        Pick one or more. Choosing “Everything” selects all of
                        them.
                    </p>
                </div>
            </div>
            <form className="card-body form" onSubmit={submit}>
                {!isSuper && (
                    <Callout tone="warn" icon="shieldCheck">
                        <p>
                            As an Admin you need the{" "}
                            <b>Super Admin's approval</b> for this exact
                            selection. If you don't have one yet, you'll be
                            asked to send a request.
                        </p>
                    </Callout>
                )}
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}

                <div className="col" style={{ gap: 8 }}>
                    {keys.map(k => {
                        const off =
                            (k === "code" || k === "everything") && codeOff;
                        const locked = everything && k !== "everything";
                        const on = everything || selected.includes(k);
                        return (
                            <label
                                key={k}
                                className={`target ${on ? "on" : ""} ${off ? "off" : ""}`}
                            >
                                <span className="checkbox">
                                    <input
                                        type="checkbox"
                                        checked={on}
                                        disabled={off || locked}
                                        onChange={() => toggle(k)}
                                    />
                                </span>
                                <div>
                                    <b>{TITLE[k] || k}</b>
                                    <small>
                                        {opts.targets[k]}
                                        {off && " — disabled on this server"}
                                    </small>
                                </div>
                            </label>
                        );
                    })}
                </div>

                <PasswordField
                    id="kill-account-pw"
                    label="Your account password"
                    value={password}
                    onChange={setPassword}
                    hint="We check it before anything else happens."
                />

                <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button
                        className="btn btn-danger btn-lg"
                        disabled={busy || !selected.length || !password}
                    >
                        {busy ? (
                            <span className="spin" />
                        ) : (
                            <>
                                Continue <Icon name="arrowRight" size={16} />
                            </>
                        )}
                    </button>
                </div>
            </form>
            {extra.modal}
        </section>
    );
}

// ---------- ধাপ ২: "are you sure?" -> yes হলে email এ OTP যায় ----------
function Confirm1Stage({ session, onFail, onSent, onAborted }) {
    const toast = useToast();
    const [yes, setYes] = useState("");
    const [busy, setBusy] = useState(false);

    async function send() {
        setBusy(true);
        try {
            const d = await killConfirm(session.sessionId, "yes");
            toast.info("A code was sent to your email");
            onSent(d);
        } catch (err) {
            onFail(err, toast);
        } finally {
            setBusy(false);
        }
    }

    async function abort() {
        setBusy(true);
        try {
            await killConfirm(session.sessionId, "no");
        } catch {
            /* session আগেই শেষ হয়ে থাকলেও কিছু যায় আসে না */
        }
        setBusy(false);
        onAborted();
    }

    return (
        <section className="card">
            <div className="card-head">
                <div>
                    <h2>2. Are you sure?</h2>
                    <p>Password accepted. Read this carefully.</p>
                </div>
            </div>
            <div className="card-body col">
                <div className="prompt">{session.prompt}</div>
                <TargetBadges targets={session.targets} />
                <div className="field">
                    <label className="label" htmlFor="kill-yes1">
                        Type <span className="inline-code">yes</span> to
                        continue
                    </label>
                    <input
                        id="kill-yes1"
                        className="input"
                        value={yes}
                        onChange={e => setYes(e.target.value)}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="yes"
                    />
                </div>
            </div>
            <div className="card-foot">
                <button
                    className="btn btn-secondary"
                    onClick={abort}
                    disabled={busy}
                >
                    Cancel
                </button>
                <button
                    className="btn btn-danger"
                    onClick={send}
                    disabled={busy || !isYes(yes)}
                >
                    {busy ? <span className="spin" /> : "Yes, email me a code"}
                </button>
            </div>
        </section>
    );
}

// ---------- ধাপ ৩: email এ আসা ৬ সংখ্যার code ----------
function OtpStage({
    session,
    resendUntil,
    setResendUntil,
    onFail,
    onVerified,
    onRestart
}) {
    const toast = useToast();
    const [otp, setOtp] = useState("");
    const [bad, setBad] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [sending, setSending] = useState(false);
    const [left, startCooldown] = useCooldown(secondsLeft(resendUntil));

    async function verify(code = otp) {
        if (busy || code.length !== 6) return;
        setError("");
        setBad(false);
        setBusy(true);
        try {
            const d = await killVerifyOtp(session.sessionId, code);
            onVerified(d);
        } catch (err) {
            if (err.status === 410 || err.status === 409)
                return onFail(err, toast);
            setError(err.message);
            setBad(true);
            setTimeout(() => setBad(false), 500);
        } finally {
            setBusy(false);
        }
    }

    async function resend() {
        setSending(true);
        try {
            const d = await killResendOtp(session.sessionId);
            const secs = d?.resendAfterSeconds ?? 30;
            startCooldown(secs);
            setResendUntil(Date.now() + secs * 1000);
            setOtp("");
            toast.success("A new code has been sent");
        } catch (err) {
            if (err.retryAfter) {
                startCooldown(err.retryAfter);
                setResendUntil(Date.now() + err.retryAfter * 1000);
            }
            onFail(err, toast);
        } finally {
            setSending(false);
        }
    }

    return (
        <section className="card">
            <div className="card-head">
                <div>
                    <h2>3. Enter the code from your email</h2>
                    <p>It's a 6-digit code and it expires in 5 minutes.</p>
                </div>
            </div>
            <form
                className="card-body form"
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
                <OtpInput
                    value={otp}
                    onChange={setOtp}
                    bad={bad}
                    disabled={busy}
                    onComplete={verify}
                />
                <div className="center help">
                    {left > 0 ? (
                        <>
                            Resend code in <b className="mono">{left}s</b>
                        </>
                    ) : (
                        <>
                            Didn't get the code?{" "}
                            <button
                                type="button"
                                className="link"
                                onClick={resend}
                                disabled={sending}
                            >
                                {sending ? "Sending…" : "Resend code"}
                            </button>
                        </>
                    )}
                </div>
                <div
                    className="row"
                    style={{ justifyContent: "space-between" }}
                >
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={onRestart}
                    >
                        Start over
                    </button>
                    <button
                        className="btn btn-danger"
                        disabled={busy || otp.length !== 6}
                    >
                        {busy ? <span className="spin" /> : "Verify code"}
                    </button>
                </div>
            </form>
        </section>
    );
}

// ---------- ধাপ ৪: শেষ yes + kill switch এর নিজস্ব password ----------
function Confirm2Stage({ session, minutes, onFail, onAborted, onRestart }) {
    const toast = useToast();
    const navigate = useNavigate();
    const [yes, setYes] = useState("");
    const [killPw, setKillPw] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    async function arm(e) {
        e.preventDefault();
        if (!isYes(yes) || !killPw) return;
        setError("");
        setBusy(true);
        try {
            await killExecute(session.sessionId, killPw);
            clearStore();
            toast.warning("Kill switch armed. The countdown has started.");
            navigate("/system/status", { replace: true });
        } catch (err) {
            // ভুল password এ attempt বাকি থাকলে এখানেই থাকে, ৩ বার ভুল হলে session বন্ধ
            if (err.status === 410 || err.status === 409)
                return onFail(err, toast);
            if (/Session closed/i.test(err.message)) {
                // ৩ বার ভুল: ব্যাকএন্ড session মুছে দিয়েছে, শুরু থেকে করতে হবে
                const closed = new Error(err.message);
                closed.status = 410;
                return onFail(closed, toast);
            }
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function abort() {
        setBusy(true);
        try {
            await killExecute(session.sessionId, "", "no");
        } catch {
            /* ignore */
        }
        setBusy(false);
        onAborted();
    }

    return (
        <section className="card danger">
            <div className="card-head">
                <div>
                    <h2>4. Final check</h2>
                    <p>One more password, then the countdown starts.</p>
                </div>
            </div>
            <form className="card-body form" onSubmit={arm}>
                <div className="prompt">{session.prompt}</div>
                <TargetBadges targets={session.targets} />
                {error && (
                    <Callout tone="danger" icon="alert">
                        {error}
                    </Callout>
                )}
                <div className="field">
                    <label className="label" htmlFor="kill-yes2">
                        Type <span className="inline-code">yes</span> to confirm
                    </label>
                    <input
                        id="kill-yes2"
                        className="input"
                        value={yes}
                        onChange={e => setYes(e.target.value)}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder="yes"
                    />
                </div>
                <PasswordField
                    id="kill-password"
                    label="Kill switch password"
                    value={killPw}
                    onChange={setKillPw}
                    autoComplete="off"
                    hint="This is separate from your account password. 3 wrong tries close the session."
                />
                <div
                    className="row"
                    style={{ justifyContent: "space-between" }}
                >
                    <div className="row">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={abort}
                            disabled={busy}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={onRestart}
                            disabled={busy}
                        >
                            Start over
                        </button>
                    </div>
                    <button
                        className="btn btn-danger btn-lg"
                        disabled={busy || !isYes(yes) || !killPw}
                    >
                        {busy ? (
                            <span className="spin" />
                        ) : (
                            <>
                                <Icon name="power" size={17} /> Arm kill switch
                            </>
                        )}
                    </button>
                </div>
                <p className="help center">
                    The site stops for {minutes} minute
                    {minutes === 1 ? "" : "s"}, then the wipe runs.
                </p>
            </form>
        </section>
    );
}

function TargetBadges({ targets = [] }) {
    return (
        <div className="row-wrap">
            {targets.map(t => (
                <Badge key={t} tone="red">
                    {TITLE[t] || t}
                </Badge>
            ))}
        </div>
    );
}
