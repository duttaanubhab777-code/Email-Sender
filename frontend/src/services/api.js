export const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
export class ApiError extends Error {
    constructor(message, status, data = null) {
        super(message);
        this.status = status; // 401, 404 ...
        this.data = data; // ব্যা কএন্ডে র পুরো JSON (যদি থা কে )
    }
}

async function parseJson(res) {
    const type = res.headers.get("content-type") || "";
    if (!type.includes("application/json")) return null; // HTML হলে null
    try {
        return await res.json();
    } catch {
        return null;
    }
}

export async function request(
    path,
    { method = "GET", body, headers = {}, signal, retry = true } = {}
) {
    const options = {
        method,
        credentials: "include", // সবসময়: কুকি যা ওয়া -আসা
        headers: { ...headers },
        signal // বাতি ল করার জন্য (অধ্যা য় ৯)
    };
    if (body !== undefined) {
        if (body instanceof FormData) {
            options.body = body; // ⚠️ Content-Type নি জে দে বে না !
        } else {
            options.headers["Content-Type"] = "application/json";
            options.body = JSON.stringify(body);
        }
    }
    let res;
    try {
        res = await fetch(`${BASE_URL}${path}`, options);
    } catch (err) {
        if (err.name === "AbortError") throw err; // ইচ্ছা কৃত বাতি ল — চুপচা প ছা ড়ো
        throw new ApiError("Unable to connect to the server", 0);
    }
    // ৪০১ হলে একবার টো কে ন রি ফ্রে শ করে আবার চে ষ্টা (পরে র ধা প দে খো )
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
            /* রি ফ্রে শও ফে ল — নি চে আসল 401 এররই দে খা নো হবে */
        }
    }
    const json = await parseJson(res);
    if (!res.ok) {
        throw new ApiError(
            json?.message || `Something went wrong (${res.status})`,
            res.status,
            json
        );
    }
    return json?.data; // ApiResponse-এর data অং শটা ই ফে রত
}

let refreshing = null; // একসা থে অনে কগুলো 401 এলে রি ফ্রে শ যে ন একবারই হয়
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
// লগইন/রি ফ্রে শ নি জে ই 401 দি লে রি ফ্রে শ চে ষ্টা করা অর্থহী ন (অসী ম লুপ হবে )
const canRefresh = path =>
    !path.startsWith("/users/login") &&
    !path.startsWith("/users/refresh-token");

// ---------- Auth ----------
export const registerUser = formData =>
    request("/users/register", { method: "POST", body: formData });
export const loginUser = (
    credentials // { email|username, password }
) => request("/users/login", { method: "POST", body: credentials });
export const logoutUser = () => request("/users/logout", { method: "POST" });
export const getCurrentUser = () => request("/users/current-user");
// ---------- Profile ----------
export const updateAccount = fullName =>
    request("/users/update-account", { method: "PATCH", body: { fullName } });
export const updateAvatar = file => {
    const fd = new FormData();
    fd.append("avatar", file); // না মটা ব্যা কএন্ডে র upload.single("avatar")-এর সা থে হুবহু মি লতে হবে
    return request("/users/avatar", { method: "PATCH", body: fd });
};
export const changePassword = (oldPassword, newPassword) =>
    request("/users/change-password", {
        method: "POST",
        body: { oldPassword, newPassword }
    });
// ---------- Dashboard & API Keys ----------
export const getDashboard = signal => request("/users/dashboard", { signal });
export const createApiKey = name =>
    request("/apiKeys/create", { method: "POST", body: { name } });
export const deleteApiKey = keyId =>
    request(`/apiKeys/delete/${keyId}`, { method: "DELETE" });
// ---------- Mail (পা বলি ক এন্ডপয়ে ন্ট, API Key দি য়ে ) ----------
export const sendMail = (apiKey, payload) =>
    request("/mail/send", {
        method: "POST",
        body: payload,
        headers: { "x-api-key": apiKey }
    });

// ---------- Admin (ব্যাকএন্ডে এই এন্ডপয়েন্টগুলো যোগ করতে হবে) ----------
export const getAdminStats = signal => request("/admin/stats", { signal });
export const getAdminUsers = signal => request("/admin/users", { signal });
export const toggleBlockUser = (userId, isBlocked) =>
    request(`/admin/users/${userId}/block`, {
        method: "PATCH",
        body: { isBlocked }
    });
