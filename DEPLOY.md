# 🚀 Deploy গাইড — Render (একটাই Web Service) + PythonAnywhere (মেইল relay)

## পুরো ছবিটা

```
ভিজিটর ফর্ম পাঠায়
      │
      ▼
Render (Node + React, একটাই service) ──► MongoDB Atlas   (মেসেজ আগে DB তে সেভ → কখনো হারায় না)
      │
      │  HTTPS POST /send  (গোপন secret সহ)
      ▼
PythonAnywhere (Flask relay) ──► Gmail SMTP (465/587) ──► ইনবক্স
```

- **কেন relay?** Render free plan এ SMTP পোর্ট বন্ধ। তাই Render → (HTTPS) → PythonAnywhere → Gmail।
- **কেন প্রতি ১৪ মিনিটে cron নয়?** Render free এর মাসিক ঘণ্টা সীমিত; সারাক্ষণ জাগিয়ে রাখলে একটা প্রজেক্টেই শেষ হয়ে যাবে।
  এখানে server ঘুমাতে পারে। ফর্ম খোলা হলেই server জেগে ওঠে, আর মেসেজ DB তে আগে সেভ হয় বলে কিছুই হারায় না।
  cron-job.org শুধু **দিনে ২ বার** জাগিয়ে আটকে থাকা মেইল আবার পাঠায়।

---

## ধাপ ১ — PythonAnywhere এ relay (একবারের কাজ)

