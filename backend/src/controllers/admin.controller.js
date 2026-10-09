import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiKey } from "../models/ApiKey.model.js";
import { Submission } from "../models/submission.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// ১. ড্যাশবোর্ডের স্ট্যাটিস্টিকস আনা
const getAdminStats = asyncHandler(async (req, res) => {
    const [totalUsers, totalApiKeys, totalEmails] = await Promise.all([
        User.countDocuments(),
        ApiKey.countDocuments(),
        Submission.countDocuments()
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            { totalUsers, totalApiKeys, totalEmails },
            "Admin stats fetched successfully"
        )
    );
});

// ২. সব ইউজারের লিস্ট আনা (পাসওয়ার্ড ও রিফ্রেশ টোকেন ছাড়া)
const getAdminUsers = asyncHandler(async (req, res) => {
    const users = await User.find()
        .select("-password -refreshToken")
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, users, "All users fetched successfully")
    );
});

// ৩. ইউজারকে ব্লক বা আনব্লক করা
const toggleBlockUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isBlocked } = req.body;

    if (req.user._id.toString() === id) {
        throw new ApiError(400, "You cannot block yourself");
    }

    const targetUser = await User.findById(id);

    if (!targetUser) {
        throw new ApiError(404, "User not found");
    }

    if (targetUser.isSuperAdmin) {
        throw new ApiError(403, "Super Admin cannot be blocked");
    }

    targetUser.isBlocked = isBlocked;
    await targetUser.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            { _id: targetUser._id, isBlocked: targetUser.isBlocked },
            `User successfully ${isBlocked ? "blocked" : "unblocked"}`
        )
    );
});

// ৪. ডাটাবেসের মাধ্যমে কাউকে নতুন অ্যাডমিন বানানো
const makeAdmin = asyncHandler(async (req, res) => {
    const { targetEmail } = req.body;

    if (!targetEmail) {
        throw new ApiError(400, "Target email is required");
    }

    const updatedUser = await User.findOneAndUpdate(
        { email: targetEmail },
        { $set: { role: "admin" } },
        { new: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
        throw new ApiError(404, "User with this email not found");
    }

    return res.status(200).json(
        new ApiResponse(200, updatedUser, "Successfully made the user an admin")
    );
});

export { getAdminStats, getAdminUsers, toggleBlockUser, makeAdmin };