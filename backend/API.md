# Backend API — নতুন/পরিবর্তিত অংশ

সব response: `{ statusCode, success, message, data }`। Error: `{ statusCode, success:false, message, errors }`।
OTP: ৬ সংখ্যা, ১০ মিনিট মেয়াদ, ৫ বার ভুল করলে বাতিল, resend ৩০ সেকেন্ড পর (429 + `Retry-After`)।

## Auth (`/api/v1/users`) — OTP শুধু register, forgot password আর kill switch এ
| Method | Path | Body | কাজ |
|---|---|---|---|
| POST | /register (multipart) | fullName, email, password, username?, avatar? | OTP পাঠায়। username না দিলে @ এর আগের অংশ |
| POST | /register/verify | email, otp | account তৈরি + login |
| POST | /login | identifier (email/username), password | সরাসরি token দেয় (OTP নেই) |
| POST | /forgot-password | email | OTP পাঠায় (email থাকুক বা না থাকুক একই উত্তর) |
| POST | /forgot-password/reset | email, otp, newPassword | password বদলায়, সব session শেষ |
| POST | /otp/resend | purpose (register/forgot_password), email | নতুন OTP (৩০ সেকেন্ড পর) |
| GET | /check-username?username=x / ?email=x@y.com | | available কিনা / suggested username |
| PATCH | /update-account | fullName?, username? | username বদলানো যাবে |

## Roles
- **বেসিক (Admin + Super Admin সরাসরি):** stats, users list, user block/unblock, user delete
- **এক্সট্রা (Super Admin সরাসরি, Admin হলে approval লাগবে):** create-admin, make-admin, remove-admin, অন্য admin কে block/delete, kill switch

## Admin (`/api/v1/admin`)
GET /stats · GET /users · PATCH /users/:id/block `{isBlocked?}` · DELETE /users/:id
POST /create-admin `{fullName,email,password,username?}` · PUT /make-admin `{targetEmail}` · PUT /remove-admin `{targetEmail}`
Admin হলে এক্সট্রা কাজে body তে `approvalId` (বা header `x-approval-id`) দিতে হবে।

## Approvals (`/api/v1/approvals`)
- POST / `{action, target, reason?}` (Admin) — action: create_admin, make_admin (target = email); remove_admin, block_admin, delete_admin (target = user id); kill_switch (`targets: [...]`)
- GET /?status= — Super Admin সব দেখে, Admin নিজেরগুলো
- PATCH /:id/approve `{password}` (Super Admin) — ৩০ মিনিট, একবার ব্যবহারযোগ্য
- PATCH /:id/deny `{note?}` (Super Admin)

## Kill switch (`/api/v1/kill-switch`)
1. POST /start `{password, targets:[...], approvalId? (Admin)}` → `sessionId`
2. POST /confirm `{sessionId, answer:"yes"}` → OTP যায় (yes ছাড়া কিছু দিলে বাতিল)
3. POST /verify-otp `{sessionId, otp}` (POST /resend-otp আছে)
4. POST /execute `{sessionId, answer:"yes", killPassword}` → countdown শুরু

GET /options — targets: submissions, apiKeys, users, admins, media, database, code, everything।
Countdown শুরু হলে cancel করার কোনো route নেই। পুরো সাইট 503 দেয়; শুধু `GET /api/v1/system/status` (public) খোলা থাকে:
`{active, status, endsAt, remainingSeconds}` — frontend এটা দিয়ে timer দেখাবে।
শেষ হলে ডিলিট চলে, তারপর system ফাঁকা অবস্থায় নতুন করে চালু (`code` ডিলিট করলে process বন্ধ হয়ে যায়)।

## নতুন .env — `.env.example` দেখুন
KILL_SWITCH_PASSWORD_HASH, KILL_ALLOW_CODE_DELETE, KILL_DRY_RUN, KILL_COUNTDOWN_SECONDS, OTP_SECRET, TRUST_PROXY

## অন্যান্য ফিক্স
- cloudinary.js: `deleteFromCloudinary` ভুলভাবে ভিতরে ঢুকে ছিল (export এ error হতো) — ঠিক করা হয়েছে
- block করা user এখন login/refresh/পুরনো token কিছুতেই ঢুকতে পারবে না
- সব error JSON আকারে আসে; update-account এ আর refreshToken ফেরত যায় না
- `apiKey.middleware.js`: মাসিক limit এখন কাজ করে (এই মাসে পাঠানো email গুনে `user.monthlyEmailLimit` এর সাথে মেলায়), block করা মালিকের key ও বন্ধ
