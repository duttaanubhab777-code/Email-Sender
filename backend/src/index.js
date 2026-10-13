import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB, { prepareDatabase } from "./db/index.js";
import { initKillSwitch } from "./services/killSwitch.service.js";
import { startMailQueue } from "./services/mailQueue.service.js";

dotenv.config({
    path: "./.env"
});

// একটা অপ্রত্যাশিত error এ পুরো server যেন বন্ধ না হয়ে যায়
process.on("unhandledRejection", reason => {
    console.error("[unhandledRejection]", reason);
});

connectDB()
    .then(async () => {
        // collection + index তৈরি থাকা নিশ্চিত করা (deploy / fresh database এ আলাদা কিছু করতে হবে না)
        await prepareDatabase();
        await initKillSwitch(); // আগের countdown চলার মাঝে restart হলে আবার চালু হবে

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`server is running at http://localhost:${port}`);
        });
        startMailQueue(); // পাঠানো যায়নি এমন ইমেইল নিজে নিজে আবার চেষ্টা
    })
    .catch(error => {
        console.log("MONGO db connection failed!!!", error);
    });

export { app };
