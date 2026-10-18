import { Submission } from "../models/submission.model.js";
import { MailJob } from "../models/mailJob.model.js";
import { User } from "../models/user.model.js";
import { sendEmailService } from "./email.service.js";
import {
    sendMail,
    buildOtpMail,
    buildNotificationMail,
    mailProvider,
    mailConfigProblem
} from "./mailer.service.js";

// ---- কিউ কীভাবে কাজ করে ----
// ১. ফর্ম এলে মেসেজ আগে DB তে "pending" হিসেবে সেভ হয় → ভিজিটর সাথে সাথে সাড়া পায়।
//    OTP / notification ইমেইলও একইভাবে আগে DB (mailjobs) তে সেভ হয়।
// ২. সাথে সাথেই পাঠানোর চেষ্টা হয়। ব্যর্থ হলে ছোট backoff দিয়ে আবার "pending" এ ফেরে।
// ৩. server জেগে থাকলে worker প্রতি ৩০ সেকেন্ডে বাকিগুলো পাঠায়।
// ৪. 🔑 Render ঘুমিয়ে থাকলে কোনো timer চলে না। তাই server যখনই জাগে (ফর্ম খোলা, কেউ সাইটে ঢোকা,
//    deploy, cron) — ২ সেকেন্ড পরেই একটা "জোর করা" sweep চলে: backoff এর অপেক্ষা বাতিল করে
//    জমে থাকা সব ইমেইল এখনই পাঠায়। আগে এটা না থাকায় জেগেও পুরনো মেইল ঘণ্টার পর ঘণ্টা আটকে থাকত।
// ৫. পাঠানোর সময় "sending" lock থাকে; server মাঝপথে বন্ধ হলে lock পরে ছেড়ে দেওয়া হয়।
// সব মিলিয়ে: মেসেজ কখনো হারায় না (at-least-once)।

const SUB_MAX_ATTEMPTS = 8;
// ব্যর্থতার পরে অপেক্ষা: Render ১৫ মিনিট পরে ঘুমায়, তাই শুরুর ধাপগুলো ছোট রাখা হয়েছে
const SUB_BACKOFF_MS = [10e3, 30e3, 90e3, 300e3, 900e3, 3600e3, 10800e3];

const JOB_MAX_ATTEMPTS = 10;
const JOB_BACKOFF_MS = [5e3, 10e3, 20e3, 40e3, 60e3, 90e3]; // OTP তাড়াতাড়ি লাগে

const LOCK_TIMEOUT_MS = 2 * 60 * 1000;
const BOOT_LOCK_TIMEOUT_MS = 45 * 1000; // এইমাত্র চালু হয়েছে → আগের process এর lock নিশ্চিত পুরনো
const SWEEP_EVERY_MS = 30 * 1000;
const WEEK_MS = 7 * 24 * 3600 * 1000;
// PythonAnywhere free relay এ সাধারণত ১টাই worker — তাই বেশি একসাথে নয়
const MAX_PARALLEL = 2;

const backoff = (list, attempts) => list[Math.min(attempts - 1, list.length - 1)];
const errText = error => String(error.cause || error.message).slice(0, 300);

// দুটো প্রক্রিয়া একই মেসেজ ধরতে পারবে না
const claim = (Model, id) =>
    Model.findOneAndUpdate(
        { _id: id, status: "pending", nextAttemptAt: { $lte: new Date() } },
        { $set: { status: "sending", lockedAt: new Date() }, $inc: { attempts: 1 } },
        { new: true }
    ).lean();

// ================= ফর্মের মেসেজ (Submission) =================

export const deliver = async id => {
    const sub = await claim(Submission, id);
    if (!sub) return false;

    try {
        const owner = await User.findById(sub.user).select("email").lean();
        await sendEmailService({
            senderName: sub.senderName,
            senderEmail: sub.senderEmail,
            toEmail: owner?.email || sub.receiverEmail,
            subject: sub.subject,
            message: sub.message,
            ipAddress: sub.ipAddress || "N/A",
            sourceUrl: sub.sourceUrl || ""
        });
        await Submission.updateOne(
            { _id: sub._id },
            { $set: { status: "sent", sentAt: new Date(), lockedAt: null, lastError: null } }
        );
        return true;
    } catch (error) {
        const giveUp = sub.attempts >= SUB_MAX_ATTEMPTS;
        console.error(`[mail-queue] ${sub._id} attempt ${sub.attempts} failed:`, errText(error));
        await Submission.updateOne(
            { _id: sub._id },
            {
                $set: {
                    status: giveUp ? "failed" : "pending",
                    nextAttemptAt: new Date(Date.now() + backoff(SUB_BACKOFF_MS, sub.attempts)),
                    lockedAt: null,
                    lastError: errText(error)
                }
            }
        ).catch(() => {});
        return false;
    }
};

