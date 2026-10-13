import nodemailer from "nodemailer";
import { ApiError } from "../utils/ApiError.js";
import { OTP_PURPOSES } from "../constants.js";

let transporter;
const getTransporter = () =>
    (transporter ??= nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        // SMTP আটকে গেলে request অনন্তকাল "loading" এ থাকবে না
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000
    }));

// Kill switch এর পরে নতুন করে connection নেওয়ার জন্য
export const resetMailer = () => {
    transporter?.close?.();
    transporter = undefined;
};

export const escapeHtml = v =>
    String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

const shell = (heading, inner) => `<!DOCTYPE html><html><body style="margin:0;padding:24px 0;background:#09090b;font-family:Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:100%;background:#18181b;border:1px solid #27272a;border-radius:14px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#ff007f,#7928ca,#4338ca);padding:22px;text-align:center;color:#fff;font-size:20px;font-weight:700;">${escapeHtml(heading)}</td></tr>
<tr><td style="padding:28px;color:#e4e4e7;font-size:14px;line-height:1.6;">${inner}</td></tr>
<tr><td style="padding:14px;text-align:center;background:#09090b;color:#71717a;font-size:12px;">Email Sender</td></tr>
</table></td></tr></table></body></html>`;

// Render free plan এ SMTP পোর্ট (25/465/587) বন্ধ। তাই HTTPS (পোর্ট 443) এ পাঠানো হয়।
// MAIL_PROVIDER দিয়ে বেছে নেওয়া যায়: relay | brevo | smtp | auto (default)
//   auto হলে অগ্রাধিকার: ১) BREVO_API_KEY  ২) MAIL_RELAY_URL (PythonAnywhere + নিজের Gmail)  ৩) SMTP (শুধু local এ কাজ করে)
const FROM_EMAIL = () =>
    (process.env.MAIL_FROM || process.env.SMTP_USER || "").trim();

