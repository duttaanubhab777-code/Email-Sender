import mongoose from "mongoose";
import { OTP_PURPOSES } from "../constants.js";

const otpSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    purpose: {
        type: String,
        required: true,
        enum: Object.values(OTP_PURPOSES)
    },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    // register এর pending data (fullName, username, passwordHash, avatar) এখানে থাকে
    payload: { type: mongoose.Schema.Types.Mixed, default: null }
});

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // মেয়াদ শেষ হলে auto delete

export const Otp = mongoose.model("Otp", otpSchema);
