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
import { notifyUser, notifyAdmins } from "../services/notification.service.js";
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

    notifyAdmins(
        {
            type: wanted ? "user_blocked" : "user_unblocked",
            title: wanted ? "User blocked" : "User unblocked",
            body: `${target.fullName} (${target.email}) by ${req.user.fullName}`,
            link: "/admin/users"
        },
        { exclude: [req.user._id] }
    );

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

    notifyAdmins(
        {
            type: "user_deleted",
            title: "User deleted",
            body: `${target.fullName} (${target.email}) by ${req.user.fullName}`,
            link: "/admin/users"
        },
        { exclude: [req.user._id] }
    );

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

    notifyUser(target._id, {
        type: "role_changed",
        title: "You are now an admin",
        body: `Granted by ${req.user.fullName}`,
        link: "/admin/stats"
    });
    notifyAdmins(
        {
            type: "admin_added",
            title: "New admin",
            body: `${target.fullName} (${target.email}) was made admin by ${req.user.fullName}`,
            link: "/admin/users"
        },
        { exclude: [req.user._id, target._id] }
    );

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

    notifyAdmins(
        {
            type: "admin_added",
            title: "New admin created",
            body: `${admin.fullName} (${admin.email}) by ${req.user.fullName}`,
            link: "/admin/users"
        },
        { exclude: [req.user._id, admin._id] }
    );

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

    notifyUser(target._id, {
        type: "role_changed",
        title: "Your admin role was removed",
        body: `Changed by ${req.user.fullName}`,
        link: "/users/dashboard"
    });

    return res.status(200).json(
        new ApiResponse(200, await User.findById(target._id).select(SAFE), "Admin role removed")
    );
});

// regex এ ব্যবহারের আগে বিশেষ চিহ্ন escape (search injection আটকাতে)
const escapeRegex = v => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pageParams = query => {
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    return { limit, page, skip: (page - 1) * limit };
};

// ৮. সব ইউজারের email + API key (Admin + Super Admin দুজনেই দেখতে পারবে)
const getUserDirectory = asyncHandler(async (req, res) => {
    const { limit, page, skip } = pageParams(req.query);
    const q = String(req.query.q ?? "").trim().slice(0, 60);

    const filter = {};
    if (req.query.role === "admin" || req.query.role === "user") filter.role = req.query.role;
    if (q) {
        const rx = new RegExp(escapeRegex(q), "i");
        const keyOwners = await ApiKey.find({ $or: [{ key: rx }, { name: rx }] }).distinct("user");
        filter.$or = [
            { fullName: rx },
            { username: rx },
            { email: rx },
            { _id: { $in: keyOwners } }
        ];
    }

    const [users, total] = await Promise.all([
        User.find(filter)
            .select("fullName username email avatar role isSuperAdmin isBlocked createdAt")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(filter)
    ]);

    const keys = await ApiKey.find({ user: { $in: users.map(u => u._id) } })
        .select("user name key isActive usageCount createdAt")
        .sort({ createdAt: -1 })
        .lean();

    const byUser = new Map();
    for (const k of keys) {
        const id = String(k.user);
        if (!byUser.has(id)) byUser.set(id, []);
        byUser.get(id).push({
            _id: k._id,
            name: k.name,
            key: k.key,
            isActive: k.isActive,
            usageCount: k.usageCount,
            createdAt: k.createdAt
        });
    }

    const items = users.map(u => ({ ...u, apiKeys: byUser.get(String(u._id)) || [] }));
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res
        .status(200)
        .json(new ApiResponse(200, { items, total, page, limit, totalPages }, "User directory fetched successfully"));
});

