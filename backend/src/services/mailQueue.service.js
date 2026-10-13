import { Submission } from "../models/submission.model.js";
import { User } from "../models/user.model.js";
import { sendEmailService } from "./email.service.js";

// ---- কিউ কীভাবে কাজ করে ----
// ১. ফর্ম এলে মেসেজ আগে DB তে "pending" হিসেবে সেভ হয় → ভিজিটর সাথে সাথে সাড়া পায়।
// ২. ব্যাকগ্রাউন্ডে সাথে সাথেই পাঠানোর চেষ্টা হয়। ব্যর্থ হলে backoff দিয়ে আবার "pending" এ ফেরে।
// ৩. একটা worker প্রতি ৩০ সেকেন্ডে (এবং server চালু হওয়ার ৫ সেকেন্ড পরে) বাকিগুলো পাঠায়।
// ৪. পাঠানোর সময় "sending" lock থাকে; server মাঝপথে বন্ধ হলে lock ২ মিনিট পরে ছেড়ে দেওয়া হয়।
// সব মিলিয়ে: মেসেজ কখনো হারায় না (at-least-once)।

const MAX_ATTEMPTS = 8;
// n-তম ব্যর্থতার পরে কতক্ষণ অপেক্ষা: 30s, 2m, 10m, 30m, 2h, 6h, 12h
const BACKOFF_MS = [30e3, 120e3, 600e3, 1800e3, 7200e3, 21600e3, 43200e3];
const LOCK_TIMEOUT_MS = 2 * 60 * 1000;
const SWEEP_EVERY_MS = 30 * 1000;
const MAX_PARALLEL = 5;

let active = 0;

const claim = id =>
    Submission.findOneAndUpdate(
        { _id: id, status: "pending", nextAttemptAt: { $lte: new Date() } },
        { $set: { status: "sending", lockedAt: new Date() }, $inc: { attempts: 1 } },
        { new: true }
    ).lean();

export const deliver = async id => {
    const sub = await claim(id); // দুটো প্রক্রিয়া একই মেসেজ ধরতে পারবে না
    if (!sub) return false;

    try {
        const owner = await User.findById(sub.user).select("email").lean();
        await sendEmailService({
            senderName: sub.senderName,
            senderEmail: sub.senderEmail,
            toEmail: owner?.email || sub.receiverEmail,
            subject: sub.subject,
            message: sub.message,
            ipAddress: sub.ipAddress || "N/A"
        });
        await Submission.updateOne(
            { _id: sub._id },
            { $set: { status: "sent", sentAt: new Date(), lockedAt: null, lastError: null } }
        );
        return true;
    } catch (error) {
        const giveUp = sub.attempts >= MAX_ATTEMPTS;
        const wait = BACKOFF_MS[Math.min(sub.attempts - 1, BACKOFF_MS.length - 1)];
        console.error(`[mail-queue] ${sub._id} attempt ${sub.attempts} failed:`, error.cause || error.message);
        await Submission.updateOne(
            { _id: sub._id },
            {
                $set: {
                    status: giveUp ? "failed" : "pending",
                    nextAttemptAt: new Date(Date.now() + wait),
                    lockedAt: null,
                    lastError: String(error.cause || error.message).slice(0, 300)
                }
            }
        ).catch(() => {});
        return false;
    }
};

// request শেষ হওয়ার পরে ব্যাকগ্রাউন্ডে চালানোর জন্য — কখনো throw করে না
export const deliverInBackground = id => {
    setImmediate(() => {
        active += 1;
        deliver(id)
            .catch(e => console.error("[mail-queue] deliver error:", e.message))
            .finally(() => (active -= 1));
    });
};

let sweeping = false;
const WEEK_MS = 7 * 24 * 3600 * 1000;

// force = true (cron-job.org এর সকাল/রাতের ডাক): backoff এর অপেক্ষা না করে সব অপেক্ষমাণ মেসেজ এখনই পাঠায়,
// আর গত ৭ দিনে "failed" হওয়াগুলোকেও আরও একবার সুযোগ দেয় — তাই কিছুই চিরতরে হারায় না।
export const sweep = async ({ force = false } = {}) => {
    if (sweeping) return 0;
    sweeping = true;
    let done = 0;
    try {
        // মাঝপথে আটকে থাকা "sending" গুলো আবার লাইনে
        await Submission.updateMany(
            { status: "sending", lockedAt: { $lt: new Date(Date.now() - LOCK_TIMEOUT_MS) } },
            { $set: { status: "pending", lockedAt: null } }
        );

        if (force) {
            const now = new Date();
            await Submission.updateMany(
                { status: "failed", createdAt: { $gte: new Date(Date.now() - WEEK_MS) } },
                { $set: { status: "pending", attempts: MAX_ATTEMPTS - 1, nextAttemptAt: now } }
            );
            await Submission.updateMany(
                { status: "pending", nextAttemptAt: { $gt: now } },
                { $set: { nextAttemptAt: now } }
            );
        }

        const limit = MAX_PARALLEL * 4;
        for (let round = 0; round < (force ? 10 : 1); round++) {
            const due = await Submission.find({
                status: "pending",
                nextAttemptAt: { $lte: new Date() }
            })
                .sort({ createdAt: 1 })
                .limit(limit)
                .select("_id")
                .lean();
            if (!due.length) break;

            for (let i = 0; i < due.length; i += MAX_PARALLEL) {
                const batch = due.slice(i, i + MAX_PARALLEL);
                const results = await Promise.all(batch.map(d => deliver(d._id)));
                done += results.filter(Boolean).length;
            }
            // force এ ব্যর্থ হওয়াগুলো নিজের backoff এ চলে যায়, তাই একই মেসেজ বারবার ঘুরবে না
            if (due.length < limit) break;
        }
    } catch (error) {
        console.error("[mail-queue] sweep error:", error.message);
    } finally {
        sweeping = false;
    }
    return done;
};

export const startMailQueue = () => {
    setTimeout(() => sweep(), 5_000).unref?.(); // server জাগার একটু পরেই জমে থাকাগুলো পাঠায়
    setInterval(() => sweep(), SWEEP_EVERY_MS).unref?.();
};
