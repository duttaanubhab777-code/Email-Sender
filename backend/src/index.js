import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";
import { initKillSwitch } from "./services/killSwitch.service.js";

dotenv.config({
    path: "./.env"
});

connectDB()
    .then(async () => {
        await initKillSwitch(); // আগের countdown চলার মাঝে restart হলে আবার চালু হবে

        const port = process.env.PORT || 8000;
        app.listen(port, () => {
            console.log(`server is running at http://localhost:${port}`);
        });
    })
    .catch(error => {
        console.log("MONGO db connection failed!!!", error);
    });

export { app };
