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

        status: {
            type: String,
            enum: ["sent", "failed"],
            default: "sent"
        }
    },
    { timestamps: true }
);

submissionSchema.plugin(mongooseAggregatePaginate);

export const Submission = mongoose.model("Submission", submissionSchema);
