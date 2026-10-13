import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Submission } from "../models/submission.model.js";
import { ApiKey } from "../models/ApiKey.model.js";
import { deliverInBackground } from "../services/mailQueue.service.js";
import { notifyUser, notifyAdmins } from "../services/notification.service.js";

const safeRedirect = req => {
    try {
        const target = new URL(req.body.redirect);
        const from = new URL(req.get("origin") || req.get("referer"));
        return target.origin === from.origin ? target.href : null;
    } catch {
        return null;
    }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = v => (typeof v === "string" ? v.trim() : "");

const sendEmail = asyncHandler(async (req, res) => {
    // bot ধরার hidden field — ভরা থাকলে চুপচাপ OK বলে ফেলে দাও
    if (req.body.botcheck) {
        return res.status(200).json(new ApiResponse(200, {}, "OK"));
    }

    const senderName = str(req.body.senderName || req.body.name);
    const senderEmail = str(req.body.senderEmail || req.body.email);
    const subject = str(req.body.subject);
    const message = str(req.body.message);

    if (!senderName || !senderEmail || !subject || !message) {
        throw new ApiError(
            400,
            "senderName, senderEmail, subject, and message are required fields"
        );
    }
    if (
        senderName.length > 100 ||
        subject.length > 200 ||
        message.length > 5000 ||
        senderEmail.length > 254 ||
        !EMAIL_RE.test(senderEmail)
    ) {
        throw new ApiError(400, "Invalid name, email, subject or message");
    }

    // ফর্ম থেকে আসা unique id: সার্ভার ঘুম থেকে উঠতে দেরি হলে ফর্ম নিজেই আবার পাঠায়,
    // তখন যেন একই মেসেজ দুবার সেভ/ইমেইল না হয়
    const rawRef = req.body.submissionId;
    const clientRef =
        typeof rawRef === "string" && /^[\w-]{8,64}$/.test(rawRef) ? rawRef : undefined;

    const apiKeyDoc = req.apiKey;
    const ownerUser = req.user; // verifyApiKey আগেই populate করেছে (fullName, email)
    if (!ownerUser?.email) throw new ApiError(404, "API Key owner not found");

    const clientIp = req.ip || req.socket.remoteAddress || "N/A";

    const respond = (log, code) => {
        const redirectTo = safeRedirect(req);
        if (redirectTo) return res.redirect(303, redirectTo);
        return res
            .status(code)
            .json(
                new ApiResponse(
                    code,
                    {
                        id: log._id,
                        status: log.status,
                        createdAt: log.createdAt
                    },
                    log.status === "sent"
                        ? "Email processed and logged successfully"
                        : "Message received. Delivery is in progress."
                )
            );
    };

    // ১. আগে ডেটাবেসে সেভ — এরপর ইমেইল সার্ভিস ব্যর্থ হলেও মেসেজ হারাবে না
    let log;
    try {
        log = await Submission.create({
            user: ownerUser._id,
            apiKey: apiKeyDoc._id,
            senderName,
            senderEmail,
            receiverEmail: ownerUser.email,
            subject,
            message,
            ipAddress: clientIp,
            status: "pending",
            clientRef
        });
    } catch (error) {
        if (error?.code === 11000 && clientRef) {
            const dup = await Submission.findOne({ apiKey: apiKeyDoc._id, clientRef }).lean();
            if (dup) return respond(dup, dup.status === "sent" ? 200 : 202);
        }
        throw error;
    }

    // ২. ব্যাকগ্রাউন্ড কাজ (response আটকাবে না): ইমেইল পাঠানো, usage গোনা, notification
    deliverInBackground(log._id);
    ApiKey.updateOne({ _id: apiKeyDoc._id }, { $inc: { usageCount: 1 } }).catch(() => {});

    notifyUser(ownerUser._id, {
        type: "email_received",
        title: `New email from ${senderName}`,
        body: subject,
        link: "/users/dashboard"
    });
    notifyAdmins(
        {
            type: "email_activity",
            title: `${ownerUser.fullName} received a new email`,
            body: `${senderName}: ${subject}`,
            link: "/admin/directory?tab=emails"
        },
        { exclude: [ownerUser._id] }
    );

    // ৩. সাথে সাথে সাড়া — 202 মানে "গ্রহণ করা হয়েছে, ডেলিভারি চলছে"
    return respond(log, 202);
});

export { sendEmail };
