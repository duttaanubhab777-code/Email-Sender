import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export { registerUser };
