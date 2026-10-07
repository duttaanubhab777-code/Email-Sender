import nodemailer from "nodemailer";
import { ApiError } from "../utils/ApiError.js";

const sendEmailService = async options => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_PORT == 465,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

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
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #f8fafc; font-size: 14px; font-weight: 600;">${options.senderName}</td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #a1a1aa; font-size: 13px; font-weight: 600;">EMAIL</td>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 14px;"><a href="mailto:${options.senderEmail}" style="color: #c084fc; text-decoration: none; font-weight: 500;">${options.senderEmail}</a></td>
                                                </tr>
                                                
                                                <!-- NEW SUBJECT FIELD -->
                                                <tr>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #a1a1aa; font-size: 13px; font-weight: 600;">SUBJECT</td>
                                                    <td style="padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #38bdf8; font-size: 14px; font-weight: 600;">${options.subject}</td>
                                                </tr>

                                                <tr>
                                                    <td style="padding: 12px 15px; color: #a1a1aa; font-size: 13px; font-weight: 600;">IP ADDRESS</td>
                                                    <td style="padding: 12px 15px; color: #34d399; font-size: 13px; font-family: monospace; font-weight: 600;">${options.ipAddress}</td>
                                                </tr>
                                            </table>

                                            <!-- Message Box with Gradient Left Border Trick -->
                                            <div style="background: linear-gradient(180deg, #ff007f, #7928ca, #4338ca); padding-left: 4px; border-radius: 10px;">
                                                <div style="background-color: #18181b; padding: 25px; border-radius: 0 8px 8px 0; border: 1px solid #3f3f46; border-left: none;">
                                                    <p style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #c084fc; font-weight: 700;">Message Content</p>
                                                    <p style="margin: 0; font-size: 15px; color: #e4e4e7; line-height: 1.6; white-space: pre-wrap;">${options.message}</p>
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
