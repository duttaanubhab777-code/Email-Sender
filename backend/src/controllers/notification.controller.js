import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Notification } from "../models/notification.model.js";

const unreadOf = userId => Notification.countDocuments({ recipient: userId, readAt: null });

// GET /notifications?filter=all|unread&page=&limit=
const listNotifications = asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const filter = { recipient: req.user._id };
    if (req.query.filter === "unread") filter.readAt = null;

    const [items, total, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Notification.countDocuments(filter),
        unreadOf(req.user._id)
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            { items, total, unreadCount, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
            "Notifications fetched"
        )
    );
});

// GET /notifications/unread-count — bell এর সংখ্যা (হালকা, বারবার ডাকা হয়)
const getUnreadCount = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, { unreadCount: await unreadOf(req.user._id) }, "OK"));
});

const markRead = asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid notification id");
    const n = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user._id, readAt: null },
        { $set: { readAt: new Date() } },
        { new: true }
    );
    // আগেই read হয়ে থাকলেও সমস্যা নেই
    return res
        .status(200)
        .json(new ApiResponse(200, { _id: req.params.id, read: true, found: !!n }, "Marked as read"));
});

const markAllRead = asyncHandler(async (req, res) => {
    const r = await Notification.updateMany(
        { recipient: req.user._id, readAt: null },
        { $set: { readAt: new Date() } }
    );
    return res
        .status(200)
        .json(new ApiResponse(200, { updated: r.modifiedCount }, "All notifications marked as read"));
});

const deleteNotification = asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid notification id");
    await Notification.deleteOne({ _id: req.params.id, recipient: req.user._id });
    return res.status(200).json(new ApiResponse(200, { _id: req.params.id }, "Notification deleted"));
});

export { listNotifications, getUnreadCount, markRead, markAllRead, deleteNotification };
