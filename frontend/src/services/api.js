export const BASE_URL =
    import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.name = "ApiError";
        this.status = status; // 401, 404, 429 ...
        this.data = data; // ব্যাকএন্ডের পুরো JSON
        this.errors = data?.errors ?? [];
        this.retryAfter = data?.errors?.[0]?.retryAfter ?? null; // 429 হলে কত সেকেন্ড অপেক্ষা
    }
}

async function parseJson(res) {
    const type = res.headers.get("content-type") || "";
    if (!type.includes("application/json")) return null;
    try {
        return await res.json();
    } catch {
        return null;
    }
}

// এই path গুলোতে 401 মানে "ভুল পাসওয়ার্ড" — refresh করে আবার পাঠালে ভুল-গণনা দুইবার হয়ে যাবে
const NO_REFRESH = [
    "/users/login",
    "/users/refresh-token",
    "/users/logout",
    "/kill-switch/",
    "/approvals/"
];
const canRefresh = path => !NO_REFRESH.some(p => path.startsWith(p));

let refreshing = null;
function refreshSession() {
    if (!refreshing) {
        refreshing = fetch(`${BASE_URL}/users/refresh-token`, {
            method: "POST",
            credentials: "include"
        })
            .then(res => {
                if (!res.ok) throw new Error("refresh failed");
            })
            .finally(() => {
                refreshing = null;
            });
    }
    return refreshing;
}

export async function request(
    path,
    { method = "GET", body, headers = {}, signal, retry = true } = {}
) {
    const options = {
        method,
        credentials: "include",
        headers: { ...headers },
        signal
    };
    if (body !== undefined) {
        if (body instanceof FormData) {
            options.body = body; // Content-Type browser নিজে বসাবে
        } else {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }
    }

    let res;
    try {
        res = await fetch(`${BASE_URL}${path}`, options);
    } catch (err) {
        if (err.name === "AbortError") throw err;
        throw new ApiError(
            "Unable to reach the server. Check your connection.",
            0
        );
    }

    if (res.status === 401 && retry && canRefresh(path)) {
        try {
            await refreshSession();
            return request(path, {
                method,
                body,
                headers,
                signal,
                retry: false
            });
        } catch {
            /* refresh ব্যর্থ — নিচে আসল 401 ই দেখানো হবে */
        }
    }

    const json = await parseJson(res);

    // Kill switch চালু থাকলে সব route 503 দেয় — পুরো app কে status পেজে পাঠানো
    if (res.status === 503 && json?.data?.killSwitch) {
        window.dispatchEvent(
            new CustomEvent("es:kill", { detail: json.data.killSwitch })
        );
    }

    if (!res.ok) {
        throw new ApiError(
            json?.message || `Something went wrong (${res.status})`,
            res.status,
            json
        );
    }
    return json?.data;
}

const withApproval = approvalId =>
    approvalId ? { "x-approval-id": approvalId } : {};

// ---------- Auth (/users) ----------
export const registerStart = formData =>
    request("/users/register", { method: "POST", body: formData });
export const registerVerify = (email, otp) =>
    request("/users/register/verify", { method: "POST", body: { email, otp } });
export const loginUser = (identifier, password) =>
    request("/users/login", { method: "POST", body: { identifier, password } });
export const logoutUser = () => request("/users/logout", { method: "POST" });
export const forgotPassword = email =>
    request("/users/forgot-password", { method: "POST", body: { email } });
export const resetPassword = ({ email, otp, newPassword }) =>
    request("/users/forgot-password/reset", {
        method: "POST",
        body: { email, otp, newPassword }
    });
export const resendOtp = (purpose, email) =>
    request("/users/otp/resend", { method: "POST", body: { purpose, email } });
export const checkUsername = (params, signal) =>
    request(`/users/check-username?${new URLSearchParams(params)}`, { signal });

// ---------- Account ----------
export const getCurrentUser = () => request("/users/current-user");
export const updateAccount = body =>
    request("/users/update-account", { method: "PATCH", body });
