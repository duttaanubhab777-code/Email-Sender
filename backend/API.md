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

## Admin: keys & login history (`/api/v1/admin`) — Admin + Super Admin দুজনেই
- GET /directory?q=&role=&page=&limit= — সব ইউজারের email + তাদের API key (key সহ)। `q` দিয়ে নাম/email/username/API key খোঁজা যায়
  → `{items:[{_id, fullName, username, email, role, isBlocked, apiKeys:[{name,key,isActive,usageCount}]}], total, page, limit, totalPages}`
- GET /login-history?q=&userId=&page=&limit= — সব ইউজারের login, নতুনটা আগে (প্রতি ইউজারের সর্বশেষ ২০টা)
  → `{items:[{userId, fullName, username, email, ipAddress, loginTime}], total, page, limit, totalPages}`। `q` দিয়ে নাম/email/IP খোঁজা যায়

## Admin: সব ইউজারের email (`/api/v1/admin`) — Admin + Super Admin
- GET /emails?q=&status=sent|failed&userId=&page=&limit= — সব ইউজারের API key দিয়ে আসা email (sender, subject, message, IP, কোন ইউজার/API key)
  → `{items:[{_id, senderName, senderEmail, receiverEmail, subject, message, ipAddress, sourceUrl, status, createdAt, owner:{...}, apiKeyName}], total, sent, failed, page, limit, totalPages}`

## Notifications (`/api/v1/notifications`) — লগইন করা যেকোনো ইউজার (শুধু নিজের)
- GET / ?filter=all|unread&page=&limit= → `{items, total, unreadCount, page, limit, totalPages}`
- GET /unread-count → `{unreadCount, pendingAlerts}` (ঘণ্টার ব্যাজ + পপআপে দেখানোর বাকি Admin নোটিশ)
- PATCH /read-all — সব পড়া হয়েছে চিহ্নিত
- PATCH /:id/read — একটা পড়া হয়েছে চিহ্নিত
- DELETE /:id — একটা মুছে ফেলা
কখন তৈরি হয়: email এলে (key এর মালিক + সব Admin), approval চাওয়া হলে (Super Admin), approve/deny হলে (যে চেয়েছে), নতুন ইউজার এলে (Admin), ইউজার block/unblock/delete হলে (অন্য Admin), Admin বানানো/সরানো হলে, API key তৈরি/মোছা, password বদলালে। ৬০ দিন পর নিজে থেকেই মুছে যায়।

### Admin নোটিশ পপআপ (`alert: true` notification)
- GET /alerts/pending → `{items}` — যেসব নোটিশে ইউজার এখনো পপআপে OK চাপেনি (পুরনোটা আগে, সর্বোচ্চ ১০)
- PATCH /:id/ack — OK চাপা হয়েছে (পড়া + স্বীকৃত দুটোই চিহ্নিত হয়, পপআপ আর আসে না)

### ফোনের notification bar (Web Push, VAPID)
- GET /push/config → `{enabled, publicKey}`
- POST /push/subscribe — body: browser এর `PushSubscription.toJSON()` (`{endpoint, keys:{p256dh, auth}}`)। endpoint শুধু পরিচিত push service এর (FCM, Mozilla, Apple, Windows) হতে হবে
- POST /push/unsubscribe — body: `{endpoint}` (logout / বন্ধ করার সময়, যাতে একই ফোনে অন্য ইউজার ঢুকলে আগের জনের notification না আসে)
- POST /push/test — নিজের সব ডিভাইসে টেস্ট notification (১০ মিনিটে ৫ বার)
প্রতিটা notification তৈরি হলেই (email, approval, ইত্যাদি) সেই ইউজারের সব ডিভাইসে নিজে থেকে push যায়, লোগো + কী হয়েছে + কেন এসেছে সহ। `.env` তে VAPID key না থাকলে শুধু push বন্ধ থাকে, বাকি সব চলে।

## Admin: গুরুত্বপূর্ণ নোটিশ পাঠানো (`/api/v1/admin/broadcast`) — Admin + Super Admin দুজনেই সরাসরি (approval লাগে না)
- POST /broadcast — body: `{audience: "users"|"everyone"|"admins"|"user", targetEmail?, title (৩–৮০), message (৩–৫০০)}`
  → প্রাপক পায়: bell notification + ফোনের notification bar + screen এ ৫ সেকেন্ডের পপআপ (OK চাপা পর্যন্ত থাকে)। block করা ইউজার ও প্রেরক নিজে বাদ। ঘণ্টায় ২০টা পর্যন্ত
  → `201 {_id, title, message, audience, recipientCount, pushSent, ...}`
- GET /broadcast?limit= → `{items:[{..., recipientCount, pushSent, acknowledged}]}` — আগের নোটিশ, কতজন পেল, কতজন OK চাপল
এই পপআপ **শুধু** Admin এর পাঠানো নোটিশেই আসে; সাধারণ notification এ আসে না।

## Kill switch এর পরে স্বয়ংক্রিয় recovery
`dropDatabase` এর পর server নিজেই সব collection + index আবার বানায় (`prepareDatabase`), rate-limit ও mail connection রিসেট করে, তারপরেই সাইট খোলে। হাতে restart লাগে না। server চালু হওয়ার সময়ও একই কাজ হয়, তাই fresh database এ deploy করলেও আলাদা কিছু করতে হয় না।

## নতুন .env — `.env.example` দেখুন
KILL_SWITCH_PASSWORD_HASH, KILL_ALLOW_CODE_DELETE, KILL_DRY_RUN, KILL_COUNTDOWN_SECONDS, OTP_SECRET, TRUST_PROXY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

## অন্যান্য ফিক্স
- cloudinary.js: `deleteFromCloudinary` ভুলভাবে ভিতরে ঢুকে ছিল (export এ error হতো) — ঠিক করা হয়েছে
- block করা user এখন login/refresh/পুরনো token কিছুতেই ঢুকতে পারবে না
- সব error JSON আকারে আসে; update-account এ আর refreshToken ফেরত যায় না
- `apiKey.middleware.js`: মাসিক limit এখন কাজ করে (এই মাসে পাঠানো email গুনে `user.monthlyEmailLimit` এর সাথে মেলায়), block করা মালিকের key ও বন্ধ

---

## Mail delivery — how `POST /api/v1/mail/send` behaves now

- The message is saved to the database first, then the API answers right away with **202 Accepted**
  (`data.status` is `"pending"`). Sending happens in the background.
- Failed sends are retried automatically (30s, 2m, 10m, 30m, 2h, 6h, 12h — 8 attempts). Status goes
  `pending → sending → sent`, or `failed` after the last attempt (the message always stays in the database).
- Send a unique `submissionId` (8–64 chars: letters, digits, `_`, `-`) to make retries safe: the same id
  never creates a second email.
- Optional `pageUrl` (full link of the page the form was filled on, e.g. `http://localhost:5173/contact?ref=x`).
  It is saved as `sourceUrl`, shown in the email (SOURCE PAGE row), the dashboard and the admin panel.
  If `pageUrl` is missing, the `Referer` / `Origin` header is used instead (browsers usually send only
  `http://host:port` cross-site, so add `pageUrl` to get the full path). Only `http(s)` links are accepted.
- `GET /api/v1/mail/ping` returns `204` — call it when a form opens to wake a sleeping host.
