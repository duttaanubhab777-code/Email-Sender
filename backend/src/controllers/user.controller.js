import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
    publicIdFromUrl,
    removeLocalFile
} from "../utils/cloudinary.js";
import { normEmail, isEmail, maskEmail } from "../utils/validators.js";
import {
    normalizeUsername,
    usernameFromEmail,
    findFreeUsername
} from "../utils/username.js";
import {
    assertCanSend,
    createAndSendOtp,
    resendOtp,
    verifyOtp
} from "../services/otp.service.js";
import {
    OTP_PURPOSES,
    OTP_EXPIRY_MINUTES,
    OTP_RESEND_COOLDOWN_SECONDS,
    PASSWORD_MIN_LENGTH,
    USERNAME_REGEX
} from "../constants.js";

const cookieOptions = { httpOnly: true, secure: true };

const otpInfo = email => ({
    otpRequired: true,
    email,
    maskedEmail: maskEmail(email),
    resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
    expiresInMinutes: OTP_EXPIRY_MINUTES
});

const assertPassword = password => {
    if (!password || String(password).length < PASSWORD_MIN_LENGTH) {
        throw new ApiError(400, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
};

// email অথবা username (যেটাই আসুক) দিয়ে user খোঁজা
const findByIdentifier = identifier => {
    const id = String(identifier ?? "").trim().toLowerCase();
    if (!id) return null;
    return User.findOne(id.includes("@") ? { email: id } : { username: id });
};

const genarateAccessAndRefreshTokens = async userId => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.genarateAccessToken();
        const refreshToken = user.genarateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.log("ACTUAL TOKEN ERROR: ", error);
        throw new ApiError(500, "Something went wrong while genarating refrsh and access token");
    }
};

// OTP ঠিক হওয়ার পর token দেওয়া + login history লেখা
const finishLogin = async (req, res, userId, message, status = 200) => {
    const { accessToken, refreshToken } = await genarateAccessAndRefreshTokens(userId);

    await User.findByIdAndUpdate(userId, {
        $push: {
            loginHistory: {
                $each: [{ ipAddress: req.ip, loginTime: new Date() }],
                $slice: -20
            }
        }
    });

    const loggedInUser = await User.findById(userId).select("-password -refreshToken");

    return res
        .status(status)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(status, { user: loggedInUser, accessToken, refreshToken }, message));
};

// ================= REGISTER (OTP) =================

// ধাপ ১: তথ্য নিয়ে OTP পাঠানো (user তখনো তৈরি হয় না)
const registerUser = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.files?.avatar?.[0]?.path;

    let fullName, email, username, password;
    try {
        fullName = String(req.body.fullName ?? "").trim();
        email = normEmail(req.body.email);
        password = req.body.password;

        if (!fullName || !email || !password) {
            throw new ApiError(400, "fullName, email and password are required");
        }
        if (!isEmail(email)) throw new ApiError(400, "Invalid email address");
        assertPassword(password);

        if (await User.exists({ email })) {
            throw new ApiError(409, "User with this email already exists");
        }

        username = normalizeUsername(req.body.username);
        if (username) {
            if (!USERNAME_REGEX.test(username)) {
                throw new ApiError(
                    400,
                    "Username must be 3-20 chars: lowercase letters, numbers, dot, underscore or dash"
                );
            }
            if (await User.exists({ username })) {
                throw new ApiError(409, "Username already taken");
            }
        } else {
            // না দিলে email এর @ এর আগের অংশই username
            username = await findFreeUsername(usernameFromEmail(email));
        }

        await assertCanSend(email, OTP_PURPOSES.REGISTER); // ৩০ সেকেন্ডের আগে আবার নয়
    } catch (error) {
        removeLocalFile(avatarLocalPath);
        throw error;
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const passwordHash = await bcrypt.hash(String(password), 10);

    await createAndSendOtp({
        email,
        purpose: OTP_PURPOSES.REGISTER,
        payload: {
            fullName,
            username,
            passwordHash,
            avatar: avatar?.secure_url || avatar?.url || ""
        }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { ...otpInfo(email), username }, "Verification code sent to your email"));
});

