import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Submission } from "../models/submission.model.js";
import { ApiKey } from "../models/ApiKey.model.js";
import { sendEmailService } from "../services/email.service.js";

const sendEmail = asyncHandler(async (req, res) => {
    // ১. অন্য ডেভেলপারের ফ্রন্টএন্ড থেকে ইমেইলের ডেটাগুলো নেওয়া
    const { toEmail, subject, message } = req.body;

    if (!toEmail || !subject || !message) {
        throw new ApiError(400, "toEmail, subject, and message are required fields");
    }

    // আমাদের verifyApiKey পাহারাদার আগেই এই ডেটাগুলো req-এর মধ্যে রেখে দিয়েছে!
    const apiKeyDoc = req.apiKey; 
    const user = req.user;

    // ২. আসল ইমেইল পাঠানোর সার্ভিস কল করা
    await sendEmailService({
        senderName: user.fullName,
        toEmail: toEmail,
        subject: subject,
        message: message
    });
    // আপাতত আমরা ধরে নিচ্ছি ইমেইল সফলভাবে পাঠানো হয়েছে। 
    // (Nodemailer-এর কনফিগারেশন আমরা এর পরের ধাপে অ্যাড করব)
    let emailStatus = "sent"; 

    // ৩. ইউজারের ড্যাশবোর্ডে দেখানোর জন্য হিস্ট্রি বা লগ সেভ করা
    const submissionLog = await Submission.create({
        user: user._id,
        apiKey: apiKeyDoc._id,
        senderName: user.fullName, // যিনি API Key বানিয়েছেন তার নাম
        senderEmail: user.email,
        receiverEmail: toEmail,
        subject: subject,
        message: message,
        ipAddress: req.ip || req.connection.remoteAddress, // রিকোয়েস্টের IP Address ট্র্যাক করা
        status: emailStatus
    });

    if (!submissionLog) {
        throw new ApiError(500, "Failed to log the email submission");
    }

    // ৪. API Key-এর ইউসেজ কাউন্ট ১ বাড়িয়ে দেওয়া
    apiKeyDoc.usageCount += 1;
    await apiKeyDoc.save({ validateBeforeSave: false }); // pre-save হুক যেন আবার নতুন Key জেনারেট না করে, তাই validateBeforeSave বন্ধ রাখা হলো

    return res.status(200).json(
        new ApiResponse(200, submissionLog, "Email processed and logged successfully")
    );
});

export { sendEmail };