// request শেষ হওয়ার পরে ব্যাকগ্রাউন্ডে চালানোর জন্য — কখনো throw করে না
export const deliverInBackground = id => {
    setImmediate(() => {
        deliver(id).catch(e => console.error("[mail-queue] deliver error:", e.message));
    });
};

// ================= OTP / notification ইমেইল (MailJob) =================

export const deliverJob = async id => {
    const job = await claim(MailJob, id);
    if (!job) return false;

    // OTP এর মেয়াদ শেষ — পাঠিয়ে লাভ নেই
    if (job.expiresAt <= new Date()) {
        await MailJob.deleteOne({ _id: job._id }).catch(() => {});
        return false;
    }

    try {
        await sendMail({
            to: job.to,
            subject: job.subject,
            html: job.html,
            fromName: job.fromName || undefined,
            replyTo: job.replyTo ? { email: job.replyTo } : undefined
        });
        await MailJob.deleteOne({ _id: job._id }); // পৌঁছে গেছে → DB থেকে মুছে (OTP কোড পড়ে থাকবে না)
        return true;
    } catch (error) {
        const wait = backoff(JOB_BACKOFF_MS, job.attempts);
        const giveUp = job.attempts >= JOB_MAX_ATTEMPTS;
        console.error(`[mail-queue] job ${job._id} (${job.kind}) attempt ${job.attempts} failed:`, errText(error));
        await MailJob.updateOne(
            { _id: job._id },
            {
                $set: {
                    status: giveUp ? "failed" : "pending",
                    nextAttemptAt: new Date(Date.now() + wait),
                    lockedAt: null,
                    lastError: errText(error)
                }
            }
        ).catch(() => {});
        // জেগে থাকলে ৩০ সেকেন্ডের sweep এর অপেক্ষা না করে নিজেই আবার চেষ্টা
        if (!giveUp) {
            setTimeout(
                () => deliverJob(job._id).catch(() => {}),
                wait + 200
            ).unref?.();
        }
        return false;
    }
};

// ইমেইল আগে DB তে pending সেভ, তারপর পাঠানো।
// waitMs > 0 হলে (OTP) সর্বোচ্চ ততক্ষণ অপেক্ষা করে — এর মধ্যে না গেলেও request সফল ধরা হয়,
// আর ইমেইল ব্যাকগ্রাউন্ডে retry হতে থাকে। DB তে সেভই না হলে তবেই error।
export const queueMail = async ({ kind, to, subject, html, fromName, replyTo, ttlMs, waitMs = 0 }) => {
    const job = await MailJob.create({
        kind,
        to,
        subject,
        html,
        fromName: fromName || "",
        replyTo: replyTo || "",
        expiresAt: new Date(Date.now() + ttlMs)
    });

    const run = deliverJob(job._id).catch(e => {
        console.error("[mail-queue] job error:", e.message);
        return false;
    });
    if (!waitMs) return { id: job._id, delivered: false };

    let timer;
    const delivered = await Promise.race([
        run,
        new Promise(resolve => {
            timer = setTimeout(() => resolve(false), waitMs);
        })
    ]);
    clearTimeout(timer);
    return { id: job._id, delivered };
};

const OTP_TTL_PAD_MS = 60 * 1000;

export const queueOtpEmail = ({ to, code, purpose, minutes }) => {
    const { subject, html } = buildOtpMail({ code, purpose, minutes });
    return queueMail({
        kind: "otp",
        to,
        subject,
        html,
        ttlMs: minutes * 60 * 1000 + OTP_TTL_PAD_MS,
        waitMs: 8_000
    });
};

// আগের sendNotificationEmail এর বদলি (একই signature) — এখন request আটকায় না, DB তে সেভ হয়ে ব্যাকগ্রাউন্ডে যায়
export const sendNotificationEmail = ({ to, subject, heading, lines, danger = false }) => {
    const mail = buildNotificationMail({ subject, heading, lines, danger });
    return queueMail({
        kind: "notify",
        to,
        subject: mail.subject,
        html: mail.html,
        ttlMs: 3 * 24 * 3600 * 1000
    });
};

// ================= sweep =================

let sweeping = false;

