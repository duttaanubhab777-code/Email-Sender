import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    apiKey: {
        type: String,
        required: true
    },
    senderName: {
        type: String,
        required: true
    },
    senderEmail: {
        type: String,
        lowecase : true,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        default: null
    }
}, { timestamps: true });

export const Submission = mongoose.model('Submission', submissionSchema);