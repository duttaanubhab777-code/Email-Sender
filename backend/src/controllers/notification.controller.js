import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Notification } from "../models/notification.model.js";
import { PushSubscription } from "../models/pushSubscription.model.js";
import {
    getPushPublicKey,
    isAllowedPushEndpoint,
    isPushConfigured,
    pushTest
} from "../services/push.service.js";

const unreadOf = userId => Notification.countDocuments({ recipient: userId, readAt: null });
// Admin এর নোটিশ যেগুলোতে ইউজার এখনো পপআপে "OK" চাপেনি
const pendingAlertsOf = userId =>
    Notification.countDocuments({ recipient: userId, alert: true, ackAt: null });

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
    const [unreadCount, pendingAlerts] = await Promise.all([
        unreadOf(req.user._id),
        pendingAlertsOf(req.user._id)
    ]);
    return res.status(200).json(new ApiResponse(200, { unreadCount, pendingAlerts }, "OK"));
});

// GET /notifications/alerts/pending — পপআপে দেখানোর বাকি Admin নোটিশ (পুরনোটা আগে)
const getPendingAlerts = asyncHandler(async (req, res) => {
    const items = await Notification.find({
        recipient: req.user._id,
        alert: true,
        ackAt: null
    })
        .sort({ createdAt: 1 })
        .limit(10)
        .lean();
    return res.status(200).json(new ApiResponse(200, { items }, "Pending alerts fetched"));
});

// PATCH /notifications/:id/ack — ইউজার পপআপে OK চাপলে: পড়া + স্বীকৃত দুটোই
const ackAlert = asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, "Invalid notification id");
    const now = new Date();
    await Notification.updateOne(
        { _id: req.params.id, recipient: req.user._id, alert: true, ackAt: null },
        { $set: { ackAt: now, readAt: now } }
    );
    return res
        .status(200)
        .json(new ApiResponse(200, { _id: req.params.id, acknowledged: true }, "Acknowledged"));
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

// ---------------- Phone push (ফোনের notification bar) ----------------

// GET /notifications/push/config — frontend এর subscribe করার জন্য public key
const getPushConfig = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            { enabled: isPushConfigured(), publicKey: getPushPublicKey() },
            "Push config"
        )
    );
});

// POST /notifications/push/subscribe — এই ডিভাইসকে এই ইউজারের সাথে জুড়ে দেওয়া
// (একই ডিভাইসে অন্য ইউজার লগইন করলে endpoint এর মালিক বদলে যায়, তাই আগের ইউজারের notification আর আসবে না)
const subscribePush = asyncHandler(async (req, res) => {
    const { endpoint, keys } = req.body || {};
    if (
        typeof endpoint !== "string" ||
        endpoint.length > 1000 ||
        typeof keys?.p256dh !== "string" ||
        typeof keys?.auth !== "string"
    ) {
        throw new ApiError(400, "Invalid push subscription");
    }
    if (!isAllowedPushEndpoint(endpoint)) {
        throw new ApiError(400, "Unsupported push service");
    }

    await PushSubscription.findOneAndUpdate(
        { endpoint },
        {
            $set: {
                user: req.user._id,
                keys: { p256dh: keys.p256dh.slice(0, 200), auth: keys.auth.slice(0, 100) },
                userAgent: String(req.get("user-agent") || "").slice(0, 300)
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return res.status(200).json(new ApiResponse(200, { subscribed: true }, "Push enabled"));
});

// POST /notifications/push/unsubscribe — body: { endpoint } (logout / বন্ধ করার সময়)
const unsubscribePush = asyncHandler(async (req, res) => {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== "string" || !endpoint) throw new ApiError(400, "Endpoint is required");
    await PushSubscription.deleteMany({ endpoint, user: req.user._id });
    return res.status(200).json(new ApiResponse(200, { subscribed: false }, "Push disabled"));
});

// POST /notifications/push/test — নিজের সব ডিভাইসে একটা টেস্ট notification
const sendTestPush = asyncHandler(async (req, res) => {
    const r = await pushTest(req.user._id);
    if (!r.configured) {
        throw new ApiError(503, "Push isn't set up on the server yet (VAPID keys are missing).");
    }
    if (!r.devices) {
        throw new ApiError(404, "No device is subscribed yet. Turn on phone notifications first.");
    }
    return res.status(200).json(new ApiResponse(200, r, "Test notification sent"));
});

export {
    listNotifications,
    getUnreadCount,
    getPendingAlerts,
    ackAlert,
    markRead,
    markAllRead,
    deleteNotification,
    getPushConfig,
    subscribePush,
    unsubscribePush,
    sendTestPush
};
