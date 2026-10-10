import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorised request");
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token");
    }

    const user = await User.findById(decodedToken?._id).select(
        "-password -refreshToken"
    );

    if (!user) {
        throw new ApiError(401, "Invalid Access Token");
    }

    // block করা ইউজারের পুরনো token দিয়েও আর ঢোকা যাবে না
    if (user.isBlocked) {
        throw new ApiError(403, "Your account has been blocked");
    }

    req.user = user;
    next();
});

export const verifyAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        throw new ApiError(401, "Unauthorized request");
    }

    if (req.user.role !== "admin") {
        throw new ApiError(403, "Access denied! Only admins can perform this action.");
    }

    next();
});

export const verifySuperAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user?.isSuperAdmin) {
        throw new ApiError(403, "Access denied! Only the Super Admin can perform this action.");
    }

    next();
});
