export const DB_NAME = "email-sender";

// ---------- OTP ----------
export const OTP_PURPOSES = Object.freeze({
    REGISTER: "register",
    LOGIN: "login",
    FORGOT_PASSWORD: "forgot_password",
    KILL_SWITCH: "kill_switch"
});
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;
export const KILL_OTP_EXPIRY_MINUTES = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 30; // resend এর জন্য ৩০ সেকেন্ড অপেক্ষা
export const OTP_MAX_ATTEMPTS = 5;

// ---------- Auth ----------
export const PASSWORD_MIN_LENGTH = 8;
export const USERNAME_REGEX = /^[a-z0-9._-]{3,20}$/;

// ---------- Super Admin permission (approval) ----------
// এই কাজগুলো Super Admin সরাসরি করতে পারে, Admin করতে চাইলে Super Admin এর approval লাগবে
export const EXTRA_ACTIONS = Object.freeze([
    "create_admin",
    "make_admin",
    "remove_admin",
    "block_admin",
    "delete_admin",
    "kill_switch"
]);
export const APPROVAL_PENDING_HOURS = 24; // request করার পর কতক্ষণ pending থাকবে
export const APPROVAL_VALID_MINUTES = 30; // approve হওয়ার পর কতক্ষণ ব্যবহার করা যাবে

// ---------- Kill switch ----------
export const KILL_SESSION_MINUTES = 15;
export const KILL_MAX_PASSWORD_FAILS = 3;
// .env থেকে পড়া হয় (dotenv লোড হওয়ার পরে), default ১০ মিনিট
export const killCountdownSeconds = () =>
    Number(process.env.KILL_COUNTDOWN_SECONDS) > 0
        ? Number(process.env.KILL_COUNTDOWN_SECONDS)
        : 600;
