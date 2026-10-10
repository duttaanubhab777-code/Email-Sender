import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { isYes } from "../utils/validators.js";
import { authorizeExtra } from "../utils/approval.js";
import { User } from "../models/user.model.js";
import { Otp } from "../models/otp.model.js";
import { KillSession } from "../models/killSession.model.js";
import { createAndSendOtp, resendOtp, verifyOtp } from "../services/otp.service.js";
import {
    KILL_TARGETS,
    normalizeTargets,
    assertCodeDeleteAllowed,
    verifyKillPassword,
    armKillSwitch,
    getPublicStatus
} from "../services/killSwitch.service.js";
import {
    OTP_PURPOSES,
    KILL_OTP_EXPIRY_MINUTES,
    KILL_SESSION_MINUTES,
    KILL_MAX_PASSWORD_FAILS,
    OTP_RESEND_COOLDOWN_SECONDS,
    killCountdownSeconds
} from "../constants.js";

const loadSession = async req => {
    const { sessionId } = req.body;
    if (!mongoose.isValidObjectId(sessionId)) {
        throw new ApiError(400, "sessionId is required");
    }
    const session = await KillSession.findOne({ _id: sessionId, user: req.user._id });
    if (!session || session.expiresAt < new Date()) {
        if (session) await session.deleteOne();
        throw new ApiError(410, "Kill switch session expired. Please start again");
    }
    return session;
};

const requireStep = (session, step) => {
    if (session.step !== step) {
        throw new ApiError(409, `Wrong step. Current step is '${session.step}'`);
    }
};

const abort = async (req, res, session) => {
    await session.deleteOne();
    await Otp.deleteOne({ email: req.user.email, purpose: OTP_PURPOSES.KILL_SWITCH });
    return res
        .status(200)
        .json(new ApiResponse(200, { aborted: true }, "Kill switch aborted. Nothing was changed"));
};

const labels = targets => targets.map(t => KILL_TARGETS[t]).join("; ");

// কোন কোন জিনিস ডিলিট করা যাবে তার লিস্ট
const getKillOptions = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(
            200,
            {
                targets: KILL_TARGETS,
                countdownSeconds: killCountdownSeconds(),
                codeDeleteAllowed: process.env.KILL_ALLOW_CODE_DELETE === "true",
                dryRun: process.env.KILL_DRY_RUN === "true",
                needsApproval: !req.user.isSuperAdmin,
                status: getPublicStatus()
            },
            "Kill switch options"
        )
    );
});

// ধাপ ১: নিজের password + কী কী ডিলিট হবে (Admin হলে সাথে approvalId)
const startKillSwitch = asyncHandler(async (req, res) => {
    const { password, targets } = req.body;

    if (getPublicStatus().active) throw new ApiError(409, "Kill switch is already armed");

    const list = normalizeTargets(targets);
    assertCodeDeleteAllowed(list);

    if (!password) throw new ApiError(400, "Your account password is required");
    const me = await User.findById(req.user._id);
    if (!(await me.isPasswordCorrect(password))) {
        throw new ApiError(401, "Incorrect password");
    }

    // Super Admin হলে সরাসরি, Admin হলে approval খরচ হবে (password ঠিক হওয়ার পরেই)
    const auth = await authorizeExtra(req, "kill_switch", list.join(","));

    await KillSession.deleteMany({ user: req.user._id });
    const session = await KillSession.create({
        user: req.user._id,
        targets: list,
        authorizedBy: auth.by === "super" ? "super" : "approval",
        expiresAt: new Date(Date.now() + KILL_SESSION_MINUTES * 60 * 1000)
    });

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                sessionId: session._id,
                step: "confirm1",
                targets: list,
                prompt: `Are you sure you want to activate the kill switch? This will PERMANENTLY delete: ${labels(list)}. Send answer "yes" to continue.`
            },
            "Password verified"
        )
    );
});

// ধাপ ২: "are you sure?" -> yes হলে OTP যায়
const confirmStep1 = asyncHandler(async (req, res) => {
    const session = await loadSession(req);
    requireStep(session, "confirm1");

    if (!isYes(req.body.answer)) return abort(req, res, session);

    await createAndSendOtp({
        email: req.user.email,
        purpose: OTP_PURPOSES.KILL_SWITCH,
        payload: { sessionId: String(session._id) },
        expiryMinutes: KILL_OTP_EXPIRY_MINUTES
    });

    session.step = "otp";
    await session.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                step: "otp",
                resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
                expiresInMinutes: KILL_OTP_EXPIRY_MINUTES
            },
            "OTP sent to your email"
        )
    );
});

const resendKillOtp = asyncHandler(async (req, res) => {
    const session = await loadSession(req);
    requireStep(session, "otp");

    const sent = await resendOtp({
        email: req.user.email,
        purpose: OTP_PURPOSES.KILL_SWITCH,
        expiryMinutes: KILL_OTP_EXPIRY_MINUTES
    });
    if (!sent) throw new ApiError(400, "No pending OTP. Please start again");

    return res
        .status(200)
        .json(new ApiResponse(200, { resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS }, "OTP sent again"));
});

// ধাপ ৩: OTP দেওয়া -> আবার "are you sure?"
const verifyKillOtp = asyncHandler(async (req, res) => {
    const session = await loadSession(req);
    requireStep(session, "otp");

    const doc = await verifyOtp({
        email: req.user.email,
        purpose: OTP_PURPOSES.KILL_SWITCH,
        code: req.body.otp
    });
    if (doc.payload?.sessionId !== String(session._id)) {
        throw new ApiError(400, "This code does not belong to the current session");
    }

    session.step = "confirm2";
    await session.save();

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                step: "confirm2",
                targets: session.targets,
                prompt: `FINAL WARNING: once armed, the whole website stops for ${killCountdownSeconds() / 60} minutes and then ${labels(session.targets)} will be permanently destroyed. There is NO cancel. Send answer "yes" and the kill switch password to proceed.`
            },
            "OTP verified"
        )
    );
});

// ধাপ ৪: শেষ yes + kill switch এর নিজস্ব password -> countdown শুরু
const executeKillSwitch = asyncHandler(async (req, res) => {
    const session = await loadSession(req);
    requireStep(session, "confirm2");

    if (!isYes(req.body.answer)) return abort(req, res, session);

    const ok = await verifyKillPassword(req.body.killPassword);
    if (!ok) {
        session.killPasswordFails += 1;
        if (session.killPasswordFails >= KILL_MAX_PASSWORD_FAILS) {
            await session.deleteOne();
            throw new ApiError(401, "Wrong kill switch password too many times. Session closed");
        }
        await session.save();
        throw new ApiError(
            401,
            `Wrong kill switch password. ${KILL_MAX_PASSWORD_FAILS - session.killPasswordFails} attempt(s) left`
        );
    }

    assertCodeDeleteAllowed(session.targets);
    const status = await armKillSwitch({ targets: session.targets, user: req.user });
    await session.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, status, "Kill switch armed. The system will shut down when the timer ends"));
});

export {
    getKillOptions,
    startKillSwitch,
    confirmStep1,
    resendKillOtp,
    verifyKillOtp,
    executeKillSwitch
};
