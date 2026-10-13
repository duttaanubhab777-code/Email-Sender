# Render এ deploy (একটাই Web Service — frontend + backend একসাথে)

## কী কী লাগবে (install নিজে করতে হবে না, Render build এ নিজেই হয়)
- GitHub এ এই প্রজেক্ট (root এ `package.json` + `render.yaml` থাকবে)
- MongoDB Atlas (free) — connection string (`MONGODB_URI`, শেষে `/` বা database নাম ছাড়া)
- ইমেইল পাঠানোর জন্য যেকোনো একটা: Brevo (API key) অথবা Gmail relay (`backend/mail-relay.gs` — domain/ফোন verify লাগে না)
- Cloudinary account (avatar এর জন্য)
- cron-job.org account (free)

## Render সেটিং
New → Web Service → repo বেছে নিন (বা Blueprint দিয়ে `render.yaml`)
- Build Command: `npm run build`
- Start Command: `npm start`
- Health Check Path: `/api/v1/mail/ping`
- Environment Variables: `backend/.env.eaxmple` এর মতো সব (বিশেষ করে `MONGODB_URI`,
  `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `BREVO_API_KEY`, `MAIL_FROM`, `TRUST_PROXY=1`,
  `CRON_SECRET`, `SUPER_ADMIN_EMAIL`, Cloudinary ৩টা, VAPID ২টা + `VAPID_SUBJECT`)
- `CORS_ORIGIN` = Render এর নিজের URL (বা ফাঁকা রাখুন; একই origin তাই লাগে না)
- Frontend এর জন্য আলাদা কোনো env লাগে না (API একই origin এ `/api/v1`)

## cron-job.org (২টা job)
URL: `https://YOUR-APP.onrender.com/api/v1/system/cron?key=CRON_SECRET_এর_মান`
- Job 1: প্রতিদিন 08:00, Job 2: প্রতিদিন 20:00 (Timezone: Asia/Dhaka)
- Method GET। Timeout ছোট হলে সমস্যা নেই (সার্ভার সঙ্গে সঙ্গে 202 দেয়, কাজ ব্যাকগ্রাউন্ডে)
- ঘুমন্ত server জাগতে ৩০সে+ লাগলে cron-job.org "failed" দেখাতে পারে — তবু server জেগে যায় এবং retry চলে

## Local এ চালাতে
- backend: `cd backend && npm i && npm run dev` (পোর্ট 3000)
- frontend: `cd frontend && npm i && npm run dev`
