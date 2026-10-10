import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { normEmail, isEmail } from "../utils/validators.js";
import { User } from "../models/user.model.js";
import { Approval } from "../models/approval.model.js";
import { normalizeTargets } from "../services/killSwitch.service.js";
import { sendNotificationEmail } from "../services/mailer.service.js";
import {
    EXTRA_ACTIONS,
    APPROVAL_PENDING_HOURS,
    APPROVAL_VALID_MINUTES
} from "../constants.js";

// action অনুযায়ী target ঠিক করা (approval আর আসল কাজের target হুবহু মিলতে হবে)
const resolveTarget = (action, body) => {
    if (action === "kill_switch") return normalizeTargets(body.targets).join(",");

    if (action === "create_admin" || action === "make_admin") {
        const email = normEmail(body.target);
        if (!isEmail(email)) throw new ApiError(400, "target must be a valid email");
        return email;
    }

    if (!mongoose.isValidObjectId(body.target)) {
        throw new ApiError(400, "target must be a valid user id");
    }
    return String(body.target);
};

const notifySafely = async (to, subject, heading, lines) => {
    try {
        await sendNotificationEmail({ to, subject, heading, lines });
    } catch {
        /* notification ব্যর্থ হলেও মূল কাজ চলবে */
    }
};

// Admin: Super Admin এর কাছে permission চাওয়া
const requestApproval = asyncHandler(async (req, res) => {
    if (req.user.isSuperAdmin) {
        throw new ApiError(400, "Super Admin doesn't need approval");
    }

    const { action, reason } = req.body;
    if (!EXTRA_ACTIONS.includes(action)) {
        throw new ApiError(400, `action must be one of: ${EXTRA_ACTIONS.join(", ")}`);
    }
    const target = resolveTarget(action, req.body);

    const duplicate = await Approval.findOne({
        requestedBy: req.user._id,
        action,
        target,
        status: { $in: ["pending", "approved"] },
        expiresAt: { $gt: new Date() }
    });
    if (duplicate) {
        throw new ApiError(409, "You already have an open request for this action", [
            { approvalId: duplicate._id, status: duplicate.status }
        ]);
    }

    const approval = await Approval.create({
        action,
        target,
        reason: String(reason ?? "").trim().slice(0, 300),
        requestedBy: req.user._id,
        expiresAt: new Date(Date.now() + APPROVAL_PENDING_HOURS * 60 * 60 * 1000)
    });

    const supers = await User.find({ isSuperAdmin: true }).select("email");
    await Promise.all(
        supers.map(s =>
            notifySafely(s.email, "Permission request", "Admin permission request", [
                `${req.user.fullName} (${req.user.email}) wants to do: ${action}`,
                `Target: ${target}`,
                `Reason: ${approval.reason || "-"}`,
                "Open the admin panel to approve or deny."
            ])
        )
    );

    return res
        .status(201)
        .json(new ApiResponse(201, approval, "Request sent to the Super Admin"));
});

// Super Admin সব দেখবে, Admin শুধু নিজের
const listApprovals = asyncHandler(async (req, res) => {
    const filter = req.user.isSuperAdmin ? {} : { requestedBy: req.user._id };
    if (req.query.status) filter.status = String(req.query.status);

    const items = await Approval.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("requestedBy", "fullName email username")
        .populate("decidedBy", "fullName email");

    const data = items.map(a => ({
        ...a.toObject(),
        expired: ["pending", "approved"].includes(a.status) && a.expiresAt < new Date()
    }));

    return res.status(200).json(new ApiResponse(200, data, "Approvals fetched"));
});

const loadPending = async id => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, "Invalid approval id");
    const approval = await Approval.findById(id).populate("requestedBy", "email fullName");
    if (!approval) throw new ApiError(404, "Approval request not found");
    if (approval.status !== "pending") {
        throw new ApiError(409, `Request is already ${approval.status}`);
    }
    if (approval.expiresAt < new Date()) throw new ApiError(410, "Request expired");
    return approval;
};

// Super Admin: password দিয়ে approve
const approveApproval = asyncHandler(async (req, res) => {
    const { password } = req.body;
    if (!password) throw new ApiError(400, "Your password is required to approve");

    const me = await User.findById(req.user._id);
    if (!(await me.isPasswordCorrect(password))) {
        throw new ApiError(401, "Incorrect password");
    }

    const approval = await loadPending(req.params.id);
    approval.status = "approved";
    approval.decidedBy = req.user._id;
    approval.decidedAt = new Date();
    approval.expiresAt = new Date(Date.now() + APPROVAL_VALID_MINUTES * 60 * 1000);
    await approval.save();

    await notifySafely(
        approval.requestedBy.email,
        "Permission approved",
        "Request approved",
        [
            `Your request (${approval.action}) was approved.`,
            `You can use it once in the next ${APPROVAL_VALID_MINUTES} minutes.`
        ]
    );

    return res
        .status(200)
        .json(new ApiResponse(200, approval, `Approved. Valid for ${APPROVAL_VALID_MINUTES} minutes, one use`));
});

const denyApproval = asyncHandler(async (req, res) => {
    const approval = await loadPending(req.params.id);
    approval.status = "denied";
    approval.decidedBy = req.user._id;
    approval.decidedAt = new Date();
    approval.note = String(req.body.note ?? "").trim().slice(0, 300);
    await approval.save();

    await notifySafely(
        approval.requestedBy.email,
        "Permission denied",
        "Request denied",
        [`Your request (${approval.action}) was denied.`, approval.note].filter(Boolean)
    );

    return res.status(200).json(new ApiResponse(200, approval, "Request denied"));
});

export { requestApproval, listApprovals, approveApproval, denyApproval };