// force = true: backoff এর অপেক্ষা না করে সব অপেক্ষমাণ মেসেজ এখনই পাঠায়, আর গত ৭ দিনে "failed" হওয়াগুলোকেও
// আরও একবার সুযোগ দেয় — তাই কিছুই চিরতরে হারায় না। (server জাগার সময় এবং /cron এ এটাই চলে)
// boot = true: process এইমাত্র চালু হয়েছে, তাই আটকে থাকা "sending" গুলো আরও তাড়াতাড়ি ছাড়া হয়।
export const sweep = async ({ force = false, boot = false } = {}) => {
    if (sweeping) return 0;
    sweeping = true;
    let done = 0;
    try {
        const now = new Date();
        const lockCutoff = new Date(Date.now() - (boot ? BOOT_LOCK_TIMEOUT_MS : LOCK_TIMEOUT_MS));

        // মাঝপথে আটকে থাকা "sending" গুলো আবার লাইনে
        await Promise.all([
            Submission.updateMany(
                { status: "sending", lockedAt: { $lt: lockCutoff } },
                { $set: { status: "pending", lockedAt: null } }
            ),
            MailJob.updateMany(
                { status: "sending", lockedAt: { $lt: lockCutoff } },
                { $set: { status: "pending", lockedAt: null } }
            )
        ]);

        if (force) {
            await Submission.updateMany(
                { status: "failed", createdAt: { $gte: new Date(Date.now() - WEEK_MS) } },
                { $set: { status: "pending", attempts: SUB_MAX_ATTEMPTS - 1, nextAttemptAt: now } }
            );
            await Submission.updateMany(
                { status: "pending", nextAttemptAt: { $gt: now } },
                { $set: { nextAttemptAt: now } }
            );
            await MailJob.updateMany(
                { status: "failed", expiresAt: { $gt: now } },
                { $set: { status: "pending", attempts: JOB_MAX_ATTEMPTS - 1, nextAttemptAt: now } }
            );
            await MailJob.updateMany(
                { status: "pending", nextAttemptAt: { $gt: now } },
                { $set: { nextAttemptAt: now } }
            );
        }

        // OTP / notification আগে (তাড়াতাড়ি দরকার), তারপর ফর্মের মেসেজ
        done += await drain(MailJob, deliverJob, "expiresAt", force);
        done += await drain(Submission, deliver, "createdAt", force);
    } catch (error) {
        console.error("[mail-queue] sweep error:", error.message);
    } finally {
        sweeping = false;
    }
    return done;
};

const drain = async (Model, deliverOne, sortField, force) => {
    let done = 0;
    const limit = MAX_PARALLEL * 10;
    for (let round = 0; round < (force ? 10 : 1); round++) {
        const due = await Model.find({ status: "pending", nextAttemptAt: { $lte: new Date() } })
            .sort({ [sortField]: 1 })
            .limit(limit)
            .select("_id")
            .lean();
        if (!due.length) break;

        for (let i = 0; i < due.length; i += MAX_PARALLEL) {
            const batch = due.slice(i, i + MAX_PARALLEL);
            const results = await Promise.all(batch.map(d => deliverOne(d._id)));
            const ok = results.filter(Boolean).length;
            done += ok;
            // পুরো batch ই ব্যর্থ = relay সম্ভবত বন্ধ। বাকিদের পিছনে না লেগে থামো (সবাই নিজের backoff এ আছে)
            if (!ok && batch.length > 1) return done;
        }
        if (due.length < limit) break;
    }
    return done;
};

// মোট অবস্থা — মোবাইল থেকে দেখার জন্য (system.routes.js এর /mail-queue)
export const queueStats = async () => {
    const count = async Model =>
        Object.fromEntries(
            (await Model.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }])).map(r => [r._id, r.n])
        );
    const [submissions, jobs, recentErrors] = await Promise.all([
        count(Submission),
        count(MailJob),
        Submission.find({ status: { $in: ["pending", "failed"] }, lastError: { $ne: null } })
            .sort({ updatedAt: -1 })
            .limit(5)
            .select("status attempts lastError nextAttemptAt updatedAt")
            .lean()
    ]);
    return {
        provider: mailProvider(),
        configProblem: mailConfigProblem(),
        submissions,
        jobs,
        recentErrors
    };
};

export const startMailQueue = () => {
    // server এইমাত্র জাগল (Render ঘুম থেকে / deploy) → জমে থাকা সব এখনই পাঠাও
    setTimeout(() => sweep({ force: true, boot: true }), 2_000).unref?.();
    setInterval(() => sweep(), SWEEP_EVERY_MS).unref?.();
};
