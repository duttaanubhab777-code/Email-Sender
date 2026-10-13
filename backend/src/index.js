// .env সবার আগে লোড (import হওয়া ফাইলগুলো শুরুতেই process.env পড়ে, তাই এটা প্রথম লাইন হতে হবে)
import "dotenv/config";
import mongoose from "mongoose";
import { app } from "./app.js";
import connectDB, { prepareDatabase } from "./db/index.js";
import { initKillSwitch } from "./services/killSwitch.service.js";
import { startMailQueue } from "./services/mailQueue.service.js";
import { mailProvider, mailConfigProblem } from "./services/mailer.service.js";

// একটা অপ্রত্যাশিত error এ পুরো server যেন বন্ধ না হয়ে যায়
process.on("unhandledRejection", reason => {
    console.error("[unhandledRejection]", reason);
});

connectDB()
    .then(async () => {
        // collection + index তৈরি থাকা নিশ্চিত করা (deploy / fresh database এ আলাদা কিছু করতে হবে না)
        await prepareDatabase();
        await initKillSwitch(); // আগের countdown চলার মাঝে restart হলে আবার চালু হবে

        // Render PORT নিজে দেয় (যেমন 10000); local এ 3000
        const port = process.env.PORT || 3000;
        const server = app.listen(port, "0.0.0.0", () => {
            console.log(`server is running on port ${port}`);
        });
        startMailQueue(); // পাঠানো যায়নি এমন ইমেইল নিজে নিজে আবার চেষ্টা

        console.log(`[mail] provider = ${mailProvider()}`);
        const problem = mailConfigProblem();
        if (problem) console.warn(`[mail] ⚠ ${problem}`);
        if (!process.env.CRON_SECRET) console.warn("[cron] CRON_SECRET not set — /api/v1/system/cron is disabled");

        // Render নতুন deploy এর সময় SIGTERM দেয় — চলমান request শেষ করে সুন্দরভাবে বন্ধ
        const shutdown = signal => {
            console.log(`[${signal}] shutting down…`);
            server.close(() => mongoose.connection.close().finally(() => process.exit(0)));
            setTimeout(() => process.exit(0), 10_000).unref();
        };
        process.on("SIGTERM", () => shutdown("SIGTERM"));
        process.on("SIGINT", () => shutdown("SIGINT"));
    })
    .catch(error => {
        console.log("MONGO db connection failed!!!", error);
        process.exit(1);
    });

export { app };
