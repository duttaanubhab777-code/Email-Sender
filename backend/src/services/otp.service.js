import crypto from "crypto";
import { Otp } from "../models/otp.model.js";
import { ApiError } from "../utils/ApiError.js";
import { sendOtpEmail } from "./mailer.service.js";
import {
    OTP_EXPIRY_MINUTES,
    OTP_RESEND_COOLDOWN_SECONDS,
    OTP_MAX_ATTEMPTS
} from "../constants.js";

const secret = () => process.env.OTP_SECRET || process.env.ACCESS_TOKEN_SECRET;

const hashCode = (email, purpose, code) =>
    crypto
        .createHmac("sha256", secret())
        .update(`${email}:${purpose}:${code}`)
        .digest("hex");

const cooldownLeft = doc =>
    Math.max(
        0,
        Math.ceil(
            (doc.lastSentAt.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000
        )
    );

// ৩০ সেকেন্ড পার না হলে নতুন OTP পাঠানো যাবে না
export const assertCanSend = async (email, purpose) => {
    const existing = await Otp.findOne({ email, purpose });
    const wait = existing ? cooldownLeft(existing) : 0;
    if (wait > 0) {
        throw new ApiError(429, `Please wait ${wait}s before requesting another code`, [
            { retryAfter: wait }
        ]);
    }
    return existing;
};

// OTP বানিয়ে DB তে (hash করে) রাখে এবং email এ পাঠায়
export const createAndSendOtp = async ({
    email,
    purpose,
    payload,
    expiryMinutes = OTP_EXPIRY_MINUTES
}) => {
    const existing = await assertCanSend(email, purpose);
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");

    await Otp.findOneAndUpdate(
        { email, purpose },
        {
            $set: {
                codeHash: hashCode(email, purpose, code),
                attempts: 0,
                lastSentAt: new Date(),
                expiresAt: new Date(Date.now() + expiryMinutes * 60 * 1000),
                payload: payload ?? existing?.payload ?? null
            }
        },
        { upsert: true }
    );

    try {
        await sendOtpEmail({ to: email, code, purpose, minutes: expiryMinutes });
    } catch (error) {
        await Otp.deleteOne({ email, purpose });
        throw error;
    }
};

// Resend: আগে থেকে pending OTP না থাকলে null ফেরত দেয়
export const resendOtp = async ({ email, purpose, expiryMinutes }) => {
    const existing = await Otp.findOne({ email, purpose });
    if (!existing || existing.expiresAt < new Date()) return null;
    await createAndSendOtp({ email, purpose, expiryMinutes });
    return true;
};

// সঠিক হলে OTP একবারেই শেষ (single use) এবং document ফেরত দেয়
export const verifyOtp = async ({ email, purpose, code }) => {
    const doc = await Otp.findOne({ email, purpose });

    if (!doc || doc.expiresAt < new Date()) {
        if (doc) await Otp.deleteOne({ _id: doc._id });
        throw new ApiError(400, "Code expired or not requested. Please request a new one");
    }

    if (doc.attempts >= OTP_MAX_ATTEMPTS) {
        await Otp.deleteOne({ _id: doc._id });
        throw new ApiError(429, "Too many wrong attempts. Please request a new code");
    }

    const expected = Buffer.from(doc.codeHash);
    const given = Buffer.from(hashCode(email, purpose, String(code ?? "").trim()));
    const ok = expected.length === given.length && crypto.timingSafeEqual(expected, given);

    if (!ok) {
        await Otp.updateOne({ _id: doc._id }, { $inc: { attempts: 1 } });
        const left = OTP_MAX_ATTEMPTS - (doc.attempts + 1);
        throw new ApiError(400, `Invalid code. ${left} attempt(s) left`);
    }

    // atomic delete: একই code দিয়ে দুইবার verify হওয়া আটকায়
    const consumed = await Otp.findOneAndDelete({ _id: doc._id });
    if (!consumed) throw new ApiError(400, "Invalid or already used code");
    return consumed;
};
