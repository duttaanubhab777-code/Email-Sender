import { ApiError } from "../utils/ApiError.js";
import { escapeHtml, sendMail } from "./mailer.service.js";

const oneLine = v => String(v ?? "").replace(/[\r\n]+/g, " ").trim();

// ফর্ম পূরণকারী যা-ই লিখুক, ইমেইলে HTML হিসেবে চলবে না (সব escape করা হয়)
const sendEmailService = async options => {
    const e = {
        senderName: escapeHtml(options.senderName),
        senderEmail: escapeHtml(options.senderEmail),
        subject: escapeHtml(options.subject),
        message: escapeHtml(options.message),
        ipAddress: escapeHtml(options.ipAddress),
        sourceUrl: escapeHtml(options.sourceUrl || "")
    };

    // কোন পেজ থেকে ফর্ম ভরা হয়েছে — পুরনো মেসেজে না থাকলে "Not recorded"
    const sourceCell = e.sourceUrl
        ? `<a href="${e.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #fbbf24; text-decoration: none; font-weight: 500; word-break: break-all;">${e.sourceUrl}</a>`
        : `<span style="color: #71717a;">Not recorded</span>`;

    const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                </head>
                <body style="margin: 0; padding: 0; background-color: #09090b; font-family: 'Inter', Helvetica, Arial, sans-serif;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090b; padding: 40px 0;">
                        <tr>
                            <td align="center">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background: #18181b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); border: 1px solid #27272a;">
                                    
                                    <!-- Vibrant Gradient Top Banner -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #ff007f 0%, #7928ca 50%, #4338ca 100%); padding: 40px 30px; text-align: center;">
                                            <div style="background: rgba(255, 255, 255, 0.2); width: 56px; height: 56px; border-radius: 50%; display: inline-block; line-height: 56px; margin-bottom: 20px; box-shadow: 0 8px 16px rgba(0,0,0,0.1);">
                                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                            </div>
                                            <h1 style="color: #ffffff; font-size: 26px; font-weight: 700; margin: 0; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">New Website Inquiry</h1>
                                            <p style="color: rgba(255,255,255,0.85); font-size: 15px; margin: 10px 0 0 0;">You've got a fresh message waiting for you.</p>
                                        </td>
                                    </tr>

                                    <!-- Information Grid -->
                                    <tr>
                                        <td style="padding: 35px 30px;">
                                            <!-- Inner box slight gradient -->
                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(145deg, #27272a, #18181b); border-radius: 12px; padding: 20px; border: 1px solid #3f3f46; margin-bottom: 25px;">
                                                <tr>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #a1a1aa; font-size: 13px; font-weight: 600; width: 30%;">SENDER</td>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #f8fafc; font-size: 14px; font-weight: 600;">${e.senderName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #a1a1aa; font-size: 13px; font-weight: 600;">EMAIL</td>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px;"><a href="mailto:${e.senderEmail}" style="color: #c084fc; text-decoration: none; font-weight: 500;">${e.senderEmail}</a></td>
                                                </tr>
                                                
                                                <!-- NEW SUBJECT FIELD -->
                                                <tr>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #a1a1aa; font-size: 13px; font-weight: 600;">SUBJECT</td>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #38bdf8; font-size: 14px; font-weight: 600;">${e.subject}</td>
                                                </tr>

                                                <!-- FORM SOURCE PAGE (full link, includes localhost port) -->
                                                <tr>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #a1a1aa; font-size: 13px; font-weight: 600; vertical-align: top;">SOURCE PAGE</td>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 13px; line-height: 1.5;">${sourceCell}</td>
                                                </tr>

                                                <tr>
                                                    <td style="padding: 12px 15px; color: #a1a1aa; font-size: 13px; font-weight: 600;">IP ADDRESS</td>
                                                    <td style="padding: 12px 15px; color: #34d399; font-size: 13px; font-family: monospace; font-weight: 600;">${e.ipAddress}</td>
                                                </tr>
                                            </table>

                                            <!-- Message Box with Gradient Left Border Trick -->
                                            <div style="background: linear-gradient(180deg, #ff007f, #7928ca, #4338ca); padding-left: 4px; border-radius: 10px;">
                                                <div style="background-color: #18181b; padding: 25px; border-radius: 0 8px 8px 0; border: 1px solid #3f3f46; border-left: none;">
                                                    <p style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #c084fc; font-weight: 700;">Message Content</p>
                                                    <p style="margin: 0; font-size: 15px; color: #e4e4e7; line-height: 1.6; white-space: pre-wrap;">${e.message}</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Super Cool Gradient Separator Line -->
                                    <tr>
                                        <td style="height: 4px; background: linear-gradient(90deg, #ff007f, #7928ca, #4338ca);"></td>
                                    </tr>

                                    <!-- Footer Branding -->
                                    <tr>
                                        <td style="background-color: #09090b; padding: 25px 30px; text-align: center;">
                                            <p style="margin: 0 0 6px 0; font-size: 14px; color: #a1a1aa; font-weight: 500;">
                                                ⚡ Powered by <span style="color: #ffffff; font-weight: 700; letter-spacing: 0.5px;">Email Sender</span>
                                            </p>
                                            <p style="margin: 0; font-size: 12px; color: #71717a;">
                                                Designed & Developed with ❤️ by <strong style="color: #e4e4e7;">Anubhab Dutta</strong>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;

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
