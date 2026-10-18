// =====================================================================
// Email Sender — ইমেইল থিম (সব ইমেইল একই ডিজাইনে: লোগো + নীল→কমলা গ্রেডিয়েন্ট)
//
// ইমেইল ক্লায়েন্ট (Gmail, Outlook, Apple Mail) সীমিত CSS বোঝে, তাই:
//   • table layout + inline style (কোনো <style>/<link>/JS নেই)
//   • প্রতিটা গ্রেডিয়েন্টের সাথে একটা সলিড bgcolor fallback
//   • লোগো অনলাইন URL (Cloudinary) — ছবি ব্লক হলে alt লেখা দেখায়
// এই ফাইল অন্য কোনো service import করে না, তাই mailer.service.js ও email.service.js
// দুটোই নিরাপদে এটা ব্যবহার করতে পারে।
// =====================================================================

// Cloudinary তে আপলোড করা badge logo (frontend এর embedForm.js এর সাথে একই ছবি)
const DEFAULT_LOGO =
    "https://res.cloudinary.com/khvkgpxq/image/upload/v1791965885/badge-logo-320.png";
const logoUrl = () => (process.env.EMAIL_LOGO_URL || DEFAULT_LOGO).trim();

// ---- palette (ওয়েবসাইটের থিমের সাথে মেলানো) ----
const C = {
    page: "#060d1c",
    card: "#0c1830",
    panel: "#0f2040",
    line: "#1d3a6b",
    ink: "#eaf2ff",
    mute: "#93a9cf",
    blue: "#1d6dff",
    sky: "#19b4ff",
    orange: "#ff7a1a",
    amber: "#ffb347",
    link: "#7ab8ff",
    green: "#00ed64", // ঠিক/সফল = MongoDB green
    red: "#ff4757" // ভুল/বিপদ = red
};
const GRADIENT = `linear-gradient(100deg, ${C.blue} 0%, ${C.sky} 40%, ${C.orange} 100%)`;
const FONT = `-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

export const esc = v =>
    String(v ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

// ---------------------------------------------------------------------
// shell: সব ইমেইলের কাঠামো — header (লোগো + শিরোনাম) / body / footer
// ---------------------------------------------------------------------
const shell = ({ preheader = "", title, subtitle = "", body, danger = false }) => {
    const headBg = danger
        ? "linear-gradient(100deg, #ff3b30 0%, #ff0a1c 55%, #d90012 100%)"
        : GRADIENT;
    const headFallback = danger ? "#ff0a1c" : C.blue;
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.page};font-size:1px;line-height:1px;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.page}" style="background:${C.page};">
<tr><td align="center" style="padding:28px 12px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.card}" style="width:100%;max-width:560px;background:${C.card};border:1px solid ${C.line};border-radius:20px;overflow:hidden;font-family:${FONT};">

<!-- header -->
<tr><td align="center" bgcolor="${headFallback}" style="background:${headBg};background-color:${headFallback};padding:34px 24px 30px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
<td align="center" bgcolor="#ffffff" style="width:84px;height:84px;background:#ffffff;border-radius:42px;box-shadow:0 8px 22px rgba(0,0,0,0.25);">
<img src="${esc(logoUrl())}" width="62" height="62" alt="Email Sender" style="display:block;margin:0 auto;border:0;outline:none;width:62px;height:62px;object-fit:contain;">
</td></tr></table>
<h1 style="margin:18px 0 0;font-size:26px;line-height:1.25;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">${esc(title)}</h1>
${subtitle ? `<p style="margin:8px 0 0;font-size:15px;line-height:1.5;color:rgba(255,255,255,0.9);">${esc(subtitle)}</p>` : ""}
</td></tr>

<!-- body -->
<tr><td style="padding:30px 26px 8px;color:${C.ink};font-size:15px;line-height:1.65;">
${body}
</td></tr>

<!-- gradient divider -->
<tr><td style="padding:22px 26px 0;"><div style="height:3px;border-radius:3px;background:${C.blue};background:${GRADIENT};font-size:0;line-height:0;">&nbsp;</div></td></tr>

<!-- footer -->
<tr><td align="center" style="padding:20px 24px 26px;">
<p style="margin:0 0 6px;font-size:14px;color:${C.mute};">Powered by <b style="color:#ffffff;">Email <span style="color:${C.orange};">Sender</span></b></p>
<p style="margin:0;font-size:12px;color:#6f86ad;">Designed &amp; developed with <span style="color:${C.red};">&#10084;</span> by <b style="color:${C.ink};">Anubhab Dutta</b></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

// গ্রেডিয়েন্ট বাটন (Outlook এও কাজ করে, কারণ bgcolor সহ table cell)
const button = (href, label) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:6px auto 0;"><tr>
<td align="center" bgcolor="${C.blue}" style="background:${C.blue};background-image:${GRADIENT};border-radius:12px;">
<a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(label)}</a>
</td></tr></table>`;

// ---------------------------------------------------------------------
// 1) নতুন লিড (কন্টাক্ট ফর্ম থেকে মেসেজ এলে মালিকের কাছে যায়)
// ---------------------------------------------------------------------
const row = (label, valueHtml, last = false) => `<tr>
<td valign="top" style="padding:12px 10px 12px 14px;${last ? "" : `border-bottom:1px solid ${C.line};`}width:27%;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${C.mute};">${label}</td>
<td valign="top" style="padding:12px 14px 12px 6px;${last ? "" : `border-bottom:1px solid ${C.line};`}font-size:14px;line-height:1.5;word-break:break-word;overflow-wrap:anywhere;">${valueHtml}</td>
</tr>`;