// ধাপ ২: OTP ঠিক হলে account তৈরি + login
const verifyRegisterOtp = asyncHandler(async (req, res) => {
    const email = normEmail(req.body.email);
    if (!email || !req.body.otp) throw new ApiError(400, "email and otp are required");

    const doc = await verifyOtp({ email, purpose: OTP_PURPOSES.REGISTER, code: req.body.otp });
    const { fullName, username, passwordHash, avatar } = doc.payload || {};

    if (await User.exists({ email })) throw new ApiError(409, "User with this email already exists");

    // এর মধ্যে কেউ username নিয়ে নিলে নতুন একটা দেওয়া হবে
    const finalUsername = (await User.exists({ username }))
        ? await findFreeUsername(username)
        : username;

    const user = new User({
        fullName,
        email,
        username: finalUsername,
        password: passwordHash,
        avatar: avatar || "",
        ipAddress: req.ip
    });
    user.$locals.skipHash = true;

    try {
        await user.save();
    } catch (error) {
        if (error.code === 11000) {
            throw new ApiError(409, "User with this email or username already exists");
        }
        throw error;
    }

    return finishLogin(req, res, user._id, "Account created and logged in successfully", 201);
});

// ================= LOGIN (শুধু password) =================

const loginUser = asyncHandler(async (req, res) => {
    const identifier = req.body.identifier ?? req.body.email ?? req.body.username;
    const { password } = req.body;

    if (!identifier || !password) {
        throw new ApiError(400, "Email/username and password are required");
    }

    const user = await findByIdentifier(identifier);
    if (!user || !(await user.isPasswordCorrect(password))) {
        throw new ApiError(401, "Invalid credentials");
    }
    if (user.isBlocked) {
        throw new ApiError(403, "Your account has been blocked. Contact support.");
    }

    return finishLogin(req, res, user._id, "User logged In successfully");
});

// ================= FORGOT PASSWORD (OTP) =================

const forgotPassword = asyncHandler(async (req, res) => {
    const email = normEmail(req.body.email);
    if (!isEmail(email)) throw new ApiError(400, "A valid email is required");

    const user = await User.findOne({ email });
    if (user) {
        try {
            await createAndSendOtp({ email, purpose: OTP_PURPOSES.FORGOT_PASSWORD });
        } catch (error) {
            // ৩০ সেকেন্ডের cooldown এর error চেপে যাওয়া হচ্ছে, যাতে email আছে কিনা বোঝা না যায়
            if (error.statusCode !== 429) throw error;
        }
    }

    // email থাকুক বা না থাকুক, একই উত্তর
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    email,
                    resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
                    expiresInMinutes: OTP_EXPIRY_MINUTES
                },
                "If this email is registered, a reset code has been sent"
            )
        );
});

const resetPassword = asyncHandler(async (req, res) => {
    const email = normEmail(req.body.email);
    const { otp, newPassword } = req.body;
    if (!email || !otp) throw new ApiError(400, "email, otp and newPassword are required");
    assertPassword(newPassword);

    await verifyOtp({ email, purpose: OTP_PURPOSES.FORGOT_PASSWORD, code: otp });

    const user = await User.findOne({ email });
    if (!user) throw new ApiError(400, "Invalid or expired code");

    user.password = newPassword;
    user.refreshToken = undefined; // সব জায়গা থেকে logout
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password reset successfully. Please login with your new password"));
});

// ================= RESEND OTP (৩০ সেকেন্ড পর) =================

const resendOtpCode = asyncHandler(async (req, res) => {
    const { purpose } = req.body;
    const allowed = [OTP_PURPOSES.REGISTER, OTP_PURPOSES.FORGOT_PASSWORD];
    if (!allowed.includes(purpose)) {
        throw new ApiError(400, `purpose must be one of: ${allowed.join(", ")}`);
    }

    const email = normEmail(req.body.email);
    if (!email) throw new ApiError(400, "email is required");

    const sent = await resendOtp({ email, purpose });
    if (!sent && purpose !== OTP_PURPOSES.FORGOT_PASSWORD) {
        throw new ApiError(400, "No pending verification found. Please start again");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS }, "If a request is pending, a new code has been sent"));
});

// ================= USERNAME =================

