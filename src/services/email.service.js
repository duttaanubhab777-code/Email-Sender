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
            text: options.message,                                       
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error) {
        console.error("Email Service Error:", error);
        throw new ApiError(500, "Failed to send email via SMTP service");
    }
};

export { sendEmailService };