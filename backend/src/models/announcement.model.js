import mongoose from "mongoose";

export const AUDIENCES = Object.freeze(["users", "everyone", "admins", "user"]);

// Admin এর পাঠানো গুরুত্বপূর্ণ নোটিশের রেকর্ড (কে পাঠাল, কাদের, কতজন পেল ও দেখল)
const announcementSchema = new mongoose.Schema(
    {
        sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        senderName: { type: String, default: "", trim: true, maxlength: 120 },
        title: { type: String, required: true, trim: true, maxlength: 80 },
        message: { type: String, required: true, trim: true, maxlength: 500 },
        audience: { type: String, enum: AUDIENCES, required: true },
        // audience "user" হলে সেই ইউজারের email
        targetEmail: { type: String, default: "", lowercase: true, trim: true },
        recipientCount: { type: Number, default: 0 },
        pushSent: { type: Number, default: 0 } // কতজনের ফোনের notification bar এ পৌঁছেছে
    },
    { timestamps: true }
);

announcementSchema.index({ createdAt: -1 });

export const Announcement = mongoose.model("Announcement", announcementSchema);
