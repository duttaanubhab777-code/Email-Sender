import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { Notification } from "../models/notification.model.js";
import { Announcement, AUDIENCES } from "../models/announcement.model.js";
import { notify } from "../services/notification.service.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const squash = v => String(v ?? "").replace(/[ \t]+/g, " ").trim();

// POST /admin/broadcast
// Admin + Super Admin দুজনেই সরাসরি পাঠাতে পারে (approval লাগে না)।
// প্রাপক পাবে: bell notification + ফোনের notification bar + screen এ ৫ সেকেন্ডের পপআপ
const sendBroadcast = asyncHandler(async (req, res) => {
    const title = squash(req.body?.title);
    const message = String(req.body?.message ?? "").replace(/\r/g, "").trim();
    const audience = String(req.body?.audience ?? "");
    const targetEmail = String(req.body?.targetEmail ?? "").trim().toLowerCase();

    if (title.length < 3 || title.length > 80) {
        throw new ApiError(400, "Title must be 3 to 80 characters");
    }
    if (message.length < 3 || message.length > 500) {
        throw new ApiError(400, "Message must be 3 to 500 characters");
    }
    if (!AUDIENCES.includes(audience)) throw new ApiError(400, "Choose who should receive this");

    // block করা ইউজারকে পাঠানো অর্থহীন; নিজেকে পাঠানোও লাগে না
    const filter = { isBlocked: { $ne: true }, _id: { $ne: req.user._id } };
    if (audience === "users") filter.role = "user";
    if (audience === "admins") filter.role = "admin";
    if (audience === "user") {
        if (!EMAIL_RE.test(targetEmail)) throw new ApiError(400, "Enter the person's email address");
        filter.email = targetEmail;
    }

    const recipients = await User.find(filter).select("_id").lean();
    if (!recipients.length) {
        throw new ApiError(
            404,
            audience === "user"
                ? "No active user found with this email"
                : "There is no one to send this to"
        );
    }

    const announcement = await Announcement.create({
        sentBy: req.user._id,
        senderName: req.user.fullName,
        title,
        message,
        audience,
        targetEmail: audience === "user" ? targetEmail : ""
    });

    const { created, push } = await notify(
        recipients.map(r => r._id),
        {
            type: "admin_alert",
            title,
            body: message,
            link: "/notifications",
            alert: true,
            announcement: announcement._id,
            senderName: req.user.fullName
        }
    );

    announcement.recipientCount = created;
    await announcement.save();

    // কতজনের ফোনে পৌঁছাল সেটা পরে (background এ) লিখে রাখা হয়
    push
        .then(n => Announcement.updateOne({ _id: announcement._id }, { $set: { pushSent: n } }))
        .catch(() => {});

    return res
        .status(201)
        .json(new ApiResponse(201, announcement, `Notice sent to ${created} ${created === 1 ? "person" : "people"}`));
});

// GET /admin/broadcast — আগে পাঠানো নোটিশ, কতজন পেল, কতজন "OK" চাপল
const listBroadcasts = asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const items = await Announcement.find().sort({ createdAt: -1 }).limit(limit).lean();

    const acks = items.length
        ? await Notification.aggregate([
              { $match: { announcement: { $in: items.map(i => i._id) }, ackAt: { $ne: null } } },
              { $group: { _id: "$announcement", n: { $sum: 1 } } }
          ])
        : [];
    const ackMap = new Map(acks.map(a => [String(a._id), a.n]));

    return res.status(200).json(
        new ApiResponse(
            200,
            { items: items.map(i => ({ ...i, acknowledged: ackMap.get(String(i._id)) || 0 })) },
            "Notices fetched"
        )
    );
});

export { sendBroadcast, listBroadcasts };
