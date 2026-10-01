require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(express.json()); // JSON ডেটা রিসিভ করার জন্য
app.use(cors()); // অন্য ডোমেইন থেকে রিকোয়েস্ট অ্যালাউ করার জন্য
app.use(helmet()); // বেসিক API সিকিউরিটির জন্য

// Test Route (সার্ভার ঠিক আছে কি না দেখার জন্য)
app.get("/", (req, res) => {
    res.json({ message: "Email Sender API is running smoothly! 🚀" });
});

// Local Test Route (ফর্ম সাবমিশন চেক করার জন্য)
app.post("/api/submit", (req, res) => {
    // ফন্টএন্ড থেকে পাঠানো ডেটা রিসিভ করা
    const { name, email, message } = req.body;

    // টার্মিনালে ডেটা প্রিন্ট করে দেখা
    console.log("📬 New Form Submission Received!");
    console.log("Name:", name);
    console.log("Email:", email);
    console.log("Message:", message);
    console.log("-----------------------------------");

    // ফন্টএন্ডে সাকসেস মেসেজ পাঠানো
    res.status(200).json({
        success: true,
        message: "Form data received successfully! (Local Test)"
    });
});

// Server Listen
app.listen(PORT, () => {
    console.log(`🚀 Server is running successfully!`);
    console.log(`🌐 Click here to open in browser: http://localhost:${PORT}`);
});
