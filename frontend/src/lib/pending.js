// OTP ধাপে পেজ রিফ্রেশ করলেও যেন email/টাইমার হারিয়ে না যায় — sessionStorage এ রাখা
const KEY = "es-pending";

export const savePending = data => {
    try {
        sessionStorage.setItem(KEY, JSON.stringify(data));
    } catch {
        /* ignore */
    }
};
export const loadPending = purpose => {
    try {
        const p = JSON.parse(sessionStorage.getItem(KEY));
        return p && p.purpose === purpose ? p : null;
    } catch {
        return null;
    }
};
export const clearPending = () => {
    try {
        sessionStorage.removeItem(KEY);
    } catch {
        /* ignore */
    }
};
export const secondsLeft = ts =>
    Math.max(0, Math.ceil((ts - Date.now()) / 1000));

export const maskEmail = email => {
    const [name = "", domain = ""] = String(email).split("@");
    return `${name.slice(0, 2)}${"*".repeat(Math.max(1, name.length - 2))}@${domain}`;
};
