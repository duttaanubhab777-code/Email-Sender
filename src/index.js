import dotenv from "dotenv";
import mongoose from "mongoose";
import { app } from "./app.js";
import { DB_NAME } from "./constants.js";
import connectDB from "./db/index.js";

dotenv.config({
    path: "./env"
});

connectDB()
    .then(() => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(
                `server is running at http://localhost:${process.env.PORT}`
            );
        });
    })
    .catch(error => {
        console.log("MONGO db connection failed!!!", error);
    });

export { app };
