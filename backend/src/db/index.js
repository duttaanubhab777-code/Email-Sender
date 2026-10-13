import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

// কোনো query আটকে থাকলে চিরকাল "loading" না দেখিয়ে কিছুক্ষণ পর error দেবে
mongoose.set("bufferTimeoutMS", 15_000);

// Atlas এর দেওয়া URI যেমনই হোক (শেষে "/", "?retryWrites=true&w=majority&appName=..." থাকুক বা না থাকুক)
// সঠিকভাবে database নাম বসিয়ে দেয়। আগে "?..." থাকলে connection ভেঙে যেত।
export const buildMongoUri = (raw, dbName = DB_NAME) => {
    const uri = String(raw ?? "").trim().replace(/^["']|["']$/g, "");
    if (!uri) throw new Error("MONGODB_URI is not set");
    const scheme = uri.match(/^mongodb(?:\+srv)?:\/\//);
    if (!scheme) throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://");

    const q = uri.indexOf("?");
    const base = q === -1 ? uri : uri.slice(0, q);
    const query = q === -1 ? "" : uri.slice(q);
    const rest = base.slice(scheme[0].length);
    const slash = rest.indexOf("/");
    const hosts = slash === -1 ? rest : rest.slice(0, slash);
    return `${scheme[0]}${hosts}/${dbName}${query}`;
};

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(
            buildMongoUri(process.env.MONGODB_URI),
            {
                serverSelectionTimeoutMS: 15_000,
                socketTimeoutMS: 45_000
            }
        );
        console.log(
            `\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`
        );
    } catch (error) {
        console.log("MongoDB connection error", error);
        process.exit(1);
    }
};

mongoose.connection.on("disconnected", () =>
    console.warn("[DB] disconnected — driver will try to reconnect")
);
mongoose.connection.on("reconnected", () => console.log("[DB] reconnected"));

/**
 * প্রতিটা model এর collection + index তৈরি/ঠিক করে দেয়।
 *
 * কখন লাগে:
 *  1. server চালু হওয়ার সময় (প্রথম request আসার আগেই unique index তৈরি থাকবে)
 *  2. Kill switch দিয়ে database drop করার পরে — তখন collection আর index সব মুছে যায়,
 *     অথচ server চালু থাকে। এটা না করলে নতুন database এ index ছাড়াই কাজ চলত
 *     এবং আগে হাতে server restart দিতে হতো।
 */
export const prepareDatabase = async () => {
    const models = Object.values(mongoose.models);
    for (const model of models) {
        try {
            await model.createCollection();
        } catch (error) {
            // collection আগে থেকেই থাকলে সমস্যা নেই
            if (error?.codeName !== "NamespaceExists" && error?.code !== 48) {
                console.error(
                    `[DB] createCollection failed for ${model.modelName}:`,
                    error.message
                );
            }
        }
        try {
            await model.syncIndexes();
        } catch (error) {
            console.error(
                `[DB] syncIndexes failed for ${model.modelName}:`,
                error.message
            );
        }
    }
    console.log(`[DB] ready — ${models.length} models synced`);
};

export default connectDB;
