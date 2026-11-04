import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        password: {
            type: String,
            required: true
        },

        avatar: {
            type: String //cloudnary URL
        },

        ipAddress: {
            type: String,
            default: null
        },
        loginHistory: {
            type: [
                {
                    ipAddress: { type: String },
                    loginTime: { type: Date, default: Date.now }
                }
            ],
            select: false
        },
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
            index: true
        },
        isSuperAdmin: {
            type: Boolean,
            default: false
        },
        isBlocked: {
            type: Boolean,
            default: false
        },

        apiKey: {
            type: String,

            unique: true,
            sparse: true // if apikey then not check the unique
        },
        monthlyEmailLimit: {
            type: Number,
            default: 500
        },

        // পুরনো (single-session) field — শুধু আগে লগইন করা ইউজারদের জন্য রাখা, নতুন কোড এটা আর লেখে না
        refreshToken: {
            type: String
        },

        // প্রতিটা device/browser এর আলাদা session — এক জায়গায় login করলে অন্য জায়গা logout হয় না।
        // token নিজে নয়, তার SHA-256 hash রাখা হয় (DB leak হলেও token চুরি যায় না)
        refreshSessions: {
            type: [
                {
                    _id: false,
                    sid: { type: String, required: true },
                    hash: { type: String, required: true },
                    prevHash: String, // rotate এর ঠিক আগের token — response হারালে এটা দিয়ে ঢোকা যায়
                    rotatedAt: Date,
                    expiresAt: { type: Date, required: true },
                    createdAt: { type: Date, default: Date.now }
                }
            ],
            default: [],
            select: false
        }
    },
    { timestamps: true }
);

userSchema.pre("save", async function () {
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();

    if (this.isNew && superAdminEmail && this.email === superAdminEmail) {
        this.role = "admin";
        this.isSuperAdmin = true;
    }

    // OTP দিয়ে register হলে password আগেই hash করা থাকে, তাই আবার hash করা হবে না
    if (!this.isModified("password") || this.$locals.skipHash) return;

    this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.genarateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

userSchema.methods.genarateRefreshToken = function (sid) {
    return jwt.sign(
        {
            _id: this._id,
            sid, // কোন device এর session
            n: crypto.randomBytes(8).toString("hex") // একই সেকেন্ডে বানালেও token আলাদা হবে
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};

userSchema.plugin(mongooseAggregatePaginate);

export const User = mongoose.model("User", userSchema);
