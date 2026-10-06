import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiKey } from "../models/ApiKey.model.js";

const verifyApiKey = asyncHandler(async (req, res, next) => {
    // ১. রিকোয়েস্টের হেডার থেকে API Key টা খোঁজা (ডেভেলপাররা সাধারণত 'x-api-key' নামে পাঠায়)
    const providedKey = req.header("x-api-key") || req.query.apiKey;

    if (!providedKey) {
        throw new ApiError(401, "API Key is missing in the request header");
    }

    // ২. ডেটাবেসে এই Key-টা খোঁজা এবং সাথে সাথে ইউজারের ডেটাও (populate করে) নিয়ে আসা
    const apiKeyDoc = await ApiKey.findOne({ key: providedKey }).populate("user", "fullName email");

    if (!apiKeyDoc) {
        throw new ApiError(401, "Invalid API Key");
    }

    // ৩. Key-টা কি পজ বা বন্ধ করা আছে?
    if (!apiKeyDoc.isActive) {
        throw new ApiError(403, "This API Key is disabled. Please enable it from your dashboard.");
    }

    // ৪. ইউজারের মাসিক লিমিট চেক করা (usageCount কি monthlyLimit এর সমান বা বেশি হয়ে গেছে?)
    if (apiKeyDoc.usageCount >= apiKeyDoc.monthlyLimit) {
        throw new ApiError(429, "Monthly email limit exceeded for this API Key. Please upgrade your plan.");
    }

    // 🌟 ম্যাজিক: সব চেক পাস করলে, পরবর্তী কন্ট্রোলারের জন্য রিকোয়েস্ট অবজেক্টে ডেটাগুলো সেভ করে রাখা
    req.apiKey = apiKeyDoc; 
    req.user = apiKeyDoc.user; // যাতে আমরা জানতে পারি কোন ইউজারের Key দিয়ে ইমেইলটা যাচ্ছে

    // পাহারাদারের কাজ শেষ, এবার আসল কন্ট্রোলারকে (ইমেইল পাঠানোর লজিক) কাজ করতে দাও
    next();
});

export { verifyApiKey };