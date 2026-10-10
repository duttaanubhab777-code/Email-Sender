import mongoose from "mongoose";

// Kill switch এর ধাপে ধাপে confirm এর অবস্থা এখানে থাকে
const killSessionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targets: { type: [String], required: true },
    step: {
        type: String,
        enum: ["confirm1", "otp", "confirm2"],
        default: "confirm1"
    },
    authorizedBy: { type: String, enum: ["super", "approval"], required: true },
    killPasswordFails: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true }
});

killSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const KillSession = mongoose.model("KillSession", killSessionSchema);
