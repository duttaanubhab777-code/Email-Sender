import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rateLimit.middleware.js";
import {
    getKillOptions,
    startKillSwitch,
    confirmStep1,
    resendKillOtp,
    verifyKillOtp,
    executeKillSwitch
} from "../controllers/killSwitch.controller.js";

const router = Router();

// Super Admin সরাসরি; Admin হলে Super Admin এর approval লাগে (controller এ চেক হয়)
router.use(verifyJWT, verifyAdmin);

const perUser = (name, max) =>
    rateLimit({ name, windowMs: 15 * 60 * 1000, max, key: req => String(req.user._id) });

router.route("/options").get(getKillOptions);
router.route("/start").post(perUser("kill-start", 5), startKillSwitch); // ১. password + targets
router.route("/confirm").post(perUser("kill-confirm", 10), confirmStep1); // ২. are you sure? yes -> OTP
router.route("/resend-otp").post(perUser("kill-resend", 10), resendKillOtp);
router.route("/verify-otp").post(perUser("kill-otp", 10), verifyKillOtp); // ৩. OTP
router.route("/execute").post(perUser("kill-exec", 5), executeKillSwitch); // ৪. yes + kill password
// ইচ্ছে করেই কোনো cancel route নেই

export default router;
