// Approval এর action গুলোর নাম + target বানানোর নিয়ম (ব্যাকএন্ডের সাথে হুবহু)
export const ACTION_LABEL = {
  create_admin: "Create an admin",
  make_admin: "Promote user to admin",
  remove_admin: "Remove admin role",
  block_admin: "Block / unblock an admin",
  delete_admin: "Delete an admin",
  kill_switch: "Activate the kill switch"
};

export const KILL_ALL = ["submissions", "apiKeys", "users", "admins", "media", "database", "code"];

// ব্যাকএন্ডের normalizeTargets: "everything" = সব, তারপর sort
export function normalizeKillTargets(targets) {
  const clean = [...new Set(targets)];
  const expanded = clean.includes("everything") ? KILL_ALL : clean;
  return [...expanded].sort();
}

export const killTargetString = targets => normalizeKillTargets(targets).join(",");

// approved + এখনো মেয়াদ আছে এমন approval খোঁজা
export function findUsable(list, action, target) {
  const now = Date.now();
  return (list || []).find(
    a => a.action === action && String(a.target) === String(target) && a.status === "approved" && !a.expired && new Date(a.expiresAt).getTime() > now
  );
}
EOF
cat > hooks/useCooldown.js <<'EOF'
import { useCallback, useEffect, useState } from "react";

// ৩০ সেকেন্ডের resend অপেক্ষার জন্য: endAt (ms) ধরে প্রতি সেকেন্ডে কমে
export default function useCooldown(initialSeconds = 0) {
  const [endAt, setEndAt] = useState(() => Date.now() + initialSeconds * 1000);
  const [left, setLeft] = useState(initialSeconds);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((endAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endAt]);

  const start = useCallback(seconds => setEndAt(Date.now() + seconds * 1000), []);
  return [left, start];
}
EOF
cat > hooks/useAsync.js <<'EOF'
import { useCallback, useEffect, useState } from "react";

// fetcher(signal) -> data. unmount হলে request বাতিল হয়
export default function useAsync(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: "" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    setState(s => ({ ...s, loading: true, error: "" }));
    fetcher(ctrl.signal)
      .then(data => alive && setState({ data, loading: false, error: "" }))
      .catch(err => {
        if (err.name === "AbortError" || !alive) return;
        setState(s => ({ ...s, loading: false, error: err.message }));
      });
    return () => { alive = false; ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);
  const setData = useCallback(updater => setState(s => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater })), []);
  return { ...state, reload, setData };
}