// ৯. সব ইউজারের login history (IP + সময়) — নতুনটা আগে (Admin + Super Admin)
const getLoginHistory = asyncHandler(async (req, res) => {
    const { limit, page, skip } = pageParams(req.query);
    const q = String(req.query.q ?? "").trim().slice(0, 60);

    const match = { "loginHistory.0": { $exists: true } };
    if (mongoose.isValidObjectId(req.query.userId)) {
        match._id = new mongoose.Types.ObjectId(req.query.userId);
    }
    if (q) {
        const rx = new RegExp(escapeRegex(q), "i");
        match.$or = [{ fullName: rx }, { username: rx }, { email: rx }, { "loginHistory.ipAddress": rx }];
    }

    // search IP দিয়ে হলে শুধু মিলে যাওয়া IP এর এন্ট্রি দেখানো
    const ipRx = q ? new RegExp(escapeRegex(q), "i") : null;

    const [result] = await User.aggregate([
        { $match: match },
        { $unwind: "$loginHistory" },
        ...(ipRx
            ? [
                  {
                      $match: {
                          $or: [
                              { fullName: ipRx },
                              { username: ipRx },
                              { email: ipRx },
                              { "loginHistory.ipAddress": ipRx }
                          ]
                      }
                  }
              ]
            : []),
        { $sort: { "loginHistory.loginTime": -1 } },
        {
            $facet: {
                items: [
                    { $skip: skip },
                    { $limit: limit },
                    {
                        $project: {
                            _id: 0,
                            userId: "$_id",
                            fullName: 1,
                            username: 1,
                            email: 1,
                            avatar: 1,
                            role: 1,
                            isSuperAdmin: 1,
                            isBlocked: 1,
                            ipAddress: "$loginHistory.ipAddress",
                            loginTime: "$loginHistory.loginTime"
                        }
                    }
                ],
                total: [{ $count: "n" }]
            }
        }
    ]);

    const total = result?.total?.[0]?.n ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { items: result?.items ?? [], total, page, limit, totalPages },
                "Login history fetched successfully"
            )
        );
});

// ১০. সব ইউজারের পাঠানো/পাওয়া email (Admin + Super Admin) — IP, sender, message সহ
const getAllEmails = asyncHandler(async (req, res) => {
    const { limit, page, skip } = pageParams(req.query);
    const q = String(req.query.q ?? "").trim().slice(0, 60);

    const filter = {};
    if (req.query.status === "sent" || req.query.status === "failed") filter.status = req.query.status;
    if (mongoose.isValidObjectId(req.query.userId)) filter.user = req.query.userId;

    if (q) {
        const rx = new RegExp(escapeRegex(q), "i");
        const owners = await User.find({ $or: [{ fullName: rx }, { username: rx }, { email: rx }] }).distinct("_id");
        filter.$or = [
            { senderName: rx },
            { senderEmail: rx },
            { receiverEmail: rx },
            { subject: rx },
            { message: rx },
            { ipAddress: rx },
            { user: { $in: owners } }
        ];
    }

    const [items, total, sent, failed] = await Promise.all([
        Submission.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("user", "fullName username email avatar")
            .populate("apiKey", "name")
            .lean(),
        Submission.countDocuments(filter),
        Submission.countDocuments({ ...filter, status: "sent" }),
        Submission.countDocuments({ ...filter, status: "failed" })
    ]);

    const data = items.map(s => ({
        _id: s._id,
        senderName: s.senderName,
        senderEmail: s.senderEmail,
        receiverEmail: s.receiverEmail,
        subject: s.subject,
        message: s.message,
        ipAddress: s.ipAddress,
        status: s.status,
        createdAt: s.createdAt,
        owner: s.user
            ? {
                  _id: s.user._id,
                  fullName: s.user.fullName,
                  username: s.user.username,
                  email: s.user.email,
                  avatar: s.user.avatar
              }
            : null,
        apiKeyName: s.apiKey?.name ?? "Deleted key"
    }));

    return res.status(200).json(
        new ApiResponse(
            200,
            { items: data, total, sent, failed, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
            "Emails fetched successfully"
        )
    );
});

export {
    getAllEmails,
    getAdminStats,
    getAdminUsers,
    toggleBlockUser,
    deleteUser,
    makeAdmin,
    createAdmin,
    removeAdmin,
    getUserDirectory,
    getLoginHistory
};
