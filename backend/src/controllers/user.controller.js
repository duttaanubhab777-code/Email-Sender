import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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
        throw new ApiError(
            500,
            "Something went wrong while genarating refrsh and access token"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;

    if (
        [fullName, email, username, password].some(
            field => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required ");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    // if avatar required : true then the comment out code is safe

    // const avatarLocalPath = req.files?.avatar[0]?.path;

    /* if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    } */

    let avatarLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.avatar) &&
        req.files.avatar.length > 0
    ) {
        avatarLocalPath = req.files.avatar[0].path;
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    const user = await User.create({
        fullName,
        avatar: avatar?.url || "",
        email,
        password,
        username: username.toLowerCase(),
        ipAddress: req.ip
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );
    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!(email || username)) {
        throw new ApiError(400, "Email or Username required for login");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });
    if (!user) {
        throw new ApiError(404, "User does not exist, please Register first");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid Username or password");
    }

    const { accessToken, refreshToken } = await genarateAccessAndRefreshTokens(
        user._id
    );

    await User.findByIdAndUpdate(user._id, {
        $push: {
            loginHistory: {
                $each: [{ ipAddress: req.ip, loginTime: new Date() }],
                $slice: -20
            }
        }
    });

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                },
                "User logged In successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incommingRefreshToken) {
        throw new ApiError(401, "Unauthorised Request");
    }

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token");
        }

        if (incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true
        };

        const { accessToken, refreshToken } =
            await genarateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: refreshToken },
                    "Access Token Refreshed Successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token");
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user?._id);

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "password changed successfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
    let user = req.user;
    if (user.role === "admin") {
        user = await User.findById(user._id).select("-password -refreshToken +loginHistory");
    }
    return res.status(200).json(new ApiResponse(200, user, "current user fetched Successfully"));
});


const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName } = req.body;

    if (!fullName) {
        throw new ApiError(400, "This field is required ");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName
            }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account Details Update Successfully")
        );
});

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },

        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "avatar uploaded successfully"));
});

import mongoose from "mongoose";
// (বাকি import গুলো তোমার ফাইলে আগে থেকেই আছে)

const getUserDashboardStats = asyncHandler(async (req, res) => {
    // req.user._id আমরা verifyJWT মিডলওয়্যার থেকে পাব
    const userId = req.user._id;

    const dashboardData = await User.aggregate([
        {
            // ১. $match: লগ-ইন করা ইউজারের ডেটা ফিল্টার করা
            $match: {
                _id: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            // ২. $lookup: ইউজারের সমস্ত API Key খুঁজে আনা
            $lookup: {
                from: "apikeys",
                localField: "_id",
                foreignField: "user",
                as: "apiKeysList"
            }
        },
        {
            // ৩. $lookup: ইউজারের পাঠানো সমস্ত ইমেইলের হিস্ট্রি (Submissions) আনা
            $lookup: {
                from: "submissions",
                localField: "_id",
                foreignField: "user",
                as: "allSubmissions"
            }
        },
        {
            // ৪. $addFields: অ্যারের সাইজ মেপে মোট সংখ্যা (Count) বের করা
            $addFields: {
                totalApiKeys: {
                    $size: "$apiKeysList"
                },
                totalEmailsSent: {
                    $size: "$allSubmissions"
                }
            }
        },
        {
            // ৫. $project: ফ্রন্টএন্ডে শুধু দরকারি ডেটা পাঠানো
            $project: {
                fullName: 1,
                email: 1,
                avatar: 1,
                totalApiKeys: 1,
                totalEmailsSent: 1,
                apiKeysList: 1 // API Key এর লিস্ট ড্যাশবোর্ডে দেখানোর জন্য পাঠানো হলো
                // খেয়াল করো: allSubmissions এখানে দিইনি, তাই বিশাল ডেটা ফ্রন্টএন্ডে গিয়ে সার্ভার স্লো করবে না!
            }
        }
    ]);

    // যদি কোনো কারণে ইউজারের ডেটা না পাওয়া যায়
    if (!dashboardData?.length) {
        throw new ApiError(404, "User dashboard data not found");
    }

    // aggregate সব সময় একটি অ্যারে রিটার্ন করে, তাই dashboardData[0] পাঠানো হলো
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                dashboardData[0],
                "User dashboard stats fetched successfully"
            )
        );
});



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
  getUserDashboardStats
};
