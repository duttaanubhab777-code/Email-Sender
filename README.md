# 🚀 Email Sender API (Custom Form Backend Service)

এটি একটি কাস্টম ফর্ম ব্যাকএন্ড সার্ভিস, যা ঠিক Web3Forms বা Formspree-এর মতো কাজ করে। ক্লায়েন্ট ওয়েবসাইটের কন্টাক্ট ফর্ম থেকে ডেটা রিসিভ করে সরাসরি জিমেইলে ফরোয়ার্ড করা এবং স্প্যাম কন্ট্রোল করা এর মূল কাজ।

## 💡 Project Overview
অনেক সময় ওয়েবসাইটের মালিকরা তাদের ওয়েবসাইটে সরাসরি ইমেইল অ্যাড্রেস দিতে চান না (স্প্যামিংয়ের ভয়ে)। এই সার্ভিসটি ব্যবহার করে তারা খুব সহজেই নিজেদের ওয়েবসাইটে একটি ফর্ম বসাতে পারবেন এবং কেউ সেই ফর্ম পূরণ করলে ডেটা সরাসরি তাদের ইনবক্সে চলে যাবে।

### ✨ Key Features (Planned)
- 📩 **Form to Email Forwarding:** ফর্মের ডেটা সরাসরি ক্লায়েন্টের জিমেইলে পাঠানো।
- 🛡️ **Spam Protection & IP Tracking:** সেন্ডারের IP Address ক্যাপচার করা এবং স্প্যামিং আটকাতে IP Ban করার সুবিধা।
- 📊 **User & Admin Dashboards:** ক্লায়েন্ট এবং সুপার-অ্যাডমিনের জন্য আলাদা কন্ট্রোল প্যানেল।
- 🌐 **Domain Whitelisting:** নির্দিষ্ট ডোমেইন ছাড়া অন্য কোথাও থেকে ফর্ম সাবমিট ব্লক করা।

## 🛠️ Tech Stack & Architecture
এই প্রজেক্টটি **Decoupled Architecture** অনুসরণ করে তৈরি করা হচ্ছে:
- **Backend (API):** Node.js, Express.js (বর্তমানে Render-এর জন্য তৈরি হচ্ছে, পরে স্পিড অপ্টিমাইজেশনের জন্য Vercel-এ মাইগ্রেট করা হবে)।
- **Database:** MongoDB (Mongoose) - ইউজার ডেটা এবং ফর্ম সাবমিশন লগ রাখার জন্য।
- **Email Service:** Nodemailer
- **Frontend (Dashboards):** Vanilla JavaScript, HTML, CSS (GitHub Pages-এ হোস্ট করা হবে)।

## 📂 Code Structure
প্রজেক্টটি ফিউচার-প্রুফ এবং স্কেলেবল রাখার জন্য MVC (Model-View-Controller) প্যাটার্নে সাজানো হয়েছে:

email-sender/
├── controllers/    # API এর মূল লজিক (যেমন: formSubmit, loginUser)
├── middlewares/    # IP চেকিং, স্প্যাম ফিল্টার, টোকেন ভেরিফিকেশন
├── models/         # MongoDB ডেটাবেস স্কিমা (Users, Submissions)
├── routes/         # API এন্ডপয়েন্ট (যেমন: /api/v1/submit)
├── services/       # থার্ড-পার্টি সার্ভিস (যেমন: email.service.js)
├── .env            # সিক্রেট API Key এবং পাসওয়ার্ড
├── .gitignore      # গিটহাবে যে ফাইলগুলো যাবে না
├── index.js        # মূল এন্ট্রি পয়েন্ট এবং সার্ভার সেটআপ
└── package.json    # প্রজেক্টের প্যাকেজ এবং স্ক্রিপ্ট ইনফরমেশন

## 🚀 Current Progress (কতদূর কাজ হয়েছে)
- [x] প্রজেক্ট ইনিশিয়ালাইজেশন এবং রিপোজিটরি তৈরি।
- [x] প্রয়োজনীয় প্যাকেজ ইনস্টলেশন (Express, Mongoose, Nodemailer, Cors, Helmet)।
- [x] স্কেলেবল ফোল্ডার স্ট্রাকচার তৈরি।
- [x] index.js এ বেসিক Express সার্ভার সেটআপ।
- [ ] MongoDB ডেটাবেস কানেকশন (পরবর্তী কাজ)।
- [ ] API রাউটিং এবং ইমেইল সেন্ডিং লজিক লেখা।
- [ ] ফন্টএন্ড ড্যাশবোর্ড তৈরি।

## 💻 How to Run Locally
১. প্রজেক্টটি ক্লোন করুন।
২. টার্মিনালে npm install রান করে প্যাকেজগুলো ইনস্টল করুন।
৩. .env ফাইল তৈরি করে প্রয়োজনীয় ক্রেডেনশিয়াল দিন।
৪. npm run dev কমান্ড দিয়ে সার্ভার চালু করুন।