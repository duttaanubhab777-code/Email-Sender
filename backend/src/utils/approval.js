import mongoose from "mongoose";
import { Approval } from "../models/approval.model.js";
import { ApiError } from "./ApiError.js";

// Super Admin হলে সরাসরি পাস। Admin হলে Super Admin এর approved (এবং একবার ব্যবহারযোগ্য)
// approval লাগবে — action আর target হুবহু মিলতে হবে।
export const authorizeExtra = async (req, action, target) => {
    if (req.user.isSuperAdmin) return { by: "super" };

    const approvalId = req.header("x-approval-id") || req.body?.approvalId;

    if (!approvalId || !mongoose.isValidObjectId(approvalId)) {
        throw new ApiError(
            403,
            "This action needs Super Admin permission. Request it with POST /api/v1/approvals, then retry with the approved 'approvalId'."
        );
    }

    const approval = await Approval.findOneAndUpdate(
        {
            _id: approvalId,
            requestedBy: req.user._id,
            action,
            target: String(target),
            status: "approved",
            expiresAt: { $gt: new Date() }
        },
        { $set: { status: "used", usedAt: new Date() } },
        { new: true }
    );

    if (!approval) {
        throw new ApiError(
            403,
            "Approval is invalid, expired, already used, or doesn't match this action/target"
        );
    }

    return { by: "approval", approval };
};
