import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

// notification পাঠানো কখনো মূল কাজ আটকাবে না — error হলে শুধু log হবে
export const notify = async (recipientIds, { type, title, body = "", link = "" }) => {
    try {
        const ids = [...new Set((recipientIds || []).map(String))];
        if (!ids.length) return;
        await Notification.insertMany(
            ids.map(recipient => ({
                recipient,
                type,
                title: clip(title, 140),
                body: clip(body, 280),
                link: clip(link, 200)
            })),
            { ordered: false }
        );
    } catch (error) {
        console.error("[notify] failed:", error.message);
    }
};

export const notifyUser = (userId, data) => notify([userId], data);

// সব Admin কে (superOnly হলে শুধু Super Admin)। exclude = যে নিজে কাজটা করেছে তাকে বাদ দেওয়া
export const notifyAdmins = async (data, { superOnly = false, exclude = [] } = {}) => {
    try {
        const filter = superOnly
            ? { isSuperAdmin: true }
            : { $or: [{ role: "admin" }, { isSuperAdmin: true }] };
        const admins = await User.find(filter).select("_id").lean();
        const skip = new Set(exclude.map(String));
        await notify(
            admins.map(a => a._id).filter(id => !skip.has(String(id))),
            data
        );
    } catch (error) {
        console.error("[notifyAdmins] failed:", error.message);
    }
};
