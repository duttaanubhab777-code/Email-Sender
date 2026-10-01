const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    apiKey: {
        type: String,
        required: true // কোন ইউজারের ফর্ম থেকে ডেটা এসেছে সেটা বোঝার জন্য
    },
    senderName: {
        type: String,
        required: true
    },
    senderEmail: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String, // স্প্যামিং আটকাতে বা IP Ban করার জন্য
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Submission', submissionSchema);