import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState
} from "react";
import Icon from "./Icons";

const ToastContext = createContext(null);
let uid = 0;
const ICONS = { success: "check", error: "x", info: "info", warning: "alert" };

// MongoDB-এর "You have successfully logged out." ব্যানারের মতো টোস্ট
export function ToastProvider({ children }) {
    const [items, setItems] = useState([]);
    const timers = useRef(new Map());

    const remove = useCallback(id => {
        setItems(list =>
            list.map(t => (t.id === id ? { ...t, leaving: true } : t))
        );
        setTimeout(() => setItems(list => list.filter(t => t.id !== id)), 220);
        clearTimeout(timers.current.get(id));
        timers.current.delete(id);
    }, []);

    const push = useCallback(
        (message, type = "info", ms = 4200) => {
            const id = ++uid;
            setItems(list => [...list.slice(-3), { id, message, type }]);
            timers.current.set(
                id,
                setTimeout(() => remove(id), ms)
            );
        },
        [remove]
    );

    const api = useMemo(
        () => ({
            success: m => push(m, "success"),
            error: m => push(m, "error", 6000),
            info: m => push(m, "info"),
            warning: m => push(m, "warning", 5500)
        }),
        [push]
    );

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="toast-stack" role="status" aria-live="polite">
                {items.map(t => (
                    <div
                        key={t.id}
                        className={`toast toast-${t.type} ${t.leaving ? "leaving" : ""}`}
                    >
                        <span className="toast-ic">
                            <Icon
                                name={ICONS[t.type]}
                                size={13}
                                strokeWidth={3}
                            />
                        </span>
                        <span className="toast-msg">{t.message}</span>
                        <button
                            className="toast-x"
                            onClick={() => remove(t.id)}
                            aria-label="Dismiss"
                        >
                            <Icon name="x" size={15} />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
}
