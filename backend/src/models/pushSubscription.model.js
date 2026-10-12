import mongoose from "mongoose";

// একজন ইউজারের প্রতিটা ডিভাইস/ব্রাউজারের push subscription (একজনের একাধিক ডিভাইস থাকতে পারে)
const pushSubscriptionSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        // push service এর ঠিকানা — প্রতিটা ডিভাইসে আলাদা, তাই unique
        endpoint: { type: String, required: true, unique: true, maxlength: 1000 },
        keys: {
            p256dh: { type: String, required: true, maxlength: 200 },
            auth: { type: String, required: true, maxlength: 100 }
        },
        userAgent: { type: String, default: "", maxlength: 300 }
    },
    { timestamps: true }
);

// অ্যাপ খুললেই updatedAt নতুন হয়। ৯০ দিন কেউ না খুললে পুরনো ডিভাইস নিজে নিজেই মুছে যাবে
pushSubscriptionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);
