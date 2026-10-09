import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Icon from "./Icons";

const ToastContext = createContext(null);
let uid = 0;

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const remove = useCallback(id => setItems(list => list.filter(t => t.id !== id)), []);

  const push = useCallback((message, type = "info") => {
    const id = ++uid;
    setItems(list => [...list, { id, message, type }]);
    setTimeout(() => remove(id), 3800);
  }, [remove]);

  const api = useMemo(() => ({
    success: m => push(m, "success"),
    error: m => push(m, "error"),
    info: m => push(m, "info")
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {items.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Icon name={t.type === "error" ? "alert" : t.type === "success" ? "check" : "spark"} size={18} />
            <span>{t.message}</span>
            <button className="toast-x" onClick={() => remove(t.id)} aria-label="Dismiss">
              <Icon name="close" size={14} />
            </button>
            <i className="toast-bar" />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
