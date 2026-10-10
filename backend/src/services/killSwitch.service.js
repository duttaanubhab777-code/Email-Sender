import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { User } from "../models/user.model.js";
import { ApiKey } from "../models/ApiKey.model.js";
import { Submission } from "../models/submission.model.js";
import { SystemState } from "../models/systemState.model.js";
import { ApiError } from "../utils/ApiError.js";
import { deleteFromCloudinary, publicIdFromUrl } from "../utils/cloudinary.js";
import { sendNotificationEmail } from "./mailer.service.js";
import { killCountdownSeconds } from "../constants.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "../..");
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, "..");

export const KILL_TARGETS = Object.freeze({
    submissions: "All email logs (submissions)",
    apiKeys: "All API keys",
    users: "All regular user accounts (with their API keys and email logs)",
    admins: "All admin + Super Admin accounts (with their API keys and email logs)",
    media: "Uploaded files (Cloudinary avatars + temp uploads)",
    database: "The ENTIRE database (every collection, OTPs, approvals, everything)",
    code: "Source code (backend src/public/package files + frontend folder)",
    everything: "ALL of the above"
});

const ALL = ["submissions", "apiKeys", "users", "admins", "media", "database", "code"];
// media আগে (avatar URL লাগে), database/code একদম শেষে
const ORDER = ["media", "submissions", "apiKeys", "users", "admins", "database", "code"];

export const normalizeTargets = targets => {
    if (!Array.isArray(targets) || targets.length === 0) {
        throw new ApiError(400, "Select at least one target to kill");
    }
    const clean = [...new Set(targets.map(t => String(t).trim()))];
    const bad = clean.filter(t => !(t in KILL_TARGETS));
    if (bad.length) throw new ApiError(400, `Unknown target(s): ${bad.join(", ")}`);
    const expanded = clean.includes("everything") ? ALL : clean;
    return [...expanded].sort();
};

export const assertCodeDeleteAllowed = targets => {
    if (targets.includes("code") && process.env.KILL_ALLOW_CODE_DELETE !== "true") {
        throw new ApiError(
            400,
            "Deleting source code is disabled on this server. Set KILL_ALLOW_CODE_DELETE=true in .env to allow it."
        );
    }
};

// ---------- kill switch নিজস্ব password ----------
export const verifyKillPassword = async input => {
    const hash = process.env.KILL_SWITCH_PASSWORD_HASH;
    const plain = process.env.KILL_SWITCH_PASSWORD;

    if (!hash && !plain) {
        throw new ApiError(500, "Kill switch password is not configured on the server");
    }
    if (!input) return false;

    if (hash) return bcrypt.compare(String(input), hash);

    const a = crypto.createHash("sha256").update(String(input)).digest();
    const b = crypto.createHash("sha256").update(plain).digest();
    return crypto.timingSafeEqual(a, b);
};

// ---------- state ----------
let state = null; // চালু থাকলে document, নাহলে null
let timer = null;
let running = false;

export const getPublicStatus = () =>
    state
        ? {
              active: true,
              status: state.status,
              endsAt: state.endsAt,
              remainingSeconds: Math.max(
                  0,
                  Math.ceil((new Date(state.endsAt).getTime() - Date.now()) / 1000)
              )
          }
        : { active: false };

const schedule = endsAt => {
    clearTimeout(timer);
    const ms = Math.max(0, new Date(endsAt).getTime() - Date.now());
    timer = setTimeout(() => runKill().catch(e => console.error("[KILL] fatal", e)), ms);
};

// server চালু হলে আগের countdown থাকলে আবার চালু করে (restart দিয়ে cancel করা যাবে না)
export const initKillSwitch = async () => {
    const doc = await SystemState.findOne({ key: "kill" });
    if (!doc) return;
    state = doc.toObject();
    console.log(`[KILL] resuming countdown, ends at ${state.endsAt.toISOString()}`);
    schedule(state.endsAt);
};

export const armKillSwitch = async ({ targets, user }) => {
    if (state) throw new ApiError(409, "Kill switch is already armed");

    const endsAt = new Date(Date.now() + killCountdownSeconds() * 1000);
    let doc;
    try {
        doc = await SystemState.create({
            key: "kill",
            targets,
            startedBy: user._id,
            startedByEmail: user.email,
            endsAt,
            dryRun: process.env.KILL_DRY_RUN === "true"
        });
    } catch (error) {
        if (error.code === 11000) throw new ApiError(409, "Kill switch is already armed");
        throw error;
    }

    state = doc.toObject();
    schedule(endsAt);
    console.warn(`[KILL] ARMED by ${user.email}. Targets: ${targets.join(", ")}. Ends: ${endsAt.toISOString()}`);

    // Super Admin দের জানানো (না গেলেও সমস্যা নেই)
    try {
        const supers = await User.find({ isSuperAdmin: true }).select("email");
        await Promise.all(
            supers.map(s =>
                sendNotificationEmail({
                    to: s.email,
                    subject: "Kill switch ARMED",
                    heading: "Kill switch armed",
                    lines: [
                        `Started by: ${user.email}`,
                        `Targets: ${targets.join(", ")}`,
                        `Everything stops and the wipe runs at ${endsAt.toISOString()}. It cannot be cancelled.`
                    ]
                }).catch(() => {})
            )
        );
    } catch {
        /* ignore */
    }

    return getPublicStatus();
};

