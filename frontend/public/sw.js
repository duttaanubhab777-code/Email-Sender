/* Email Sender — service worker
   শুধু push notification এর জন্য (কোনো cache/offline নেই, তাই পুরনো ফাইল আটকে থাকার ভয় নেই)।
   ফোনের notification bar এ লোগো + কী হয়েছে + কেন এসেছে — সব এখান থেকেই দেখানো হয়। */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

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

    // app এখন সামনেই খোলা থাকলে সাধারণ notification এ আলাদা OS banner লাগে না।
    // (Apple এ প্রতিটা push এ notification দেখানো বাধ্যতামূলক, আর admin notice সবসময় দেখানো হয়)
    const apple = /iPhone|iPad|iPod|Macintosh/i.test(
        self.navigator?.userAgent || ""
    );
    const inFront = wins.some(w => w.visibilityState === "visible" && w.focused);
    if (inFront && !d.alert && !apple) {
        await setBadge(d.badge);
        return;
    }

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
