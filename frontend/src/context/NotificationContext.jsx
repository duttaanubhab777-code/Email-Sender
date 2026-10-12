import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import AlertPopup from "../components/AlertPopup";
import {
    ackNotification,
    getNotifications,
    getPendingAlerts,
    getUnreadCount
} from "../services/api";
import { registerSW, syncPush } from "../lib/push";

const NotificationContext = createContext(null);
const POLL_MS = 20_000;
// নিজের করা কাজের notification এর জন্য আলাদা toast লাগে না (তখন এমনিতেই success message দেখানো হয়)
const SILENT_TYPES = new Set(["api_key_created", "api_key_deleted", "password_changed", "welcome"]);

// unread সংখ্যা (WhatsApp এর মতো ব্যাজ), নতুন এলে toast, আর tab title এ "(3)"
// + Admin এর গুরুত্বপূর্ণ নোটিশ এলে ৫ সেকেন্ডের পপআপ (OK চাপা পর্যন্ত থাকে)
// + ফোনের notification bar এর push (service worker) এর সাথে যোগাযোগ
export function NotificationProvider({ children }) {
    const toast = useToast();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [unread, setUnreadState] = useState(0);
    const [alerts, setAlerts] = useState([]); // পপআপে দেখানোর বাকি নোটিশ (পুরনোটা আগে)
    const prev = useRef(null); // আগের সংখ্যা (প্রথমবার null — তখন toast দেখাবে না)
    const busy = useRef(false);
    const alertsRef = useRef([]);

    useEffect(() => {
        alertsRef.current = alerts;
    }, [alerts]);

    const loadAlerts = useCallback(async () => {
        try {
            const { items } = await getPendingAlerts();
            setAlerts(list => {
                const seen = new Set(list.map(a => a._id));
                const fresh = (items || []).filter(a => !seen.has(a._id));
                return fresh.length ? [...list, ...fresh] : list;
            });
        } catch {
            /* পরের poll এ আবার */
        }
    }, []);

    // local পরিবর্তন (mark read ইত্যাদি) হলে prev ও মেলানো, নাহলে ভুল toast আসবে
    const setUnread = useCallback(n => {
        const v = Math.max(0, Number(n) || 0);
        prev.current = v;
        setUnreadState(v);
    }, []);

    const refresh = useCallback(async () => {
        if (busy.current || document.visibilityState === "hidden") return;
        busy.current = true;
        try {
            const { unreadCount, pendingAlerts = 0 } = await getUnreadCount();
            const before = prev.current;
            prev.current = unreadCount;
            setUnreadState(unreadCount);

            // নতুন Admin নোটিশ এলে পপআপের তালিকায় আনা
            if (pendingAlerts > alertsRef.current.length) loadAlerts();

            if (before !== null && unreadCount > before) {
                const { items } = await getNotifications({
                    filter: "unread",
                    limit: 1
                });
                const n = items?.[0];
                // Admin নোটিশের জন্য toast নয়, পপআপ আসে
                if (n && !n.alert && !SILENT_TYPES.has(n.type)) toast.info(n.body ? `${n.title} — ${n.body}` : n.title);
            }
        } catch {
            /* নেটওয়ার্ক/503 হলে পরের বার আবার চেষ্টা */
        } finally {
            busy.current = false;
        }
    }, [toast, loadAlerts]);

    // পপআপে OK চাপলে: server এ জানিয়ে তবেই সরানো (ব্যর্থ হলে পপআপ থেকে যায়, ইউজার আবার চাপতে পারে)
    const ackCurrent = useCallback(async () => {
        const a = alertsRef.current[0];
        if (!a) return;
        await ackNotification(a._id);
        setAlerts(list => list.filter(x => x._id !== a._id));
        refresh();
    }, [refresh]);

    // service worker চালু + এই ডিভাইসকে এই ইউজারের সাথে জোড়া (আগে অনুমতি দেওয়া থাকলে)
    useEffect(() => {
        registerSW().then(syncPush);
    }, []);

    // push এলে / notification এ ট্যাপ করলে service worker খোলা অ্যাপকে জানায়
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;
        const onMessage = e => {
            const d = e.data;
            if (d?.type === "es:push") refresh();
            if (d?.type === "es:navigate" && d.url) {
                navigate(d.url);
                refresh();
            }
        };
        navigator.serviceWorker.addEventListener("message", onMessage);
        return () => navigator.serviceWorker.removeEventListener("message", onMessage);
    }, [refresh, navigate]);

    useEffect(() => {
        refresh();
        const id = setInterval(refresh, POLL_MS);
        const onVisible = () => document.visibilityState === "visible" && refresh();
        document.addEventListener("visibilitychange", onVisible);
        window.addEventListener("focus", refresh);
        return () => {
            clearInterval(id);
            document.removeEventListener("visibilitychange", onVisible);
            window.removeEventListener("focus", refresh);
        };
    }, [refresh]);

    // পেজ বদলালে সাথে সাথে সংখ্যা মিলিয়ে নেওয়া
    useEffect(() => {
        refresh();
    }, [pathname, refresh]);

    // browser tab এর title এ "(3) Email Sender"
    useEffect(() => {
        const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
        document.title = unread > 0 ? `(${unread > 99 ? "99+" : unread}) ${base}` : base;
        return () => {
            document.title = base;
        };
    }, [unread]);

    const value = useMemo(
        () => ({ unread, setUnread, refresh }),
        [unread, setUnread, refresh]
    );
    return (
        <NotificationContext.Provider value={value}>
            {children}
            {alerts[0] && (
                <AlertPopup
                    key={alerts[0]._id}
                    alert={alerts[0]}
                    queueLeft={alerts.length - 1}
                    onAck={ackCurrent}
                />
            )}
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
    return ctx;
};