1. Google Account → Security → **2-Step Verification** চালু → **App passwords** থেকে ১৬ অক্ষরের password বানাও।
2. [pythonanywhere.com](https://www.pythonanywhere.com) → **Web → Add a new web app → Flask** (Python 3.10+)।
3. **Files** ট্যাবে app এর ফোল্ডারে (যেমন `/home/USERNAME/mysite/`) দুটো ফাইল রাখো:
   - `flask_app.py` ← `backend/mail-relay-pythonanywhere.py` এর পুরো কোড (এতে কোনো সিক্রেট নেই, GitHub এ তোলা নিরাপদ)
   - `config.py` ← `backend/config.example.py` কপি করে নিজের মান বসাও (**এটা GitHub এ তুলো না**)
     ```python
     GMAIL_USER = "তোমার@gmail.com"
     GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop"
     RELAY_SECRET = "একটা-লম্বা-random-ইংরেজি-লেখা"   # Render এও হুবহু এটাই বসবে
     ```
4. **Web** ট্যাবে **Reload** চাপো।
5. পরীক্ষা (ফোনের ব্রাউজারেই):
   - `https://USERNAME.pythonanywhere.com/health` → `"configured": true` দেখাবে
   - `https://USERNAME.pythonanywhere.com/diag?key=RELAY_SECRET&to=তোমার@gmail.com`
     → প্রতিটা পোর্টের (465, 587) ফলাফল + টেস্ট মেইল। কোথায় আটকাচ্ছে এখান থেকেই বোঝা যাবে।
6. ⏰ free account এ প্রতি ৩ মাসে একবার Web ট্যাবের **"Run until 3 months from today"** চাপতে হবে।

## ধাপ ২ — GitHub

- পুরো প্রজেক্ট push করো (root এ `package.json` + `render.yaml` থাকবে)।
- `.env` আর `config.py` **যাবে না** — `.gitignore` এ আগে থেকেই বন্ধ করা আছে।

## ধাপ ৩ — MongoDB Atlas

- Free cluster → Database Access এ user বানাও → Network Access এ `0.0.0.0/0` যোগ করো (Render এর IP বদলায়)।
- Connect → Drivers থেকে লিংক কপি করো। **যেমন আছে তেমনই বসানো যাবে** (শেষে `?retryWrites=…` থাকলেও চলবে, database নাম কোড নিজে বসায়)।

## ধাপ ৪ — Render

New → **Blueprint** (বা Web Service) → repo বেছে নাও।

| সেটিং | মান |
|---|---|
| Build Command | `npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/v1/mail/ping` |

**Environment Variables** (নমুনা: `backend/.env.example`):

| নাম | মান |
|---|---|
| `MONGODB_URI` | Atlas এর লিংক |
| `MAIL_PROVIDER` | `relay` |
| `MAIL_RELAY_URL` | `https://USERNAME.pythonanywhere.com/send` |
| `MAIL_RELAY_SECRET` | `config.py` এর `RELAY_SECRET` এর হুবহু একই |
| `TRUST_PROXY` | `1` |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `OTP_SECRET`, `CRON_SECRET` | Blueprint দিলে Render নিজে বানায়; নাহলে লম্বা random লেখা |
| `SUPER_ADMIN_EMAIL` | এই ইমেইলে register করলে Super Admin হবে |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | avatar এর জন্য |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | ফোনের notification এর জন্য (`cd backend && npm run vapid`) |
| `KILL_SWITCH_PASSWORD_HASH` | Kill switch এর password এর hash (কমান্ড `.env.example` এ আছে) |

- `CORS_ORIGIN`: ফাঁকা রাখো (frontend আর backend একই origin)।
- `PORT`: **দিও না**, Render নিজে দেয়।
- Frontend এর জন্য আলাদা কোনো env লাগে না।

Deploy শেষে **Logs** এ এই লাইনগুলো দেখা উচিত:
```
[DB] ready — … models synced
[mail] provider = relay
server is running on port 10000
```
`[mail] ⚠ …` লাইন এলে ওটাই বলে দেবে কোন env বাদ পড়েছে।

## ধাপ ৫ — cron-job.org (২টা job)

URL: `https://YOUR-APP.onrender.com/api/v1/system/cron?key=CRON_SECRET_এর_মান`

- Job 1: প্রতিদিন **08:00**, Job 2: প্রতিদিন **20:00** (Timezone: Asia/Dhaka), Method GET।
- সার্ভার ঘুমন্ত থাকলে জাগতে ৩০সে+ লাগে, cron-job.org তখন "failed" দেখালেও সমস্যা নেই — server জেগে যায় আর আটকে থাকা মেইল পাঠানো শুরু হয়।

## শেষ পরীক্ষা (চেকলিস্ট)

- [ ] `…/api/v1/mail/ping` খুললে খালি পেজ (204)
- [ ] Register করলে OTP মেইল আসছে
- [ ] Dashboard এ API key বানিয়ে ফর্ম পাঠালে মেইল আসছে
- [ ] ১৫ মিনিট বসিয়ে রেখে (server ঘুমিয়ে) ফর্ম পাঠালে মেসেজ হারায় না, একটু পরে মেইল আসে

## সমস্যা হলে

| লক্ষণ | কারণ / সমাধান |
|---|---|
| Logs এ `Relay 403: forbidden` | `MAIL_RELAY_SECRET` ≠ `config.py` এর `RELAY_SECRET` |
| `Relay 404` | `MAIL_RELAY_URL` এর শেষে `/send` নেই বা username ভুল |
| `gmail_auth_failed` | App password ভুল, বা 2-Step Verification বন্ধ — নতুন App password বানাও |
| `network_blocked` / `timeout` | `/diag` খুলে দেখো কোন পোর্ট চলছে; দরকার হলে `config.py` তে `SMTP_MODE = "587"` দাও |
| relay URL খুললে বন্ধ/ভুল পেজ | PythonAnywhere এ ৩ মাসের মেয়াদ শেষ — Web ট্যাবে বাড়াও |
| ইনবক্সে আসে না | Spam ফোল্ডার দেখো; Gmail দিনে ~৫০০ মেইল পাঠাতে দেয় |

## Local এ চালাতে
- backend: `cd backend && npm i && npm run dev` (পোর্ট 3000)
- frontend: `cd frontend && npm i && npm run dev`
