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
        body: { type: String, default: "", trim: true, maxlength: 600 },
        // frontend এর কোন পেজে নিয়ে যাবে (যেমন /approvals)
        link: { type: String, default: "", trim: true, maxlength: 200 },
        readAt: { type: Date, default: null },

        // ---- Admin এর পাঠানো গুরুত্বপূর্ণ নোটিশ (শুধু এগুলোতেই পপআপ আসে) ----
        // alert = true হলে ইউজার পপআপে "OK" না চাপা পর্যন্ত (ackAt) এটা আবার আবার দেখানো হবে
        alert: { type: Boolean, default: false },
        ackAt: { type: Date, default: null },
        announcement: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Announcement",
            default: null
        },
        senderName: { type: String, default: "", trim: true, maxlength: 120 }
    },
    { timestamps: true }
);

// unread সংখ্যা + লিস্ট দ্রুত পড়ার জন্য
notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });
// পপআপ দেখানোর বাকি (OK না চাপা) নোটিশ খুঁজতে + announcement এর "কতজন দেখল" গুনতে
notificationSchema.index({ recipient: 1, alert: 1, ackAt: 1 });
notificationSchema.index({ announcement: 1, ackAt: 1 }, { sparse: true });
// ৬০ দিন পর নিজে নিজেই মুছে যাবে (ডাটাবেজ ভরে যাবে না)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export const Notification = mongoose.model("Notification", notificationSchema);
