import mongoose from "mongoose";

// প্রতিটা notification একজন recipient এর। readAt না থাকলে সেটা "unread"।
const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        type: { type: String, required: true, trim: true },
        title: { type: String, required: true, trim: true, maxlength: 140 },
        body: { type: String, default: "", trim: true, maxlength: 280 },
        // frontend এর কোন পেজে নিয়ে যাবে (যেমন /approvals)
        link: { type: String, default: "", trim: true, maxlength: 200 },
        readAt: { type: Date, default: null }
    },
    { timestamps: true }
);

// unread সংখ্যা + লিস্ট দ্রুত পড়ার জন্য
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
// ৬০ দিন পর নিজে নিজেই মুছে যাবে (ডাটাবেজ ভরে যাবে না)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export const Notification = mongoose.model("Notification", notificationSchema);
