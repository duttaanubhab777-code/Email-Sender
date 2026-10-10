import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { authorizeExtra } from "../utils/approval.js";
import { normEmail, isEmail } from "../utils/validators.js";
import { normalizeUsername, usernameFromEmail, findFreeUsername } from "../utils/username.js";
import { deleteFromCloudinary, publicIdFromUrl } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiKey } from "../models/ApiKey.model.js";
import { Submission } from "../models/submission.model.js";
import { Approval } from "../models/approval.model.js";
import { Otp } from "../models/otp.model.js";
import { PASSWORD_MIN_LENGTH, USERNAME_REGEX } from "../constants.js";

const SAFE = "-password -refreshToken";

const loadTarget = async (req, id) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid user id");
    if (req.user._id.toString() === id) {
        throw new ApiError(400, "You cannot do this action on yourself");
    }
    const target = await User.findById(id);
    if (!target) throw new ApiError(404, "User not found");
    if (target.isSuperAdmin) throw new ApiError(403, "Super Admin cannot be blocked, deleted or changed");
    return target;
};

// ১. Stats (Admin + Super Admin)
const getAdminStats = asyncHandler(async (req, res) => {
    const [totalUsers, totalAdmins, blockedUsers, totalApiKeys, totalEmails, pendingApprovals] =
        await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "admin" }),
            User.countDocuments({ isBlocked: true }),
            ApiKey.countDocuments(),
            Submission.countDocuments(),
            req.user.isSuperAdmin
                ? Approval.countDocuments({ status: "pending", expiresAt: { $gt: new Date() } })
                : Promise.resolve(0)
        ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            { totalUsers, totalAdmins, blockedUsers, totalApiKeys, totalEmails, pendingApprovals },
            "Admin stats fetched successfully"
        )
    );
});

// ২. সব ইউজার (Admin + Super Admin)
const getAdminUsers = asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.role === "admin" || req.query.role === "user") filter.role = req.query.role;
    if (req.query.blocked === "true") filter.isBlocked = true;

    const users = await User.find(filter).select(SAFE).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, users, "All users fetched successfully"));
});

// ৩. Block / Unblock (সাধারণ ইউজার: সরাসরি। অন্য Admin: Super Admin এর permission)
const toggleBlockUser = asyncHandler(async (req, res) => {
    const target = await loadTarget(req, req.params.id);

    const wanted =
        typeof req.body.isBlocked === "boolean" ? req.body.isBlocked : !target.isBlocked;

    if (target.role === "admin") {
        await authorizeExtra(req, "block_admin", String(target._id));
    }

    target.isBlocked = wanted;
    if (wanted) target.refreshToken = undefined; // block হলে সাথে সাথে session শেষ
    await target.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(
            200,
            { _id: target._id, isBlocked: target.isBlocked },
            `User successfully ${wanted ? "blocked" : "unblocked"}`
        )
    );
});

// ৪. User delete (সাধারণ ইউজার: সরাসরি। অন্য Admin: Super Admin এর permission)
const deleteUser = asyncHandler(async (req, res) => {
    const target = await loadTarget(req, req.params.id);

    if (target.role === "admin") {
        await authorizeExtra(req, "delete_admin", String(target._id));
    }

    await Promise.all([
        ApiKey.deleteMany({ user: target._id }),
        Submission.deleteMany({ user: target._id }),
        Otp.deleteMany({ email: target.email })
    ]);
    if (target.avatar) await deleteFromCloudinary(publicIdFromUrl(target.avatar));
    await target.deleteOne();

    return res.status(200).json(new ApiResponse(200, { _id: target._id }, "User deleted successfully"));
});

// ৫. আগের ইউজারকে Admin বানানো (Super Admin সরাসরি / Admin permission নিয়ে)
const makeAdmin = asyncHandler(async (req, res) => {
    const email = normEmail(req.body.targetEmail);
    if (!isEmail(email)) throw new ApiError(400, "Target email is required");

    const target = await User.findOne({ email });
    if (!target) throw new ApiError(404, "User with this email not found");
    if (target.role === "admin") throw new ApiError(409, "User is already an admin");

    await authorizeExtra(req, "make_admin", email);

    target.role = "admin";
    await target.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, await User.findById(target._id).select(SAFE), "Successfully made the user an admin")
    );
});

// ৬. একদম নতুন Admin account বানানো
const createAdmin = asyncHandler(async (req, res) => {
    const fullName = String(req.body.fullName ?? "").trim();
    const email = normEmail(req.body.email);
    const { password } = req.body;

    if (!fullName || !isEmail(email) || !password) {
        throw new ApiError(400, "fullName, a valid email and password are required");
    }
    if (String(password).length < PASSWORD_MIN_LENGTH) {
        throw new ApiError(400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (await User.exists({ email })) throw new ApiError(409, "User with this email already exists");

    let username = normalizeUsername(req.body.username);
    if (username) {
        if (!USERNAME_REGEX.test(username)) throw new ApiError(400, "Invalid username");
        if (await User.exists({ username })) throw new ApiError(409, "Username already taken");
    } else {
        username = await findFreeUsername(usernameFromEmail(email));
    }

    await authorizeExtra(req, "create_admin", email);

    const admin = await User.create({
        fullName,
        email,
        username,
        password,
        role: "admin",
        ipAddress: req.ip
    });

    return res
        .status(201)
        .json(new ApiResponse(201, await User.findById(admin._id).select(SAFE), "Admin created successfully"));
});

// ৭. Admin থেকে সাধারণ ইউজার করে দেওয়া
const removeAdmin = asyncHandler(async (req, res) => {
    const email = normEmail(req.body.targetEmail);
    const target = await User.findOne({ email });
    if (!target) throw new ApiError(404, "User with this email not found");

    await loadTarget(req, String(target._id)); // self / super admin চেক
    if (target.role !== "admin") throw new ApiError(409, "User is not an admin");

    await authorizeExtra(req, "remove_admin", String(target._id));

    target.role = "user";
    await target.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, await User.findById(target._id).select(SAFE), "Admin role removed")
    );
});

export { getAdminStats, getAdminUsers, toggleBlockUser, deleteUser, makeAdmin, createAdmin, removeAdmin };
