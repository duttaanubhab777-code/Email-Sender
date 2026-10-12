/* Email Sender — service worker
   ১) PWA: অ্যাপ হিসেবে install + offline হলে সুন্দর fallback পেজ + দ্রুত লোডের জন্য static ফাইল cache
   ২) Push: ফোনের notification bar এ লোগো + কী হয়েছে + কেন এসেছে

   নিরাপদ cache নিয়ম:
   - API (অন্য origin / non-GET) কখনো cache হয় না
   - পেজ (index.html) সবসময় আগে network থেকে, তাই পুরনো ভার্সন আটকে থাকে না
   - শুধু hashed /assets/* আর আইকন/ফন্ট cache হয় */

const VERSION = "v2";
const STATIC_CACHE = `es-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
    OFFLINE_URL,
    "/manifest.webmanifest",
    "/icon-192.png",
    "/icon-512.png",
    "/favicon.png",
    "/favicon.svg",
    "/notif-icon.png",
    "/notif-badge.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(STATIC_CACHE);
            // একটা ফাইল না পেলেও install আটকাবে না
            await Promise.all(PRECACHE.map(u => cache.add(u).catch(() => {})));
            await self.skipWaiting();
        })()
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();
            await Promise.all(
                keys.filter(k => k.startsWith("es-static-") && k !== STATIC_CACHE).map(k => caches.delete(k))
            );
            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable().catch(() => {});
            }
            await self.clients.claim();
        })()
    );
});

self.addEventListener("message", event => {
    if (event.data?.type === "es:skip-waiting") self.skipWaiting();
});

// ---------- fetch ----------
const isStaticAsset = url =>
    url.pathname.startsWith("/assets/") ||
    /\.(?:png|svg|jpg|jpeg|webp|ico|woff2?|ttf)$/i.test(url.pathname);

self.addEventListener("fetch", event => {
    const req = event.request;
    if (req.method !== "GET") return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // API অন্য origin এ — একদম ছোঁয়া হয় না
    if (req.headers.has("range")) return;

    // পেজ খোলা: network আগে; offline হলে offline.html
    if (req.mode === "navigate") {
        event.respondWith(
            (async () => {
                try {
                    const preload = await event.preloadResponse;
                    return preload || (await fetch(req));
                } catch {
                    const cache = await caches.open(STATIC_CACHE);
                    return (
                        (await cache.match(OFFLINE_URL)) ||
                        new Response("You're offline.", {
                            status: 503,
                            headers: { "Content-Type": "text/plain; charset=utf-8" }
                        })
                    );
                }
            })()
        );
        return;
    }

    // static ফাইল: cache থেকে সাথে সাথে, পেছনে নতুনটা এনে রাখা (stale-while-revalidate)
    if (isStaticAsset(url)) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(STATIC_CACHE);
                const hit = await cache.match(req);
                const fresh = fetch(req)
                    .then(res => {
                        if (res && res.ok && res.type === "basic") cache.put(req, res.clone());
                        return res;
                    })
                    .catch(() => null);
                if (hit) {
                    event.waitUntil(fresh);
                    return hit;
                }
                return (await fresh) || Response.error();
            })()
        );
    }
});

// ---------- push ----------
const setBadge = async count => {
    try {
        const n = Number(count);
        if (!Number.isFinite(n) || !self.navigator?.setAppBadge) return;
        if (n > 0) await self.navigator.setAppBadge(n);
        else await self.navigator.clearAppBadge();
    } catch {
        /* badge সাপোর্ট না থাকলে ইগনোর */
    }
};

async function handlePush(d) {
    const wins = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
    });

    // খোলা app কে জানানো — সাথে সাথে bell/ব্যাজ/পপআপ আপডেট হবে
    wins.forEach(w => w.postMessage({ type: "es:push", payload: d }));

    // আগে অ্যাপ সামনে খোলা থাকলে notification লুকানো হতো — তাই "Send test" চাপলে কিছুই আসত না
    // (test সবসময় অ্যাপ খোলা অবস্থাতেই চাপা হয়)। এখন সবসময় notification bar এ দেখানো হয়।
    await self.registration.showNotification(d.title || "Email Sender", {
        body: d.body || "",
        icon: "/notif-icon.png", // বড় লোগো (notification এর বাঁ পাশে)
        badge: "/notif-badge.png", // status bar এর ছোট সাদা আইকন
        tag: d.tag || (d.id ? `es-${d.id}` : undefined),
        timestamp: d.ts || Date.now(),
        // admin notice হলে ইউজার সরিয়ে না দেওয়া পর্যন্ত থাকবে + জোরালো vibrate
        requireInteraction: !!d.alert,
        vibrate: d.alert ? [250, 100, 250, 100, 450] : [120],
        data: { url: d.url || "/notifications", id: d.id || null, alert: !!d.alert }
    });
    await setBadge(d.badge);
}

self.addEventListener("push", event => {
    let d = {};
    try {
        d = event.data ? event.data.json() : {};
    } catch {
        d = { title: "Email Sender", body: event.data ? event.data.text() : "" };
    }
    event.waitUntil(handlePush(d));
});

self.addEventListener("notificationclick", event => {
    event.notification.close();
    const url = new URL(
        event.notification.data?.url || "/notifications",
        self.location.origin
    );

    event.waitUntil(
        (async () => {
            const wins = await self.clients.matchAll({
                type: "window",
                includeUncontrolled: true
            });
            const win = wins.find(w => w.url.startsWith(self.location.origin));
            if (win) {
                await win.focus();
                // পেজ reload ছাড়াই React Router দিয়ে সঠিক পেজে নিয়ে যাওয়া
                win.postMessage({
                    type: "es:navigate",
                    url: url.pathname + url.search
                });
                return;
            }
            await self.clients.openWindow(url.href);
        })()
    );
});
