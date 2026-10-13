import mongoose from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const submissionSchema = new mongoose.Schema(
    {
        // সরাসরি API Key কালেকশনের সাথে লিঙ্ক করা হলো
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        apiKey: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ApiKey",
            required: true
        },
        senderName: {
            type: String,
            required: true
        },
        senderEmail: {
            type: String,
            lowercase: true,
            required: true
        },
        receiverEmail: {
            type: String,
            required: true
        },
        subject: {
            type: String
        },
        message: {
            type: String,
            required: true
        },
        ipAddress: {
            type: String,
            default: null
        },

        // pending = লাইনে আছে / আবার চেষ্টার অপেক্ষায়, sending = এখন পাঠানো হচ্ছে,
        // sent = পৌঁছেছে, failed = সব চেষ্টার পরেও যায়নি (মেসেজ DB তে থেকেই যায়)
        status: {
            type: String,
            enum: ["pending", "sending", "sent", "failed"],
            default: "pending"
        },
        attempts: { type: Number, default: 0 },
        nextAttemptAt: { type: Date, default: Date.now },
        lockedAt: { type: Date, default: null },
        lastError: { type: String, default: null },
        sentAt: { type: Date, default: null },
        // ফর্ম থেকে আসা unique id — একই মেসেজ দুবার এলে (retry) দ্বিতীয়বার ইমেইল যাবে না
        clientRef: { type: String, default: undefined }
    },
    { timestamps: true }
);

submissionSchema.index({ status: 1, nextAttemptAt: 1 });
submissionSchema.index(
    { apiKey: 1, clientRef: 1 },
    { unique: true, partialFilterExpression: { clientRef: { $type: "string" } } }
);

submissionSchema.plugin(mongooseAggregatePaginate);

export const Submission = mongoose.model("Submission", submissionSchema);
