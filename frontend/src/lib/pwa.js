// PWA: "অ্যাপ হিসেবে install" এর ব্রাউজার-সাইড কাজ
// beforeinstallprompt ইভেন্ট অনেক আগেই আসে, তাই main.jsx এ এই ফাইল সবার আগে import করা হয়

let deferred = null;
const listeners = new Set();
const emit = () => listeners.forEach(fn => fn());

if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", e => {
        e.preventDefault(); // ব্রাউজারের নিজের ছোট বার না দেখিয়ে আমাদের সুন্দর বাটন দেখানো হবে
        deferred = e;
        emit();
    });
    window.addEventListener("appinstalled", () => {
        deferred = null;
        emit();
    });
}

export const isStandaloneApp = () =>
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)").matches ||
        window.matchMedia?.("(display-mode: minimal-ui)").matches ||
        navigator.standalone === true);

export const isIOSDevice = () =>
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

export const canPromptInstall = () => !!deferred;

export function subscribeInstall(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

// ইউজারের বাটন চাপায় ব্রাউজারের install dialog খোলে। ফেরত: "accepted" | "dismissed" | "unavailable"
export async function promptInstall() {
    if (!deferred) return "unavailable";
    const ev = deferred;
    deferred = null;
    emit();
    try {
        await ev.prompt();
        const choice = await ev.userChoice;
        return choice?.outcome || "dismissed";
    } catch {
        return "dismissed";
    }
}