// ---------- wipe steps ----------
const STEPS = {
    media: async () => {
        const cursor = User.find({ avatar: { $exists: true, $nin: ["", null] } })
            .select("avatar")
            .cursor();
        for await (const u of cursor) {
            await deleteFromCloudinary(publicIdFromUrl(u.avatar));
        }
        await User.updateMany({}, { $set: { avatar: "" } });

        const tempDir = path.join(BACKEND_ROOT, "public", "temp");
        const files = await fs.readdir(tempDir).catch(() => []);
        for (const f of files) {
            if (f === ".gitkeep") continue;
            await fs.rm(path.join(tempDir, f), { force: true, recursive: true });
        }
    },
    submissions: () => Submission.deleteMany({}),
    apiKeys: () => ApiKey.deleteMany({}),
    users: () => deleteUsersByRole("user"),
    admins: () => deleteUsersByRole("admin"),
    database: () => mongoose.connection.dropDatabase(),
    code: async () => {
        const paths = [
            path.join(BACKEND_ROOT, "src"),
            path.join(BACKEND_ROOT, "public"),
            path.join(BACKEND_ROOT, "package.json"),
            path.join(BACKEND_ROOT, "package-lock.json")
        ];
        if (path.basename(BACKEND_ROOT) === "backend") {
            paths.push(path.join(PROJECT_ROOT, "frontend"));
        }
        for (const p of paths) {
            if (!p.startsWith(PROJECT_ROOT + path.sep)) continue; // নিরাপত্তা: প্রজেক্টের বাইরে যাবে না
            await fs.rm(p, { recursive: true, force: true });
        }
    }
};

const deleteUsersByRole = async role => {
    const ids = await User.find({ role }).distinct("_id");
    await ApiKey.deleteMany({ user: { $in: ids } });
    await Submission.deleteMany({ user: { $in: ids } });
    await User.deleteMany({ _id: { $in: ids } });
};

const rebuildIndexes = async () => {
    for (const model of Object.values(mongoose.models)) {
        await model.createIndexes().catch(() => {});
    }
};

const runKill = async () => {
    if (!state || running) return;
    running = true;

    const doc = await SystemState.findOneAndUpdate(
        { key: "kill" },
        { $set: { status: "executing" }, $inc: { attempts: 1 } },
        { new: true }
    );

    if (!doc) {
        state = null;
        running = false;
        return;
    }
    if (doc.attempts > 3) {
        console.error("[KILL] giving up after 3 failed attempts");
        await SystemState.deleteOne({ key: "kill" });
        state = null;
        running = false;
        return;
    }

    state = doc.toObject();
    const { targets, dryRun } = state;
    console.warn(`[KILL] EXECUTING${dryRun ? " (DRY RUN)" : ""}: ${targets.join(", ")}`);

    let failed = false;
    for (const target of ORDER.filter(t => targets.includes(t))) {
        try {
            if (target === "code" && process.env.KILL_ALLOW_CODE_DELETE !== "true") {
                console.warn("[KILL] code delete skipped (KILL_ALLOW_CODE_DELETE is not true)");
                continue;
            }
            if (dryRun) console.log(`[KILL][dry-run] would run: ${target}`);
            else await STEPS[target]();
            console.log(`[KILL] ${target} done`);
        } catch (error) {
            failed = true;
            console.error(`[KILL] ${target} failed:`, error);
        }
    }

    if (failed) {
        // ৩০ সেকেন্ড পরে আবার চেষ্টা (সর্বোচ্চ ৩ বার)
        running = false;
        timer = setTimeout(() => runKill().catch(console.error), 30_000);
        return;
    }

    const codeDeleted =
        !dryRun && targets.includes("code") && process.env.KILL_ALLOW_CODE_DELETE === "true";

    await SystemState.deleteOne({ key: "kill" }).catch(() => {});
    state = null;
    running = false;

    if (codeDeleted) {
        console.warn("[KILL] code deleted. Shutting down.");
        process.exit(0);
    }

    await rebuildIndexes();
    console.warn("[KILL] finished. System is running fresh again.");
};
