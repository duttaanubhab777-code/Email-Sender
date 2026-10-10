import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiKey } from "../models/ApiKey.model.js";
import { Submission } from "../models/submission.model.js";

const verifyApiKey = asyncHandler(async (req, res, next) => {
    
    const providedKey = req.header("x-api-key") || req.body?.access_key || req.query.apiKey;

    if (!providedKey) {
        throw new ApiError(401, "API Key is missing in the request header");
    }

    // ২. ডেটাবেসে এই Key-টা খোঁজা এবং সাথে সাথে ইউজারের ডেটাও (populate করে) নিয়ে আসা
    const apiKeyDoc = await ApiKey.findOne({ key: providedKey }).populate("user", "fullName email monthlyEmailLimit isBlocked");

    if (!apiKeyDoc) {
        throw new ApiError(401, "Invalid API Key");
    }

    // ৩. Key-টা কি পজ বা বন্ধ করা আছে?
    if (!apiKeyDoc.isActive) {
        throw new ApiError(403, "This API Key is disabled. Please enable it from your dashboard.");
    }

    // ৪. মালিক block হলে বা এই মাসের limit শেষ হলে বন্ধ (limit আছে user.monthlyEmailLimit এ)
    if (!apiKeyDoc.user || apiKeyDoc.user.isBlocked) {
        throw new ApiError(403, "This API Key owner is not allowed to send emails");
    }

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const usedThisMonth = await Submission.countDocuments({
        user: apiKeyDoc.user._id,
        createdAt: { $gte: monthStart }
    });

    if (usedThisMonth >= apiKeyDoc.user.monthlyEmailLimit) {
        throw new ApiError(429, "Monthly email limit exceeded. Please upgrade your plan.");
    }

    // 🌟 ম্যাজিক: সব চেক পাস করলে, পরবর্তী কন্ট্রোলারের জন্য রিকোয়েস্ট অবজেক্টে ডেটাগুলো সেভ করে রাখা
    req.apiKey = apiKeyDoc; 
    req.user = apiKeyDoc.user; // যাতে আমরা জানতে পারি কোন ইউজারের Key দিয়ে ইমেইলটা যাচ্ছে

    // পাহারাদারের কাজ শেষ, এবার আসল কন্ট্রোলারকে (ইমেইল পাঠানোর লজিক) কাজ করতে দাও
    next();
});

export { verifyApiKey };