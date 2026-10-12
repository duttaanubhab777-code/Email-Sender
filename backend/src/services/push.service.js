import { PushSubscription } from "../models/pushSubscription.model.js";
import { Notification } from "../models/notification.model.js";

// ---------- web-push (lazy: package বা VAPID key না থাকলেও server চলবে, শুধু phone push বন্ধ থাকবে) ----------
let wp = null;
let initPromise = null;
let warned = false;

const warnOnce = msg => {
    if (warned) return;
    warned = true;
    console.warn(`[push] ${msg}`);
};

const init = () =>
    (initPromise ??= (async () => {
        const pub = process.env.VAPID_PUBLIC_KEY?.trim();
        const priv = process.env.VAPID_PRIVATE_KEY?.trim();
        if (!pub || !priv) {
            warnOnce("VAPID keys not set — phone push is disabled (in-app notifications still work). Run: npm run vapid");
            return false;
        }
        try {
            const mod = await import("web-push");
            wp = mod.default ?? mod;
            wp.setVapidDetails(
                process.env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com",
                pub,
                priv
            );
            return true;
        } catch (error) {
            warnOnce(`web-push could not start (${error.message}). Run: npm install`);
            return false;
        }
    })());

export const getPushPublicKey = () => process.env.VAPID_PUBLIC_KEY?.trim() || null;
export const isPushConfigured = () =>
    Boolean(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());

// ---------- নিরাপত্তা: শুধু পরিচিত browser push service এ পাঠানো হবে ----------
// (নাহলে কেউ নিজের বানানো URL দিয়ে server কে দিয়ে যেকোনো জায়গায় request করাতে পারত)
const PUSH_HOSTS = [
    /^fcm\.googleapis\.com$/i, // Chrome, Edge, Opera, Brave, Samsung (Android)
    /(^|\.)push\.services\.mozilla\.com$/i, // Firefox
    /(^|\.)push\.apple\.com$/i, // Safari / iPhone / iPad
    /(^|\.)notify\.windows\.com$/i // Windows / old Edge
];

export const isAllowedPushEndpoint = endpoint => {
    try {
        const u = new URL(endpoint);
        return u.protocol === "https:" && PUSH_HOSTS.some(rx => rx.test(u.hostname));
    } catch {
        return false;
    }
};

// ---------- notification এর ধরন অনুযায়ী আইকন + "কেন এসেছে" লাইন ----------
const KIND = {
    email_received: ["📩", "Your contact form just received a new message."],
    email_activity: ["📥", "A user received a new email through their form."],
    approval_request: ["🛡️", "An admin needs your approval to continue."],
    approval_approved: ["✅", "Your permission request was approved."],
    approval_denied: ["⛔", "Your permission request was denied."],
    user_joined: ["👤", "A new account was just created."],
    welcome: ["👋", "Your account is ready."],
    password_changed: ["🔒", "The password on your account was changed."],
    api_key_created: ["🔑", "A new API key was created on your account."],
    api_key_deleted: ["🗑️", "An API key was deleted from your account."],
    user_blocked: ["🚫", "An admin blocked a user."],
    user_unblocked: ["🔓", "An admin unblocked a user."],
    user_deleted: ["🗑️", "An admin deleted a user account."],
    admin_added: ["👑", "A new admin was added."],
    role_changed: ["🛡️", "Your role on Email Sender changed."],
    test: ["🔔", "Phone notifications are working on this device."]
};

const clip = (v, n) => {
    const s = String(v ?? "").trim();
    return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

// ফোনের notification এ যা দেখা যাবে: শিরোনাম (কী হয়েছে) + নিচে কারণ + বিবরণ
const buildPayload = (n, badge) => {
    if (n.alert) {
        return {
            id: String(n._id),
            type: n.type,
            alert: true,
            title: clip(`🚨 ${n.title}`, 90),
            body: clip(`Important notice from ${n.senderName || "an admin"}\n${n.body}`, 220),
            url: "/notifications",
            badge,
            ts: Date.now()
        };
    }
    const [emoji, reason] = KIND[n.type] || ["🔔", ""];
    return {
        id: String(n._id),
        type: n.type,
        alert: false,
        title: clip(`${emoji} ${n.title}`, 90),
        body: clip([reason, n.body].filter(Boolean).join("\n"), 220),
        url: n.link || "/notifications",
        badge,
        ts: Date.now()
    };
};

const sendOne = async (sub, payload, alert) => {
    try {
        await wp.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            JSON.stringify(payload),
            { TTL: alert ? 172800 : 21600, urgency: alert ? "high" : "normal" }
        );
        return true;
    } catch (error) {
        // ডিভাইস আর নেই (অ্যাপ মুছে ফেলা / permission বন্ধ) — তালিকা থেকে সরিয়ে দেওয়া
        if (error?.statusCode === 404 || error?.statusCode === 410) {
            await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        } else {
            console.error("[push] send failed:", error?.statusCode || "", error?.message);
        }
        return false;
    }
};

const inBatches = async (items, size, fn) => {
    let ok = 0;
    for (let i = 0; i < items.length; i += size) {
        const res = await Promise.all(items.slice(i, i + size).map(fn));
        ok += res.filter(Boolean).length;
    }
    return ok;
};

// তৈরি হওয়া Notification গুলোর প্রতিটা ডিভাইসে push পাঠায়। ফেরত দেয়: কতগুলো ডিভাইসে পৌঁছাল
export const pushNotifications = async docs => {
    try {
        if (!docs?.length || !(await init())) return 0;

        const userIds = [...new Set(docs.map(d => String(d.recipient)))];
        const [subs, counts] = await Promise.all([
            PushSubscription.find({ user: { $in: userIds } }).lean(),
            Notification.aggregate([
                { $match: { recipient: { $in: docs.map(d => d.recipient) }, readAt: null } },
                { $group: { _id: "$recipient", n: { $sum: 1 } } }
            ])
        ]);
        if (!subs.length) return 0;

        const unread = new Map(counts.map(c => [String(c._id), c.n]));
        const byUser = new Map();
        for (const d of docs) {
            const k = String(d.recipient);
            if (!byUser.has(k)) byUser.set(k, []);
            byUser.get(k).push(d);
        }

        const jobs = [];
        for (const sub of subs) {
            const mine = byUser.get(String(sub.user)) || [];
            const badge = unread.get(String(sub.user)) || 0;
            for (const n of mine) jobs.push({ sub, payload: buildPayload(n, badge), alert: n.alert });
        }
        return await inBatches(jobs, 25, j => sendOne(j.sub, j.payload, j.alert));
    } catch (error) {
        console.error("[push] failed:", error.message);
        return 0;
    }
};

// "Send test" বাটনের জন্য — database এ notification না বানিয়ে শুধু এই ইউজারের ডিভাইসগুলোতে
export const pushTest = async userId => {
    if (!(await init())) return { sent: 0, devices: 0, configured: false };
    const subs = await PushSubscription.find({ user: userId }).lean();
    const payload = {
        id: `test-${Date.now()}`,
        type: "test",
        alert: false,
        title: "🔔 Notifications are on",
        body: `${KIND.test[1]}\nYou'll now see new emails, approvals and admin notices here.`,
        url: "/notifications",
        ts: Date.now()
    };
    const sent = await inBatches(subs, 10, s => sendOne(s, payload, false));
    return { sent, devices: subs.length, configured: true };
};