export const buildLeadHtml = ({
    senderName,
    senderEmail,
    subject,
    message,
    ipAddress,
    sourceUrl
}) => {
    const e = {
        name: esc(senderName),
        email: esc(senderEmail),
        subject: esc(subject),
        message: esc(message),
        ip: esc(ipAddress),
        source: esc(sourceUrl || "")
    };
    const replyHref = `mailto:${encodeURIComponent(String(senderEmail ?? ""))
        .replace(/%40/g, "@")}?subject=${encodeURIComponent(`Re: ${String(subject ?? "").replace(/[\r\n]+/g, " ")}`)}`;

    const sourceCell = e.source
        ? `<a href="${e.source}" target="_blank" rel="noopener noreferrer" style="color:${C.sky};text-decoration:none;word-break:break-all;">${e.source}</a>`
        : `<span style="color:${C.mute};">Not recorded</span>`;

    const body = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-radius:14px;">
${row("Sender", `<b style="color:#ffffff;font-size:15px;">${e.name}</b>`)}
${row("Email", `<a href="mailto:${e.email}" style="color:${C.link};text-decoration:none;">${e.email}</a>`)}
${row("Subject", `<b style="color:${C.amber};">${e.subject}</b>`)}
${row("Source page", sourceCell)}
${row("IP address", `<span style="color:${C.green};font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-weight:700;">${e.ip}</span>`, true)}
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
<tr>
<td width="4" bgcolor="${C.blue}" style="width:4px;background:${C.blue};background-image:linear-gradient(180deg, ${C.blue}, ${C.orange});border-radius:4px 0 0 4px;font-size:0;line-height:0;">&nbsp;</td>
<td bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-left:none;border-radius:0 14px 14px 0;padding:20px 22px;">
<p style="margin:0 0 10px;font-size:11px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;color:${C.amber};">Message</p>
<p style="margin:0;font-size:15px;line-height:1.7;color:${C.ink};white-space:pre-wrap;word-break:break-word;">${e.message}</p>
</td>
</tr>
</table>

<div style="height:22px;line-height:22px;font-size:0;">&nbsp;</div>
${button(replyHref, "Reply to " + String(senderName ?? "sender").split(/\s+/)[0].slice(0, 30))}
<p style="margin:12px 0 0;text-align:center;font-size:12px;color:#6f86ad;">Pressing Reply also works: your answer goes straight to ${e.email}.</p>
`;

    return shell({
        preheader: `${String(senderName ?? "")}: ${String(message ?? "").replace(/\s+/g, " ").slice(0, 90)}`,
        title: "New Website Inquiry",
        subtitle: "You've got a fresh message waiting for you.",
        body
    });
};

// ---------------------------------------------------------------------
// 2) OTP কোড (register / login / forgot password / kill switch)
// ---------------------------------------------------------------------
export const buildOtpHtml = ({ code, title, minutes }) => {
    const digits = String(code ?? "").split("");
    const boxes = digits
        .map(
            d =>
                `<td align="center" bgcolor="${C.panel}" style="width:15%;background:${C.panel};border:1px solid ${C.line};border-radius:12px;padding:14px 0;font-size:30px;font-weight:800;color:#ffffff;font-family:'SFMono-Regular',Consolas,Menlo,monospace;">${esc(d)}</td>`
        )
        .join(`<td style="width:6px;font-size:0;">&nbsp;</td>`);

    const body = `
<p style="margin:0 0 18px;text-align:center;font-size:16px;color:${C.ink};">Use this code to continue:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;"><tr>${boxes}</tr></table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:22px auto 0;"><tr>
<td bgcolor="#2a1a0c" style="background:#2a1a0c;border:1px solid #7a4010;border-radius:999px;padding:7px 16px;font-size:13px;font-weight:700;color:${C.amber};">
Expires in ${esc(minutes)} minutes
</td></tr></table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
<tr><td bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.6;color:${C.mute};">
<b style="color:${C.ink};">Never share this code</b> with anyone. Email Sender will never ask you for it. If you didn't request it, you can safely ignore this email.
</td></tr></table>
`;

    return shell({
        preheader: `Your Email Sender code is ${code}. It expires in ${minutes} minutes.`,
        title,
        subtitle: "Confirm it's really you",
        body
    });
};

// ---------------------------------------------------------------------
// 3) সাধারণ নোটিফিকেশন (approval, kill switch ইত্যাদি)
// ---------------------------------------------------------------------
export const buildNoticeHtml = ({ heading, lines = [], danger = false }) => {
    const paras = lines
        .map(
            l =>
                `<p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:${C.ink};">${esc(l)}</p>`
        )
        .join("");
    const body = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="4" bgcolor="${danger ? C.red : C.blue}" style="width:4px;background:${danger ? C.red : C.blue};border-radius:4px 0 0 4px;font-size:0;line-height:0;">&nbsp;</td>
<td bgcolor="${C.panel}" style="background:${C.panel};border:1px solid ${C.line};border-left:none;border-radius:0 14px 14px 0;padding:20px 22px;">${paras}</td>
</tr></table>`;
    return shell({
        preheader: String(lines[0] ?? heading).slice(0, 110),
        title: heading,
        body,
        danger
    });
};
