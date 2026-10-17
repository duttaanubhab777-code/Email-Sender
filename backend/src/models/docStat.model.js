import mongoose from "mongoose";

// /docs বইয়ের PDF ডাউনলোড কতবার হলো — শুধু Admin / Super Admin দেখতে পায়।
// একটাই document (key = "readme"); দিনওয়ারি গণনা daily.{YYYY-MM-DD} এ জমা হয়।
const docStatSchema = new mongoose.Schema(
    {
        key: { type: String, default: "readme", unique: true },
        downloads: { type: Number, default: 0 },
        daily: { type: mongoose.Schema.Types.Mixed, default: {} },
        lastDownloadAt: { type: Date }
    },
    { timestamps: true, minimize: false }
);

export const DocStat = mongoose.model("DocStat", docStatSchema);
