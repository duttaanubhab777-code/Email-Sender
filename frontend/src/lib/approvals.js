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

