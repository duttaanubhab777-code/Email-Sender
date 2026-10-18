import net from "node:net";

// =====================================================================
// ভিজিটরের আসল IP বের করা
//
// সমস্যা: Render এ সাইটের সামনে Cloudflare + Render এর নিজের proxy থাকে। তাই
//   • trust proxy না দিলে req.ip = Render এর ভেতরের IP (যেমন 10.27.35.36) — সবার একই!
//   • trust proxy = 1 দিলেও পাওয়া যায় proxy এর IP, ভিজিটরের না
//   • X-Forwarded-For এ নিজের লেখা মান ঢুকিয়ে IP জাল করা যায় (Render শুধু শেষে যোগ করে)
// সমাধান: Cloudflare নিজে যে `CF-Connecting-IP` header বসায় (ভিজিটর নিজে বদলাতে পারে না) সেটাই নেওয়া।
//
// কোন header বিশ্বাস করা হবে:
//   CLIENT_IP_HEADER=cf-connecting-ip   (Render এ এটা নিজে নিজেই ধরে নেওয়া হয়, কিছু সেট করতে হয় না)
//   CLIENT_IP_HEADER=x-real-ip          (অন্য কোনো host এ চাইলে)
//   CLIENT_IP_HEADER=none               (কোনো header বিশ্বাস নয়; শুধু req.ip / TRUST_PROXY)
// local এ কিছুই সেট না থাকলে সরাসরি connection এর IP-ই নেওয়া হয়।
// =====================================================================

const trustedHeader = () => {
    const v = (process.env.CLIENT_IP_HEADER || "").trim().toLowerCase();
    if (v === "none") return "";
    if (v) return v;
    return process.env.RENDER ? "cf-connecting-ip" : ""; // Render নিজে RENDER=true সেট করে
};

// "::ffff:1.2.3.4" → "1.2.3.4", "::1" → "127.0.0.1", ভুল লেখা হলে null
export const cleanIp = raw => {
    if (typeof raw !== "string") return null;
    let ip = raw.split(",")[0].trim();
    if (/^\[.*\]$/.test(ip)) ip = ip.slice(1, -1);
    if (/^::ffff:/i.test(ip) && net.isIPv4(ip.slice(7))) ip = ip.slice(7);
    if (ip === "::1") ip = "127.0.0.1";
    return net.isIP(ip) ? ip : null;
};

export const getClientIp = req => {
    const header = trustedHeader();
    const fromHeader = header ? cleanIp(req.headers?.[header]) : null;
    return fromHeader || cleanIp(req.ip) || cleanIp(req.socket?.remoteAddress) || "N/A";
};