// ?username=abc  -> পাওয়া যাবে কিনা | ?email=abc@x.com -> suggested username
const checkUsername = asyncHandler(async (req, res) => {
    const data = {};

    if (req.query.username !== undefined) {
        const username = normalizeUsername(req.query.username);
        data.username = username;
        data.valid = USERNAME_REGEX.test(username);
        data.available = data.valid ? !(await User.exists({ username })) : false;
    }
    if (req.query.email !== undefined) {
        const email = normEmail(req.query.email);
        if (!isEmail(email)) throw new ApiError(400, "Invalid email address");
        data.suggested = await findFreeUsername(usernameFromEmail(email));
    }
    if (!Object.keys(data).length) throw new ApiError(400, "Provide ?username= or ?email=");

    return res.status(200).json(new ApiResponse(200, data, "Username check done"));
});

// ================= বাকি আগের মতোই =================

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true }
    );

    return res
        .status(200)
        .clearCookie("accessToken", cookieOptions)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "User logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incommingRefreshToken) {
        throw new ApiError(401, "Unauthorised Request");
    }

    try {
        const decodedToken = jwt.verify(incommingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);

        if (!user) throw new ApiError(401, "Invalid Refresh Token");
        if (incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }
        if (user.isBlocked) throw new ApiError(401, "Your account has been blocked");

        const { accessToken, refreshToken } = await genarateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookieOptions)
            .cookie("refreshToken", refreshToken, cookieOptions)
            .json(new ApiResponse(200, { accessToken, refreshToken }, "Access Token Refreshed Successfully"));
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword) throw new ApiError(400, "oldPassword is required");
    assertPassword(newPassword);

    const user = await User.findById(req.user?._id);

    if (!(await user.isPasswordCorrect(oldPassword))) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    let user = req.user;
    if (user.role === "admin") {
        user = await User.findById(user._id).select("-password -refreshToken +loginHistory");
    }
    return res.status(200).json(new ApiResponse(200, user, "current user fetched Successfully"));
});

// fullName এবং/অথবা username বদলানো
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, username } = req.body;
    const update = {};

    if (fullName !== undefined) {
        const name = String(fullName).trim();
        if (!name) throw new ApiError(400, "fullName cannot be empty");
        update.fullName = name;
    }

    if (username !== undefined) {
        const uname = normalizeUsername(username);
        if (!USERNAME_REGEX.test(uname)) {
            throw new ApiError(
                400,
                "Username must be 3-20 chars: lowercase letters, numbers, dot, underscore or dash"
            );
        }
        if (uname !== req.user.username && (await User.exists({ username: uname, _id: { $ne: req.user._id } }))) {
            throw new ApiError(409, "Username already taken");
        }
        update.username = uname;
    }

    if (!Object.keys(update).length) throw new ApiError(400, "Nothing to update");

    let user;
    try {
        user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select(
            "-password -refreshToken"
        );
    } catch (error) {
        if (error.code === 11000) throw new ApiError(409, "Username already taken");
        throw error;
    }

    return res.status(200).json(new ApiResponse(200, user, "Account Details Update Successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const user = await User.findById(req.user?._id);
    const newAvatar = await uploadOnCloudinary(avatarLocalPath);

    if (!newAvatar || !newAvatar.url) {
        throw new ApiError(400, "Error while uploading new avatar");
    }

    if (user.avatar) {
        await deleteFromCloudinary(publicIdFromUrl(user.avatar));
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: newAvatar.secure_url || newAvatar.url } },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

const getUserDashboardStats = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const dashboardData = await User.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(userId) } },
        {
            $lookup: {
                from: "apikeys",
                localField: "_id",
                foreignField: "user",
                as: "apiKeysList"
            }
        },
        {
            $lookup: {
                from: "submissions",
                localField: "_id",
                foreignField: "user",
                as: "allSubmissions"
            }
        },
        {
            $addFields: {
                totalApiKeys: { $size: "$apiKeysList" },
                totalEmailsSent: { $size: "$allSubmissions" }
            }
        },
        {
            $project: {
                fullName: 1,
                email: 1,
                avatar: 1,
                monthlyEmailLimit: 1,
                totalApiKeys: 1,
                totalEmailsSent: 1,
                emailsRemaining: { $subtract: ["$monthlyEmailLimit", "$totalEmailsSent"] },
                apiKeysList: 1,
                allSubmissions: 1
            }
        }
    ]);

    if (!dashboardData?.length) {
        throw new ApiError(404, "User dashboard data not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, dashboardData[0], "User dashboard stats fetched successfully"));
});

export {
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
};
