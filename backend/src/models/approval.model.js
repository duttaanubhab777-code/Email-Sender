import mongoose from "mongoose";
import { EXTRA_ACTIONS } from "../constants.js";

const approvalSchema = new mongoose.Schema(
    {
        action: { type: String, enum: EXTRA_ACTIONS, required: true },
        // কিসের উপর কাজ: email / user id / kill targets
        target: { type: String, required: true },
        reason: { type: String, trim: true, default: "" },
        requestedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        status: {
            type: String,
            enum: ["pending", "approved", "denied", "used"],
            default: "pending",
            index: true
        },
        decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        decidedAt: { type: Date },
        note: { type: String, default: "" },
        usedAt: { type: Date },
        expiresAt: { type: Date, required: true }
    },
    { timestamps: true }
);

export const Approval = mongoose.model("Approval", approvalSchema);
