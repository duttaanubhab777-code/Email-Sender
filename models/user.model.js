import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase : true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    ipAddress: {
        type: mongoose.Schema.Types.ObjectId,
          ref : "Submission",
        default: null},
    apiKey: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);