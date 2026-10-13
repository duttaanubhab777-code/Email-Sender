# 📬 Email Sender

ওয়েবসাইটের Contact Form এর মেসেজ সরাসরি ইনবক্সে পাঠানোর একটা API সার্ভিস (Formspree / Web3Forms এর মতো)।
ইউজার একটা API key বানায়, নিজের ফর্মে বসায় — ভিজিটর ফর্ম পাঠালেই মালিকের ইনবক্সে মেইল যায়।

**Stack:** React + Vite (frontend) · Node.js + Express 5 + MongoDB (backend) · Flask relay (Gmail SMTP)

## ✨ ফিচার

- **Auth:** Register / Login / Forgot password — সবকিছুতে OTP (resend এ ৩০ সেকেন্ড অপেক্ষা), username ইমেইল থেকে নিজে ভরে
- **API key:** তৈরি, চালু/বন্ধ, ব্যবহারের হিসাব, মাসিক ইমেইল লিমিট
- **ফর্ম API:** `POST /api/v1/mail/send` + কপি-পেস্ট করার মতো embeddable HTML ফর্ম (dark/light)
- **হারায় না:** মেসেজ আগে DB তে সেভ, তারপর পাঠানো; ব্যর্থ হলে নিজে আবার চেষ্টা (backoff), সার্ভার ঘুমালেও নিরাপদ
- **Admin:** user/key/email/login history দেখা, block/delete, Super Admin permission (approval) সিস্টেম
- **Notification:** অ্যাপের ভেতরে (unread badge) + ফোনের notification bar (Web Push) + Admin এর জরুরি alert popup
- **Kill switch:** Super admin password → OTP → নিজস্ব password; ১০ মিনিট countdown, তারপর data মুছে নতুন করে চালু
- **PWA:** ফোনে অ্যাপের মতো install করা যায়, offline পেজ আছে
- **Dark / Light theme**

## 🗂 ফোল্ডার

```
backend/
  src/                    Express API (routes → controllers → services → models)
  mail-relay-pythonanywhere.py   Gmail relay (PythonAnywhere এ চলে)
  config.example.py       relay এর সিক্রেটের নমুনা (আসল config.py GitHub এ যায় না)
  .env.example            Node এর সব env এর নমুনা
frontend/                 React অ্যাপ (build হলে Express ই এটা দেখায়)
render.yaml               Render Blueprint
DEPLOY.md                 ধাপে ধাপে deploy গাইড
```

## 🔄 ইমেইল কীভাবে যায়

Render এর free plan এ SMTP বন্ধ, তাই: **Render → (HTTPS) → PythonAnywhere relay → Gmail → ইনবক্স**।
`MAIL_PROVIDER` দিয়ে বেছে নেওয়া যায়: `relay` (ডিফল্ট সুপারিশ), `brevo`, `smtp` (শুধু local)।

## ▶ Local এ চালানো

```bash
cd backend  && cp .env.example .env && npm i && npm run dev     # http://localhost:3000
cd frontend && npm i && npm run dev                              # http://localhost:5173
```

## 🚀 Deploy

[DEPLOY.md](./DEPLOY.md) দেখো। API এর বিস্তারিত: [backend/API.md](./backend/API.md)

## 🔐 নিরাপত্তা নোট

- সব সিক্রেট env তে (Node) বা `config.py` তে (relay) — কোডে বা GitHub এ কিছু নেই
- Rate limit, API key যাচাই, মাসিক লিমিট, bot-check (honeypot), HTML escape করা ইমেইল
- httpOnly + secure cookie, OTP hash করা, Kill switch এ আলাদা password
