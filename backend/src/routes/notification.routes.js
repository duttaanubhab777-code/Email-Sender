import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rateLimit.middleware.js";
import {
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
} from "../controllers/notification.controller.js";

const router = Router();

// প্রতিটা ইউজার শুধু নিজের notification দেখে (সবার জন্য, Admin হতে হবে না)
router.use(verifyJWT);

const byUser = req => String(req.user?._id);
const pushLimit = rateLimit({ name: "push", windowMs: 15 * 60 * 1000, max: 40, key: byUser });
const testLimit = rateLimit({ name: "push-test", windowMs: 10 * 60 * 1000, max: 5, key: byUser });

router.route("/").get(listNotifications);
router.route("/unread-count").get(getUnreadCount);
router.route("/read-all").patch(markAllRead);

// Admin এর গুরুত্বপূর্ণ নোটিশ (পপআপ)
router.route("/alerts/pending").get(getPendingAlerts);
router.route("/:id/ack").patch(ackAlert);

// ফোনের notification bar (Web Push)
router.route("/push/config").get(getPushConfig);
router.route("/push/subscribe").post(pushLimit, subscribePush);
router.route("/push/unsubscribe").post(pushLimit, unsubscribePush);
router.route("/push/test").post(testLimit, sendTestPush);

router.route("/:id/read").patch(markRead);
router.route("/:id").delete(deleteNotification);

export default router;
