const dateFmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
});
const timeFmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
});

export const fmtDate = d => (d ? dateFmt.format(new Date(d)) : "—");
export const fmtDateTime = d =>
    d ? `${dateFmt.format(new Date(d))}, ${timeFmt.format(new Date(d))}` : "—";
// তারিখ + সময় সেকেন্ড সহ (email / login এর ঠিক কখন তা বোঝাতে)
const stampFmt = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
});
export const fmtStampFull = d => (d ? stampFmt.format(new Date(d)) : "—");
export const fmtNum = n => Number(n || 0).toLocaleString("en-US");

export function timeAgo(d) {
    if (!d) return "—";
    const s = Math.max(
        0,
        Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    );
    if (s < 45) return "just now";
    if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    if (s < 86400 * 30) return `${Math.round(s / 86400)} d ago`;
    return fmtDate(d);
}

export function fmtBytes(n) {
    if (n < 1024) return `${n} B`;
    return `${(n / 1024).toFixed(1)} KB`;
}

export const maskKey = k =>
    k && k.length > 16
        ? `${k.slice(0, 14)}${"•".repeat(10)}${k.slice(-4)}`
        : k || "";

// ব্যাকএন্ডের usernameFromEmail এর মতো: @ এর আগের অংশ, শুধু a-z 0-9 . _ -, সর্বোচ্চ ১৬
export function usernameFromEmail(email) {
    const local = String(email || "")
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "")
        .slice(0, 16);
    return local;
}
export const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function passwordScore(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 14) s++;
    return pw ? Math.max(1, s) : 0;
}

export const roleOf = u =>
    u?.isSuperAdmin ? "Super Admin" : u?.role === "admin" ? "Admin" : "User";

export const mmss = totalSeconds => {
    const s = Math.max(0, Math.floor(totalSeconds));
    return [Math.floor(s / 60), s % 60].map(v => String(v).padStart(2, "0"));
};

// Copies the WHOLE text. navigator.clipboard only exists on https / localhost,
// so on a phone opening http://192.168.x.x it is missing. The fallback below
// puts the text in a real textarea, selects every character (explicit
// selection range) and copies it, so a long snippet is copied in full.
function legacyCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.cssText =
        "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;" +
        "outline:0;opacity:0;font-size:16px;white-space:pre;overflow:hidden";
    document.body.appendChild(ta);
    let ok = false;
    try {
        ta.focus({ preventScroll: true });
        ta.select();
        ta.setSelectionRange(0, text.length);
        ok = document.execCommand("copy");
    } catch {
        ok = false;
    }
    ta.remove();
    return ok;
}

export async function copyToClipboard(text) {
    const value = String(text ?? "");
    if (!value) return false;
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(value);
            return true;
        } catch {
            /* permission / focus problem: use the fallback */
        }
    }
    return legacyCopy(value);
}
