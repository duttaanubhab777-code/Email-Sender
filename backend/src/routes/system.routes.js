import { Router } from "express";
import crypto from "node:crypto";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { getPublicStatus } from "../services/killSwitch.service.js";
import { sweep, queueStats } from "../services/mailQueue.service.js";

const router = Router();

// Public: frontend এই route দেখে countdown দেখাবে (kill switch চালু থাকলেও এটা খোলা)
router
    .route("/status")
    .get((req, res) =>
        res
            .status(200)
            .json(new ApiResponse(200, getPublicStatus(), "System status"))
    );

const same = (a, b) => {
    const x = Buffer.from(String(a));
    const y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// cron-job.org এখানে ডাকে (সকাল ৮টা + রাত ৮টা)। এতে Render এর ঘুমন্ত server জাগে,
// আর পাঠানো যায়নি এমন সব ইমেইল এখনই আবার পাঠানো শুরু হয়।
// সঙ্গে সঙ্গে সাড়া দেয় (cron-job.org এর timeout ছোট), কাজ চলে ব্যাকগ্রাউন্ডে।
const requireCronKey = req => {
    const secret = process.env.CRON_SECRET;
    if (!secret)
        throw new ApiError(503, "CRON_SECRET is not set on the server");
    const given = req.header("x-cron-key") || req.query.key || "";
    if (!same(given, secret)) throw new ApiError(401, "Invalid cron key");
};

// মোবাইলের ব্রাউজারে দেখার জন্য: কতগুলো মেইল pending/failed, শেষ error কী, কোন provider চলছে।
// খুলতে: /api/v1/system/mail-queue?key=CRON_SECRET
router.route("/mail-queue").get(async (req, res, next) => {
    try {
        requireCronKey(req);
        res.set("Cache-Control", "no-store");
        res.status(200).json(
            new ApiResponse(200, await queueStats(), "Mail queue status")
        );
    } catch (error) {
        next(error);
    }
});

router.route("/cron").get((req, res) => {
    requireCronKey(req);

    setImmediate(() =>
        sweep({ force: true })
            .then(n => console.log(`[cron] retry sweep done — ${n} sent`))
            .catch(e => console.error("[cron] sweep failed:", e.message))
    );
    res.set("Cache-Control", "no-store");
    res.status(202).json(
        new ApiResponse(202, { started: true }, "Retry sweep started")
    );
});

export default router;
