import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Submission } from "../models/submission.model.js";
import { ApiKey } from "../models/ApiKey.model.js";
import { User } from "../models/user.model.js";
import { sendEmailService } from "../services/email.service.js";

const safeRedirect = req => {
    try {
        const target = new URL(req.body.redirect);
        const from = new URL(req.get("origin") || req.get("referer"));
        return target.origin === from.origin ? target.href : null;
    } catch {
        return null;
    }
};

const sendEmail = asyncHandler(async (req, res) => {
    // ১. ফর্ম থেকে ভিজিটরের ডেটা রিসিভ করা (এখানে আর toEmail লাগবে না)
    if (req.body.botcheck) {
        return res.status(200).json(new ApiResponse(200, {}, "OK"));
    }
    const senderName = req.body.senderName || req.body.name;
    const senderEmail = req.body.senderEmail || req.body.email;
    const { subject, message } = req.body;

    if (!senderName || !senderEmail || !subject || !message) {
        throw new ApiError(
            400,
            "senderName, senderEmail, subject, and message are required fields"
        );
    }

    // ২. মিডলওয়্যার থেকে পাওয়া API Key-এর তথ্য
    const apiKeyDoc = req.apiKey;

    // ৩. API Key-এর মালিকের (Owner) ইমেইল বের করা
    const ownerUser = await User.findById(apiKeyDoc.user);
    if (!ownerUser) {
        throw new ApiError(404, "API Key owner not found");
    }

    // ৪. ভিজিটরের IP Address বের করা
    const clientIp =
        req.headers["x-forwarded-for"] || req.socket.remoteAddress || "N/A";

    // ৫. সার্ভিস লেয়ারে ডেটা পাঠানো
    await sendEmailService({
        senderName: senderName,
        senderEmail: senderEmail,
        toEmail: ownerUser.email, // প্রাপক হলো API Key-এর মালিক
        subject: subject,
        message: message,
        ipAddress: clientIp // IP Address পাঠানো হলো
    });

    let emailStatus = "sent";

    // ৬. ডেটাবেসে লগ সেভ করা
    const submissionLog = await Submission.create({
        user: ownerUser._id,
        apiKey: apiKeyDoc._id,
        senderName: senderName,
        senderEmail: senderEmail,
        receiverEmail: ownerUser.email,
        subject: subject,
        message: message,
        ipAddress: clientIp,
        status: emailStatus
    });

    if (!submissionLog) {
        throw new ApiError(500, "Failed to log the email submission");
    }

    // ৭. API Key-এর ইউসেজ কাউন্ট বাড়ানো
    apiKeyDoc.usageCount += 1;
    await apiKeyDoc.save({ validateBeforeSave: false });

    const redirectTo = safeRedirect(req);
    if (redirectTo) return res.redirect(303, redirectTo);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                submissionLog,
                "Email processed and logged successfully"
            )
        );
});

export { sendEmail };
