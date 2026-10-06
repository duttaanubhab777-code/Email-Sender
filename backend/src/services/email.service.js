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

            const mailOptions = {
        from: `"${options.senderName}" <${process.env.SMTP_USER}>`,
        to: options.toEmail,
        subject: options.subject,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
                <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">Email Transaction Details</h2>
                
                <p><strong>👤 Sender Name:</strong> ${options.senderName}</p>
                <p><strong>🎯 Receiver Email:</strong> ${options.toEmail}</p>
                <p><strong>🌐 IP Address:</strong> ${options.ipAddress || "N/A"}</p>
                
                <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-left: 4px solid #3498db;">
                    <h4 style="margin-top: 0; color: #555;">Message Content:</h4>
                    <p style="font-size: 16px; color: #333; line-height: 1.5;">${options.message}</p>
                </div>
            </div>
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