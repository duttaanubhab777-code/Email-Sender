import mongoose from "mongoose";

// Kill switch চালু হলে countdown এর তথ্য এখানে সেভ থাকে (server restart হলেও timer হারাবে না)
const systemStateSchema = new mongoose.Schema({
    key: { type: String, default: "kill", unique: true },
    status: { type: String, enum: ["armed", "executing"], default: "armed" },
    targets: { type: [String], required: true },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    startedByEmail: { type: String },
    startedAt: { type: Date, default: Date.now },
    endsAt: { type: Date, required: true },
    dryRun: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 }
});

export const SystemState = mongoose.model("SystemState", systemStateSchema);
