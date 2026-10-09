import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

const appCors = cors({ origin: process.env.CORS_ORIGIN, credentials: true });
const mailCors = cors({ origin: "*" }); // শুধু API key-ওয়ালা mail route

app.use((req, res, next) =>
    req.path.startsWith("/api/v1/mail")
        ? mailCors(req, res, next)
        : appCors(req, res, next)
);

app.use(express.json({ limit: "320kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));
app.use(cookieParser());

//routes import

import userRouter from "./routes/user.routes.js";
import apiKeyRouter from "./routes/apiKey.routes.js";
import submissionRouter from "./routes/submission.routes.js";
import adminRouter from "./routes/admin.routes.js";
// routes declaration

app.use("/api/v1/users", userRouter);
app.use("/api/v1/apiKeys", apiKeyRouter);
app.use("/api/v1/mail", submissionRouter);
app.use("/api/v1/admin", adminRouter);

export { app };
