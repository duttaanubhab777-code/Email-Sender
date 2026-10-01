const mongoose = require('mongoose');

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
        trim: true
    },
    password: {
        type: String,
        required: true // ড্যাশবোর্ডে লগইন করার জন্য (পরে আমরা এটি এনক্রিপ্ট করব)
    },
    apiKey: {
        type: String,
        required: true,
        unique: true // এই Key দিয়েই আমরা বুঝব কোন ওয়েবসাইটের ফর্ম সাবমিট হচ্ছে
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);