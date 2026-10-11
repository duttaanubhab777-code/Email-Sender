import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { useLocation } from "react-router-dom";
import { useToast } from "../components/Toast";
import { getNotifications, getUnreadCount } from "../services/api";

const NotificationContext = createContext(null);
const POLL_MS = 20_000;
// নিজের করা কাজের notification এর জন্য আলাদা toast লাগে না (তখন এমনিতেই success message দেখানো হয়)
const SILENT_TYPES = new Set(["api_key_created", "api_key_deleted", "password_changed", "welcome"]);

// unread সংখ্যা (WhatsApp এর মতো ব্যাজ), নতুন এলে toast, আর tab title এ "(3)"
export function NotificationProvider({ children }) {
    const toast = useToast();
    const { pathname } = useLocation();
    const [unread, setUnreadState] = useState(0);
    const prev = useRef(null); // আগের সংখ্যা (প্রথমবার null — তখন toast দেখাবে না)
    const busy = useRef(false);

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
            const { unreadCount } = await getUnreadCount();
            const before = prev.current;
            prev.current = unreadCount;
            setUnreadState(unreadCount);
            if (before !== null && unreadCount > before) {
                const { items } = await getNotifications({
                    filter: "unread",
                    limit: 1
                });
                const n = items?.[0];
                if (n && !SILENT_TYPES.has(n.type)) toast.info(n.body ? `${n.title} — ${n.body}` : n.title);
            }
        } catch {
            /* নেটওয়ার্ক/503 হলে পরের বার আবার চেষ্টা */
        } finally {
            busy.current = false;
        }
    }, [toast]);

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
        </NotificationContext.Provider>
    );
}

export const useNotifications = () => {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error("useNotifications must be used inside NotificationProvider");
    return ctx;
};
