import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    listNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    deleteNotification
} from "../controllers/notification.controller.js";

const router = Router();

// প্রতিটা ইউজার শুধু নিজের notification দেখে (সবার জন্য, Admin হতে হবে না)
router.use(verifyJWT);

router.route("/").get(listNotifications);
router.route("/unread-count").get(getUnreadCount);
router.route("/read-all").patch(markAllRead);
router.route("/:id/read").patch(markRead);
router.route("/:id").delete(deleteNotification);

export default router;
