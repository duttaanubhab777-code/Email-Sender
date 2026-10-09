import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/auth.middleware.js";
import { 
    getAdminStats, 
    getAdminUsers, 
    toggleBlockUser, 
    makeAdmin 
} from "../controllers/admin.controller.js";

const router = Router();

// এই রাউটগুলোতে শুধুমাত্র অ্যাডমিনরাই এক্সেস পাবে
router.use(verifyJWT, verifyAdmin);

// ড্যাশবোর্ডের টাইলসের ডেটা
router.route("/stats").get(getAdminStats);

// সব ইউজারের লিস্ট
router.route("/users").get(getAdminUsers);

// ইউজারকে ব্লক বা আনব্লক করা
router.route("/users/:id/block").patch(toggleBlockUser);

// নতুন কাউকে অ্যাডমিন বানানো
router.route("/make-admin").put(makeAdmin);

export default router;