import mongoose from "mongoose";

// OTP আর notification ইমেইলের "outbox"।
// ইমেইল আগে এখানে pending হিসেবে সেভ হয়, তারপর পাঠানো হয়। পৌঁছে গেলে document মুছে যায়
// (OTP কোড যেন DB তে পড়ে না থাকে)। expiresAt পার হলে MongoDB নিজেই মুছে দেয় (TTL index)।
const mailJobSchema = new mongoose.Schema(
    {
        kind: { type: String, enum: ["otp", "notify"], required: true },
        to: { type: String, required: true },
        subject: { type: String, required: true },
        html: { type: String, required: true },
        fromName: { type: String, default: "" },
        replyTo: { type: String, default: "" },

        status: {
            type: String,
            enum: ["pending", "sending", "failed"],
            default: "pending"
        },
        attempts: { type: Number, default: 0 },
        nextAttemptAt: { type: Date, default: Date.now },
        lockedAt: { type: Date, default: null },
        lastError: { type: String, default: null },

        // এর পরে আর পাঠানোর মানে নেই (OTP মেয়াদ শেষ) — তখন MongoDB নিজে মুছে ফেলে
        expiresAt: { type: Date, required: true }
    },
    { timestamps: true }
);

mailJobSchema.index({ status: 1, nextAttemptAt: 1 });
mailJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MailJob = mongoose.model("MailJob", mailJobSchema);