export const updateAvatar = file => {
    const fd = new FormData();
    fd.append("avatar", file); // ব্যাকএন্ডের upload.single("avatar") এর সাথে মিলতে হবে
    return request("/users/avatar", { method: "PATCH", body: fd });
};
export const changePassword = (oldPassword, newPassword) =>
    request("/users/change-password", {
        method: "POST",
        body: { oldPassword, newPassword }
    });
export const getDashboard = signal => request("/users/dashboard", { signal });

// ---------- API keys ----------
export const getApiKeys = signal => request("/apiKeys/all", { signal });
export const createApiKey = name =>
    request("/apiKeys/create", { method: "POST", body: { name } });
export const deleteApiKey = keyId =>
    request(`/apiKeys/delete/${keyId}`, { method: "DELETE" });

// ---------- Mail: Postman-এর মতো — সময়, সাইজ, status সহ ফেরত দেয় ----------
export async function sendMailRaw(apiKey, payload) {
    const started = performance.now();
    let res;
    try {
        res = await fetch(`${BASE_URL}/mail/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey
            },
            body: JSON.stringify(payload)
        });
    } catch {
        return {
            ok: false,
            status: 0,
            statusText: "Network error",
            ms: Math.round(performance.now() - started),
            bytes: 0,
            body: null,
            raw: ""
        };
    }
    const raw = await res.text();
    const ms = Math.round(performance.now() - started);
    let body = null;
    try {
        body = JSON.parse(raw);
    } catch {
        /* HTML বা খালি */
    }
    return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        ms,
        bytes: new Blob([raw]).size,
        body,
        raw
    };
}

// ---------- Admin ----------
export const getAdminStats = signal => request("/admin/stats", { signal });
export const getAdminUsers = signal => request("/admin/users", { signal });
export const setUserBlocked = (id, isBlocked, approvalId) =>
    request(`/admin/users/${id}/block`, {
        method: "PATCH",
        body: { isBlocked },
        headers: withApproval(approvalId)
    });
export const deleteUserById = (id, approvalId) =>
    request(`/admin/users/${id}`, {
        method: "DELETE",
        headers: withApproval(approvalId)
    });
export const makeAdmin = (targetEmail, approvalId) =>
    request("/admin/make-admin", {
        method: "PUT",
        body: { targetEmail },
        headers: withApproval(approvalId)
    });
export const removeAdmin = (targetEmail, approvalId) =>
    request("/admin/remove-admin", {
        method: "PUT",
        body: { targetEmail },
        headers: withApproval(approvalId)
    });
export const createAdmin = (body, approvalId) =>
    request("/admin/create-admin", {
        method: "POST",
        body,
        headers: withApproval(approvalId)
    });

// ---------- Approvals ----------
export const requestApproval = body =>
    request("/approvals", { method: "POST", body });
export const listApprovals = (status, signal) =>
    request(`/approvals${status ? `?status=${status}` : ""}`, { signal });
export const approveApproval = (id, password) =>
    request(`/approvals/${id}/approve`, {
        method: "PATCH",
        body: { password }
    });
export const denyApproval = (id, note) =>
    request(`/approvals/${id}/deny`, { method: "PATCH", body: { note } });

// ---------- Kill switch ----------
export const getKillOptions = () => request("/kill-switch/options");
export const killStart = ({ password, targets }, approvalId) =>
    request("/kill-switch/start", {
        method: "POST",
        body: { password, targets },
        headers: withApproval(approvalId)
    });
export const killConfirm = (sessionId, answer) =>
    request("/kill-switch/confirm", {
        method: "POST",
        body: { sessionId, answer }
    });
export const killResendOtp = sessionId =>
    request("/kill-switch/resend-otp", { method: "POST", body: { sessionId } });
export const killVerifyOtp = (sessionId, otp) =>
    request("/kill-switch/verify-otp", {
        method: "POST",
        body: { sessionId, otp }
    });

// answer "yes" ছাড়া কিছু দিলে ব্যাকএন্ড session বাতিল করে দেয় (Cancel বাটনের জন্য)
export const killExecute = (sessionId, killPassword, answer = "yes") =>
    request("/kill-switch/execute", {
        method: "POST",
        body: { sessionId, answer, killPassword }
    });

// ---------- System (public) ----------
export const getSystemStatus = signal => request("/system/status", { signal });
