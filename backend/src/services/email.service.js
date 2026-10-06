import nodemailer from "nodemailer";
import { ApiError } from "../utils/ApiError.js";

const sendEmailService = async (options) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT == 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // এখানে options অবজেক্ট থেকে ডেটা নিয়ে ইমেইলের বডি তৈরি করা হয়েছে
        const mailOptions = {
            from: `"${options.senderName}" <${process.env.SMTP_USER}>`,
            to: options.toEmail,
            subject: `🚀 New Lead: ${options.subject}`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                </head>
                <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: 'Inter', Helvetica, Arial, sans-serif;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #0f172a; padding: 40px 0;">
                        <tr>
                            <td align="center">
                                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3); border: 1px solid #334155;">
                                    
                                    <!-- Top Glow Banner -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 35px 30px; text-align: center;">
                                            <div style="background: rgba(255, 255, 255, 0.15); width: 50px; height: 50px; border-radius: 50%; display: inline-block; line-height: 50px; margin-bottom: 15px;">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                            </div>
                                            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.5px;">New Website Inquiry</h1>
                                            <p style="color: #cbd5e1; font-size: 14px; margin: 8px 0 0 0;">You've got a fresh message waiting for you.</p>
                                        </td>
                                    </tr>

                                    <!-- Information Grid -->
                                    <tr>
                                        <td style="padding: 35px 30px;">
                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background: #0f172a; border-radius: 12px; padding: 20px; border: 1px solid #334155; margin-bottom: 25px;">
                                                <tr>
                                                    <td style="padding: 10px 15px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px; font-weight: 600; width: 30%;">SENDER</td>
                                                    <td style="padding: 10px 15px; border-bottom: 1px solid #1e293b; color: #f8fafc; font-size: 14px; font-weight: 600;">${options.senderName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 10px 15px; border-bottom: 1px solid #1e293b; color: #94a3b8; font-size: 13px; font-weight: 600;">EMAIL</td>
                                                    <td style="padding: 10px 15px; border-bottom: 1px solid #1e293b; font-size: 14px;"><a href="mailto:${options.senderEmail}" style="color: #60a5fa; text-decoration: none; font-weight: 500;">${options.senderEmail}</a></td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 10px 15px; color: #94a3b8; font-size: 13px; font-weight: 600;">IP ADDRESS</td>
                                                    <td style="padding: 10px 15px; color: #34d399; font-size: 13px; font-family: monospace; font-weight: 600;">${options.ipAddress}</td>
                                                </tr>
                                            </table>

                                            <!-- Message Box -->
                                            <div style="background-color: #0f172a; border-left: 4px solid #6366f1; padding: 20px; border-radius: 0 10px 10px 0; border-top: 1px solid #334155; border-right: 1px solid #334155; border-bottom: 1px solid #334155;">
                                                <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700;">Message Content</p>
                                                <p style="margin: 0; font-size: 15px; color: #e2e8f0; line-height: 1.6; white-space: pre-wrap;">${options.message}</p>
                                            </div>
                                        </td>
                                    </tr>

                                    <!-- Footer Branding -->
                                    <tr>
                                        <td style="background-color: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
                                            <p style="margin: 0 0 6px 0; font-size: 13px; color: #cbd5e1; font-weight: 500;">
                                                ⚡ Powered by <span style="color: #818cf8; font-weight: 700; letter-spacing: 0.5px;">Email Sender</span>
                                            </p>
                                            <p style="margin: 0; font-size: 12px; color: #64748b;">
                                                Designed & Developed with ❤️ by <strong style="color: #e2e8f0;">Anubhab Dutta</strong>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error("Email Service Error:", error);
        throw new ApiError(500, "Failed to send email via SMTP service");
    }
};

export { sendEmailService };