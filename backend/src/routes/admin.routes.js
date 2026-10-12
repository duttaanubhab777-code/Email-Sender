import { Router } from "express";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rateLimit.middleware.js";
import { sendBroadcast, listBroadcasts } from "../controllers/broadcast.controller.js";
import {
    getAdminStats,
    getAdminUsers,
    toggleBlockUser,
    deleteUser,
    makeAdmin,
    createAdmin,
    removeAdmin,
    getUserDirectory,
    getLoginHistory,
    getAllEmails
} from "../controllers/admin.controller.js";

const router = Router();

router.use(verifyJWT, verifyAdmin);

// ---- বেসিক কন্ট্রোল: Admin + Super Admin দুজনেই সরাসরি ----
router.route("/stats").get(getAdminStats);
router.route("/users").get(getAdminUsers);
router.route("/directory").get(getUserDirectory); // সব ইউজারের email + API key
router.route("/login-history").get(getLoginHistory); // সব ইউজারের login (IP + সময়)
router.route("/emails").get(getAllEmails); // সব ইউজারের email (IP সহ)
// গুরুত্বপূর্ণ নোটিশ পাঠানো (ফোন push + bell + ৫ সেকেন্ডের পপআপ) — Admin + Super Admin দুজনেই সরাসরি
router
    .route("/broadcast")
    .get(listBroadcasts)
    .post(
        rateLimit({
            name: "broadcast",
            windowMs: 60 * 60 * 1000,
            max: 20,
            key: req => String(req.user?._id)
        }),
        sendBroadcast
    );
router.route("/users/:id/block").patch(toggleBlockUser); // সাধারণ ইউজার
router.route("/users/:id").delete(deleteUser); // সাধারণ ইউজার

// ---- এক্সট্রা: Super Admin সরাসরি, Admin হলে Super Admin এর approval নিয়ে ----
// (অন্য Admin কে block/delete করাও এক্সট্রা — controller এর ভিতরে চেক হয়)
router.route("/create-admin").post(createAdmin);
router.route("/make-admin").put(makeAdmin);
router.route("/remove-admin").put(removeAdmin);

export default router;
