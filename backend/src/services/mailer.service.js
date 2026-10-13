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

// Render free plan এ SMTP পোর্ট (25/465/587) বন্ধ। তাই BREVO_API_KEY থাকলে HTTPS (পোর্ট 443) এ Brevo API দিয়ে
// পাঠানো হয়; না থাকলে আগের মতো SMTP (local এ কাজ করে)।
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

const sendViaSmtp = ({ to, subject, html, fromName, replyTo }) =>
    getTransporter().sendMail({
        from: `"${fromName}" <${FROM_EMAIL()}>`,
        to,
        subject,
        html,
        ...(replyTo?.email ? { replyTo: replyTo.email } : {})
    });

export const sendMail = async ({ to, subject, html, fromName, replyTo }) => {
    const opts = {
        to,
        subject: String(subject).replace(/[\r\n]+/g, " "),
        html,
        fromName: cleanName(fromName),
        replyTo
    };
    try {
        if (process.env.BREVO_API_KEY?.trim()) await sendViaBrevo(opts);
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
