import { ApiError } from "../utils/ApiError.js";
import { sendMail } from "./mailer.service.js";
import { buildLeadHtml } from "./emailTheme.js";

const oneLine = v => String(v ?? "").replace(/[\r\n]+/g, " ").trim();

// ফর্ম পূরণকারী যা-ই লিখুক, ইমেইলে HTML হিসেবে চলবে না (emailTheme এর ভেতরে সব escape করা হয়)
const sendEmailService = async options => {
    const html = buildLeadHtml({
        senderName: options.senderName,
        senderEmail: options.senderEmail,
        subject: options.subject,
        message: options.message,
        ipAddress: options.ipAddress,
        // কোন পেজ থেকে ফর্ম ভরা হয়েছে — পুরনো মেসেজে না থাকলে "Not recorded"
        sourceUrl: options.sourceUrl || ""
    });

    try {
        await sendMail({
            to: options.toEmail,
            subject: `🚀 New Lead: ${oneLine(options.subject)}`,
            html,
            fromName: options.senderName,
            // মালিক "Reply" চাপলেই সরাসরি ভিজিটরের কাছে যাবে
            replyTo: { email: options.senderEmail, name: oneLine(options.senderName).slice(0, 80) }
        });
    } catch (error) {
        console.error("Email Service Error:", error.message);
        const err = new ApiError(500, "Failed to send email");
        err.cause = error.cause || error.message;
        throw err;
    }
};

export { sendEmailService };
