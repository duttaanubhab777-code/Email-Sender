import { Router } from "express";
import { 
    createApiKey, 
    getUserApiKeys, 
    deleteApiKey 
} from "../controllers/apiKey.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// 🌟 স্মার্ট ট্রিক: যেহেতু API Key-এর সমস্ত কাজের জন্যই ইউজারের লগ-ইন থাকা বাধ্যতামূলক, 
// তাই আমরা router.use() দিয়ে পুরো রাউটারের ওপর একবারে verifyJWT পাহারাদার বসিয়ে দিলাম।
// এর ফলে নিচের প্রতিটি রাউটে আলাদা করে verifyJWT লিখতে হবে না!
router.use(verifyJWT); 

// রাউটগুলো ডিফাইন করা হলো
router.route("/create").post(createApiKey);
router.route("/all").get(getUserApiKeys);
router.route("/delete/:keyId").delete(deleteApiKey); // URL থেকে ID নেওয়ার জন্য :keyId দেওয়া হলো

export default router;