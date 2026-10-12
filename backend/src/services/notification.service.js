import { Notification } from "../models/notification.model.js";
import { User } from "../models/user.model.js";
import { pushNotifications } from "./push.service.js";

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

/**
 * recipient দের notification বানায় (database + bell) এবং তাদের ফোনের notification bar এও পাঠায়।
 *
 * notification পাঠানো কখনো মূল কাজ আটকাবে না — error হলে শুধু log হবে।
 * ফেরত দেয়: { created: কতজনের জন্য বানাল, push: Promise<কতগুলো ডিভাইসে পৌঁছাল> }
 * (পুরনো কোড ফেরত মান ব্যবহার করে না, তাই কিছু ভাঙবে না)
 *
 * alert: true মানে Admin এর গুরুত্বপূর্ণ নোটিশ — শুধু এতেই ইউজারের screen এ পপআপ আসে
 */
export const notify = async (
    recipientIds,
    { type, title, body = "", link = "", alert = false, announcement = null, senderName = "" }
) => {
    try {
        const ids = [...new Set((recipientIds || []).map(String))];
        if (!ids.length) return { created: 0, push: Promise.resolve(0) };

        const bodyMax = alert ? 600 : 280;
        const docs = [];
        for (let i = 0; i < ids.length; i += 500) {
            const made = await Notification.insertMany(
                ids.slice(i, i + 500).map(recipient => ({
                    recipient,
                    type,
                    title: clip(title, 140),
                    body: clip(body, bodyMax),
                    link: clip(link, 200),
                    alert: !!alert,
                    announcement: announcement || null,
                    senderName: clip(senderName, 120)
                })),
                { ordered: false }
            );
            docs.push(...made);
        }

        // push ধীর হতে পারে, তাই অপেক্ষা না করে background এ (error ভিতরেই সামলানো)
        const push = pushNotifications(docs).catch(() => 0);
        return { created: docs.length, push };
    } catch (error) {
        console.error("[notify] failed:", error.message);
        return { created: 0, push: Promise.resolve(0) };
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
        return await notify(
            admins.map(a => a._id).filter(id => !skip.has(String(id))),
            data
        );
    } catch (error) {
        console.error("[notifyAdmins] failed:", error.message);
        return { created: 0, push: Promise.resolve(0) };
    }
};
