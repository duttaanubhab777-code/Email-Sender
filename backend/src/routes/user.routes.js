import { Router } from "express";
import {
    registerUser,
    verifyRegisterOtp,
    loginUser,
    forgotPassword,
    resetPassword,
    resendOtpCode,
    checkUsername,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    getUserDashboardStats
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rateLimit.middleware.js";

const router = Router();

const authLimit = rateLimit({ name: "auth", windowMs: 15 * 60 * 1000, max: 20 });
const otpLimit = rateLimit({ name: "otp", windowMs: 15 * 60 * 1000, max: 15 });
const usernameLimit = rateLimit({ name: "username", windowMs: 60 * 1000, max: 30 });

// Register (OTP)
router.route("/register").post(
    authLimit,
    upload.fields([{ name: "avatar", maxCount: 1 }]),
    registerUser
);
router.route("/register/verify").post(otpLimit, verifyRegisterOtp);

// Login (শুধু password)
router.route("/login").post(authLimit, loginUser);

// Forgot password (OTP)
router.route("/forgot-password").post(authLimit, forgotPassword);
router.route("/forgot-password/reset").post(otpLimit, resetPassword);

// OTP আবার পাঠানো (৩০ সেকেন্ড পর)
router.route("/otp/resend").post(otpLimit, resendOtpCode);

// Username check / suggestion
router.route("/check-username").get(usernameLimit, checkUsername);

//secured routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);
router.route("/dashboard").get(verifyJWT, getUserDashboardStats);

export default router;
