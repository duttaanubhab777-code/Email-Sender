import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new ApiError(401, "Unauthorised request");
        }
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }
});

export const verifyAdmin = asyncHandler(async (req, res, next) => {
    // 1. verifyJWT মিডলওয়্যারটি আগেই req.user সেট করে দেবে, তাই আমরা চেক করছি সেটা আছে কিনা
    if (!req.user) {
        throw new ApiError(401, "Unauthorized request");
    }

    // 2. ইউজারের রোল চেক করা হচ্ছে
    if (req.user.role !== "admin") {
        // রোল যদি admin না হয়, তাহলে 403 Forbidden এরর দেবে
        throw new ApiError(403, "Access denied! Only admins can perform this action.");
    }

    // 3. রোল যদি admin হয়, তাহলে next() কল করে পরের ধাপে (controller) যেতে দেবে
    next();
});