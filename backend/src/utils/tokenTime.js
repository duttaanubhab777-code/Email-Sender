// "1d", "10d", "15m", "3600" (সেকেন্ড) — jsonwebtoken এর expiresIn এর মতো লেখা → milliseconds
// cookie এর maxAge এর জন্য লাগে, যাতে cookie আর token একই সময়ে শেষ হয়।
const UNIT = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 };

export const toMs = (value, fallbackMs) => {
    const v = String(value ?? "").trim().toLowerCase();
    if (/^\d+$/.test(v)) return Number(v) * 1000; // jsonwebtoken এ সংখ্যা মানে সেকেন্ড
    const m = v.match(/^(\d+(?:\.\d+)?)\s*([smhdw])/);
    if (!m) return fallbackMs;
    return Math.round(Number(m[1]) * UNIT[m[2]]);
};

const DAY = UNIT.d;
export const accessTtlMs = () => toMs(process.env.ACCESS_TOKEN_EXPIRY, DAY);
export const refreshTtlMs = () => toMs(process.env.REFRESH_TOKEN_EXPIRY, 10 * DAY);