const cleanName = v =>
    String(v || "Email Sender").replace(/[\r\n"<>]+/g, " ").trim().slice(0, 80) ||
    "Email Sender";

const sendViaBrevo = async ({ to, subject, html, fromName, replyTo }) => {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            "api-key": process.env.BREVO_API_KEY.trim(),
            "content-type": "application/json",
            accept: "application/json"
        },
        body: JSON.stringify({
            sender: { name: fromName, email: FROM_EMAIL() },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            ...(replyTo?.email
                ? { replyTo: { email: replyTo.email, name: replyTo.name || undefined } }
                : {})
        }),
        signal: AbortSignal.timeout(20_000)
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Brevo ${res.status}: ${text.slice(0, 200)}`);
    }
};

// "Relay": PythonAnywhere এ চলা ছোট Flask app (backend/mail-relay-pythonanywhere.py), তোমার নিজের Gmail দিয়ে পাঠায়।
// PythonAnywhere এর ঠিকানা দিলে শেষে /send না থাকলেও নিজে যোগ করে নেয়।
const relayUrl = () => {
    const raw = (process.env.MAIL_RELAY_URL || "").trim();
    try {
        const u = new URL(raw);
        if (/pythonanywhere\.com$/i.test(u.hostname) && (u.pathname === "/" || u.pathname === "")) {
            u.pathname = "/send";
        }
        return u.href;
    } catch {
        throw new Error("MAIL_RELAY_URL is not a valid URL");
    }
};

const sendViaRelay = async ({ to, subject, html, fromName, replyTo }) => {
    const res = await fetch(relayUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            secret: (process.env.MAIL_RELAY_SECRET || "").trim(),
            to,
            subject,
            html,
            fromName,
            replyTo: replyTo?.email || ""
        }),
        // relay নিজে দুটো SMTP পোর্টে (প্রতিটায় ~12 সেকেন্ড) চেষ্টা করতে পারে, তাই এর চেয়ে বেশি অপেক্ষা
        signal: AbortSignal.timeout(45_000)
    });
    const text = await res.text();
    let data = null;
    try {
        data = JSON.parse(text);
    } catch {
        /* relay এর বদলে অন্য কোনো (HTML) error পেজ এসেছে */
    }
    if (!res.ok || data?.ok !== true) {
        const reason = data?.error || (res.status === 404 ? "relay URL ভুল (শেষে /send আছে?)" : text);
        throw new Error(`Relay ${res.status}: ${String(reason).slice(0, 200)}`);
    }
};

const sendViaSmtp = ({ to, subject, html, fromName, replyTo }) =>
    getTransporter().sendMail({
        from: `"${fromName}" <${FROM_EMAIL()}>`,
        to,
        subject,
        html,
        ...(replyTo?.email ? { replyTo: replyTo.email } : {})
    });

// কোন উপায়ে ইমেইল যাচ্ছে (server চালুর সময় log এ দেখানো হয়)
export const mailProvider = () => {
    const forced = (process.env.MAIL_PROVIDER || "auto").trim().toLowerCase();
    if (["relay", "brevo", "smtp"].includes(forced)) return forced;
    if (process.env.BREVO_API_KEY?.trim()) return "brevo";
    if (process.env.MAIL_RELAY_URL?.trim()) return "relay";
    return "smtp";
};

// ঠিকঠাক সেটআপ আছে কিনা — না থাকলে শুরুতেই স্পষ্ট warning
export const mailConfigProblem = () => {
    const p = mailProvider();
    if (p === "relay" && (!process.env.MAIL_RELAY_URL?.trim() || !process.env.MAIL_RELAY_SECRET?.trim()))
        return "MAIL_PROVIDER=relay কিন্তু MAIL_RELAY_URL / MAIL_RELAY_SECRET দেওয়া নেই";
    if (p === "brevo" && !process.env.BREVO_API_KEY?.trim()) return "MAIL_PROVIDER=brevo কিন্তু BREVO_API_KEY নেই";
    if (p === "smtp" && (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS))
        return "কোনো mail provider সেট করা নেই (MAIL_RELAY_URL বা BREVO_API_KEY বা SMTP_*)";
    return null;
};

export const sendMail = async ({ to, subject, html, fromName, replyTo }) => {
    const opts = {
        to,
        subject: String(subject).replace(/[\r\n]+/g, " "),
        html,
        fromName: cleanName(fromName),
        replyTo
    };
    try {
        const provider = mailProvider();
        if (provider === "brevo") await sendViaBrevo(opts);
        else if (provider === "relay") await sendViaRelay(opts);
        else await sendViaSmtp(opts);
    } catch (error) {
        console.error("Mailer error:", error.message);
        const e = new ApiError(500, "Failed to send email. Please try again later.");
        e.cause = error.message; // queue এই কারণটা DB তে রাখে
        throw e;
    }
};

const OTP_TITLES = {
    [OTP_PURPOSES.REGISTER]: "Verify your email",
    [OTP_PURPOSES.LOGIN]: "Login verification",
    [OTP_PURPOSES.FORGOT_PASSWORD]: "Reset your password",
    [OTP_PURPOSES.KILL_SWITCH]: "Kill switch confirmation"
};

export const sendOtpEmail = ({ to, code, purpose, minutes }) =>
    sendMail({
        to,
        subject: `${code} is your Email Sender code`,
        html: shell(
            OTP_TITLES[purpose] || "Verification code",
            `<p style="margin:0 0 16px;">Use this code to continue:</p>
<div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;background:#27272a;border-radius:10px;padding:16px;color:#fff;">${escapeHtml(code)}</div>
<p style="margin:16px 0 0;color:#a1a1aa;">It expires in ${minutes} minutes. Never share this code with anyone. If you didn't request it, ignore this email.</p>`
        )
    });

export const sendNotificationEmail = ({ to, subject, heading, lines }) =>
    sendMail({
        to,
        subject,
        html: shell(
            heading,
            lines.map(l => `<p style="margin:0 0 10px;">${escapeHtml(l)}</p>`).join("")
        )
    });
