import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/ApiError.js";
import { killGate } from "./middlewares/killGate.middleware.js";

const app = express();

// proxy এর পেছনে (Render, Railway ইত্যাদি) থাকলে .env তে TRUST_PROXY=1 দিন, নাহলে সঠিক IP পাওয়া যাবে না
if (process.env.TRUST_PROXY) {
    const v = process.env.TRUST_PROXY;
    app.set(
        "trust proxy",
        /^\d+$/.test(v) ? Number(v) : v === "true" ? true : v
    );
}

const appCors = cors({ origin: process.env.CORS_ORIGIN, credentials: true });
const mailCors = cors({ origin: "*" }); // শুধু API key-ওয়ালা mail route

app.use((req, res, next) =>
    req.path.startsWith("/api/v1/mail")
        ? mailCors(req, res, next)
        : appCors(req, res, next)
);

// Kill switch চালু থাকলে পুরো সাইট এখানেই বন্ধ (CORS এর পরে, যাতে frontend 503 পড়তে পারে)
app.use(killGate);

app.use(express.json({ limit: "320kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));
app.use(cookieParser());

//routes import

import userRouter from "./routes/user.routes.js";
import apiKeyRouter from "./routes/apiKey.routes.js";
import submissionRouter from "./routes/submission.routes.js";
import adminRouter from "./routes/admin.routes.js";
import approvalRouter from "./routes/approval.routes.js";
import killSwitchRouter from "./routes/killSwitch.routes.js";
import systemRouter from "./routes/system.routes.js";
// routes declaration

app.use("/api/v1/users", userRouter);
app.use("/api/v1/apiKeys", apiKeyRouter);
app.use("/api/v1/mail", submissionRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/approvals", approvalRouter);
app.use("/api/v1/kill-switch", killSwitchRouter);
app.use("/api/v1/system", systemRouter);

// 404
app.use((req, res) =>
    res
        .status(404)
        .json({ statusCode: 404, success: false, message: "Route not found" })
);

// সব error JSON আকারে
app.use((err, req, res, next) => {
    let status = err.statusCode || err.status || 500;
    if (err.name === "MulterError") status = 400;

    if (status >= 500) console.error(err);

    const retryAfter = err.errors?.[0]?.retryAfter;
    if (retryAfter) res.set("Retry-After", String(retryAfter));

    const message =
        status >= 500 && !(err instanceof ApiError)
            ? "Internal Server Error"
            : err.message;

    res.status(status).json({
        statusCode: status,
        success: false,
        message,
        errors: err.errors || []
    });
});

export { app };
