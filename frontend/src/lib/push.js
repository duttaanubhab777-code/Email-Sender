import { getPushConfig, subscribePush, unsubscribePush } from "../services/api";

// ফোনের notification bar (Web Push) এর সব ব্রাউজার-সাইড কাজ এক জায়গায়

export const pushSupported = () =>
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

export const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
    window.matchMedia?.("(display-mode: standalone)").matches ||
    navigator.standalone === true;

// iPhone এ push পেতে হলে আগে "Add to Home Screen" করে অ্যাপের মতো খুলতে হয় (Apple এর নিয়ম)
export const needsInstall = () => isIOS() && !isStandalone();

export async function registerSW() {
    if (!("serviceWorker" in navigator)) return null;
    try {
        return await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
            updateViaCache: "none" // sw.js নিজে কখনো পুরনো cache থেকে আসবে না — আপডেট সাথে সাথে পৌঁছায়
        });
    } catch {
        return null;
    }
}

const toKey = b64 => {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
};

const sameKey = (buf, key) => {
    if (!buf) return false;
    const a = new Uint8Array(buf);
    return a.length === key.length && a.every((v, i) => v === key[i]);
};

export async function currentSubscription() {
    if (!pushSupported()) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? reg.pushManager.getSubscription() : null;
}

// ইউজার বাটন চাপলে: permission চেয়ে subscribe করে server এ জমা দেয়
export async function enablePush() {
    // permission সবার আগে — iPhone এ বাটন চাপার সাথে সাথেই চাইতে হয়
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        throw new Error(
            permission === "denied"
                ? "Notifications are blocked. Allow them for this site in your browser settings, then try again."
                : "Permission wasn't given."
        );
    }

    const cfg = await getPushConfig();
    if (!cfg?.enabled || !cfg.publicKey) {
        throw new Error("Phone notifications aren't set up on the server yet.");
    }

    await registerSW();
    const reg = await navigator.serviceWorker.ready;
    const key = toKey(cfg.publicKey);

    let sub = await reg.pushManager.getSubscription();
    if (sub && !sameKey(sub.options?.applicationServerKey, key)) {
        await sub.unsubscribe(); // server এর key বদলে গেছে — নতুন করে
        sub = null;
    }
    sub ??= await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key
    });

    await subscribePush(sub.toJSON());
    window.dispatchEvent(new Event("es:push-changed"));
}

// অ্যাপ খুললে চুপচাপ: আগেই অনুমতি দেওয়া থাকলে এই ডিভাইসকে বর্তমান ইউজারের সাথে আবার জুড়ে রাখে
export async function syncPush() {
    try {
        if (!pushSupported() || Notification.permission !== "granted") return;
        const sub = await currentSubscription();
        if (sub) await subscribePush(sub.toJSON());
    } catch {
        /* পরের বার আবার */
    }
}

// ইউজার নিজে বন্ধ করলে: ব্রাউজার + server দুই জায়গা থেকেই
export async function disablePush() {
    const sub = await currentSubscription();
    if (sub) {
        await unsubscribePush(sub.endpoint).catch(() => {});
        await sub.unsubscribe().catch(() => {});
    }
    window.dispatchEvent(new Event("es:push-changed"));
}

// Logout এ: শুধু server থেকে এই ডিভাইসকে আলাদা করা, যাতে একই ফোনে অন্য কেউ ঢুকলে আগের ইউজারের notification না আসে
export async function detachDevice() {
    try {
        const sub = await currentSubscription();
        if (sub) await unsubscribePush(sub.endpoint);
    } catch {
        /* লগআউট আটকাবে না */
    }
}
