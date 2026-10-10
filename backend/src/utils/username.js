import crypto from "crypto";
import { User } from "../models/user.model.js";

export const normalizeUsername = v =>
    String(v ?? "")
        .trim()
        .toLowerCase();

// email এর @ এর আগের অংশ থেকে username বানায় (শুধু a-z 0-9 . _ - রাখে)
export const usernameFromEmail = email => {
    let base = String(email)
        .split("@")[0]
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "")
        .slice(0, 16);
    while (base.length < 3) base += crypto.randomInt(0, 10);
    return base;
};

// নেওয়া থাকলে শেষে সংখ্যা জুড়ে ফাঁকা username বের করে
export const findFreeUsername = async base => {
    let candidate = base;
    for (let i = 0; i < 10; i++) {
        if (!(await User.exists({ username: candidate }))) return candidate;
        candidate = `${base.slice(0, 16)}${crypto.randomInt(10, 9999)}`;
    }
    return `${base.slice(0, 10)}${Date.now().toString().slice(-6)}`;
};
