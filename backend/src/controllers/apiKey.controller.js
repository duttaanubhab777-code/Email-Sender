import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiKey } from "../models/ApiKey.model.js";

// ১. নতুন API Key তৈরি করার কন্ট্রোলার
const createApiKey = asyncHandler(async (req, res) => {
    // ফ্রন্টএন্ড থেকে ইউজার প্রজেক্টের একটা নাম দেবে (যেমন: "My Portfolio Site")
    const { name } = req.body;

    if (!name?.trim()) {
        throw new ApiError(400, "Project name is required for the API Key");
    }

    // ডেটাবেসে Key সেভ করা (আসল স্ট্রিংটা মডেল নিজে থেকেই জেনারেট করে নেবে)
    const newApiKey = await ApiKey.create({
        user: req.user._id, // লগ-ইন করা ইউজারের আইডি
        name: name
    });

    if (!newApiKey) {
        throw new ApiError(500, "Something went wrong while generating API Key");
    }

    return res.status(201).json(
        new ApiResponse(201, newApiKey, "API Key generated successfully!")
    );
});

// ২. ইউজারের সমস্ত API Key দেখানোর কন্ট্রোলার
const getUserApiKeys = asyncHandler(async (req, res) => {
    // লগ-ইন করা ইউজারের আইডি দিয়ে ডেটাবেস থেকে তার সব Key খুঁজে বের করা
    // .sort({ createdAt: -1 }) দেওয়া হলো যাতে নতুন তৈরি করা Key লিস্টের একদম ওপরে থাকে
    const apiKeys = await ApiKey.find({ user: req.user._id }).sort({ createdAt: -1 });

    if (!apiKeys) {
        throw new ApiError(404, "No API Keys found for this user");
    }

    return res.status(200).json(
        new ApiResponse(200, apiKeys, "User API Keys fetched successfully")
    );
});

// ৩. API Key ডিলিট করার কন্ট্রোলার
const deleteApiKey = asyncHandler(async (req, res) => {
    // ফ্রন্টএন্ড থেকে যে Key-টা ডিলিট করতে হবে, তার আইডিটা URL থেকে আসবে
    const { keyId } = req.params;

    if (!keyId) {
        throw new ApiError(400, "API Key ID is required");
    }

    // Key-টা খুঁজে ডিলিট করা
    const deletedKey = await ApiKey.findOneAndDelete({
        _id: keyId,
        user: req.user._id // 🌟 সিকিউরিটি চেক: Key-টা যেন এই ইউজারেরই হয়!
    });

    if (!deletedKey) {
        throw new ApiError(404, "API Key not found or you are not authorized to delete it");
    }

    return res.status(200).json(
        new ApiResponse(200, {}, "API Key deleted successfully")
    );
});

// সবশেষে এক্সপোর্ট লিস্টটা আপডেট করে দাও:
export { createApiKey, getUserApiKeys, deleteApiKey };



