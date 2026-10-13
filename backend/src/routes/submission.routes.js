import { Router } from "express";
import { sendEmail } from "../controllers/submission.controller.js";
import { verifyApiKey } from "../middlewares/apiKey.middleware.js";
import { rateLimit } from "../middlewares/rateLimit.middleware.js";

const router = Router();

// ফর্ম খোলা/ফোকাস হওয়ার সাথে সাথে frontend এটা ডাকে — Render এর ঘুমন্ত server টা ফর্ম পূরণের সময়েই জেগে ওঠে
router.get("/ping", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.status(204).end();
});

router.route("/send").post(
    rateLimit({ name: "mail-send", windowMs: 60_000, max: 20 }),
    verifyApiKey,
    sendEmail
);

export default router;
