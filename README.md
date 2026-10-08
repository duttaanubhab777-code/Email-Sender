# 🚀 Email Sender SaaS (Production-Grade)

A professional, scalable, and premium Email Sender SaaS platform built with modern web technologies. This project focuses on clean code architecture, a custom Glassmorphism UI on the frontend, and a highly secure, service-oriented Node.js/Express architecture on the backend.

## 📌 Project Overview
এই প্রজেক্টটির মূল লক্ষ্য হলো এমন একটি প্ল্যাটফর্ম তৈরি করা যেখান থেকে ইউজাররা API Key জেনারেট করে তাদের নিজস্ব প্রজেক্ট বা অ্যাপ্লিকেশন থেকে ইমেইল পাঠাতে পারবে। ড্যাশবোর্ডে ইউজাররা তাদের ইমেইল পাঠানোর লিমিট, API Key-এর স্ট্যাটাস এবং Usage Track করতে পারবে। 

---

## ✅ What We Have Done So Far (বর্তমান অগ্রগতি)

**1. Frontend Architecture & Routing:**
- প্রোডাকশন-রেডি **Feature-based Folder Structure** তৈরি করা হয়েছে (`src/features`, `src/app`, `src/assets`)।
- `react-router-dom` ইনস্টল করে **SPA Routing** কনফিগার করা হয়েছে (`useNavigate` দিয়ে রিলোড-ফ্রি নেভিগেশন)।

**2. UI & Styling (No Tailwind):**
- Tailwind CSS পুরোপুরি বাদ দিয়ে **Custom CSS** ব্যবহার করে প্রফেশনাল **Glassmorphism (গ্লাস এফেক্ট)** ডিজাইন তৈরি করা হয়েছে।
- একটি প্রিমিয়াম লোগো (`logo.png`) এবং অথেনটিকেশন পেজ (Login/Signup) সম্পূর্ণ রেডি করা হয়েছে।

---

## ⏳ What's Next (পরবর্তী কাজ ও করণীয়)

### 💻 Frontend (React)
- [ ] **Dashboard UI:** ড্যাশবোর্ডের ডিজাইন করা, যেখানে API Key তৈরি এবং কপি করার অপশন থাকবে।
- [ ] **State Management:** লগইন করা ইউজারের ডেটা পুরো অ্যাপে ধরে রাখার জন্য Context API বা Zustand সেটআপ করা।
- [ ] **API Integration:** ব্যাকএন্ডের সাথে ডেটা আদান-প্রদানের জন্য `Axios` এবং ক্যাশিংয়ের জন্য `TanStack Query` ব্যবহার করা।

### ⚙️ Backend (Node.js & MongoDB) - *In-Depth Planning*
ব্যাকএন্ড হবে এই প্রজেক্টের "মস্তিষ্ক"। আমরা এখানে **Service-Oriented Architecture** ফলো করব।

- **Modular Architecture (মডিউলার গঠন):**
  - `routes/`: শুধু API এন্ডপয়েন্টগুলো (যেমন: `/api/auth/login`, `/api/keys/generate`) এখানে থাকবে।
  - `controllers/`: রিকোয়েস্ট রিসিভ করা এবং রেসপন্স (JSON) পাঠানোর লজিক এখানে থাকবে।
  - `services/`: আসল কাজ (যেমন ডাটাবেসে সেভ করা, ইমেইল পাঠানো, API key জেনারেট করা) এখানে থাকবে। এতে কোড রিইউজ করা সহজ হবে।
  
- **Database Design (MongoDB):**
  - **`users` Collection:** ইউজারের নাম, ইমেইল, হ্যাশ করা পাসওয়ার্ড (Bcrypt) এবং সাবস্ক্রিপশন প্ল্যান থাকবে।
  - **`apikeys` Collection:** এখানে ইউজারের তৈরি করা API Key গুলো সেভ থাকবে। প্রতিটি Key-এর সাথে `userId`, `keyString`, `isActive`, এবং সবচেয়ে গুরুত্বপূর্ণ—`usageCount` (কতগুলো ইমেইল পাঠানো হয়েছে তার হিসাব) থাকবে।

- **Core API Features:**
  - [ ] **Auth System:** JWT (JSON Web Token) ভিত্তিক সিকিউর লগইন এবং সাইনআপ। (OTP সিস্টেম আপাতত বন্ধ রাখা হচ্ছে)।
  - [ ] **API Key Generator:** `crypto` মডিউল ব্যবহার করে সিকিউর এবং ইউনিক API Key জেনারেট করার API।
  - [ ] **Email Dispatcher Endpoint:** একটি পাবলিক এন্ডপয়েন্ট (`/api/send`) যেখানে অন্য ডেভেলপাররা তাদের API Key এবং ইমেইলের ডেটা (To, Subject, Body) POST করবে।

---

## 🛠 How We Will Handle It (কাজের কৌশল ও ব্যাকএন্ড হ্যান্ডলিং)

1. **Usage Tracking (লিমিট কন্ট্রোল):** 
   যখনই কেউ ইমেইল পাঠানোর API (`/api/send`) কল করবে, ব্যাকএন্ড প্রথমে চেক করবে API Key-টি ডাটাবেসে আছে কি না এবং অ্যাক্টিভ কি না। সব ঠিক থাকলে ইমেইল সেন্ড হবে এবং সাথে সাথে MongoDB-এর `$inc` অপারেটর ব্যবহার করে `usageCount` ১ বাড়িয়ে দেওয়া হবে। লিমিট পার হয়ে গেলে API 429 (Too Many Requests) বা 403 এরর রিটার্ন করবে।

2. **Middleware Security (নিরাপত্তা বেষ্টনী):**
   - **Auth Guard:** ড্যাশবোর্ডের ডেটা এক্সেস করার আগে `verifyToken` মিডলওয়্যার চেক করবে ইউজার লগইন করা আছে কি না।
   - **API Key Guard:** ইমেইল পাঠানোর রাউটে `verifyApiKey` মিডলওয়্যার বসানো থাকবে, যা ইউজারের পাঠানো Key যাচাই করবে।

3. **Error Handling:** 
   আমরা একটি **Global Error Handler** তৈরি করব। ডাটাবেস ক্র্যাশ বা কোনো লজিক্যাল ভুল হলে অ্যাপ ক্র্যাশ করবে না, বরং ফ্রন্টএন্ডে একটি সুন্দর JSON মেসেজ (যেমন: `{ success: false, message: "Invalid API Key" }`) পাঠিয়ে দেবে।

---

## ⚠️ Potential Challenges (সম্ভাব্য চ্যালেঞ্জ ও সমাধান)

### 1. API Key Abuse & DDoS (ব্যাকএন্ড সিকিউরিটি)
- **সমস্যা:** কেউ যদি API Key পেয়ে যায় বা কোনো বট দিয়ে একসাথে হাজার হাজার ইমেইল রিকোয়েস্ট পাঠায়, তবে সার্ভার ক্র্যাশ করতে পারে।
- **সমাধান:** `express-rate-limit` প্যাকেজ ব্যবহার করে প্রতি মিনিটে রিকোয়েস্ট লিমিট সেট করে দেওয়া হবে।

### 2. Event Loop Blocking (সার্ভার স্লো হয়ে যাওয়া)
- **সমস্যা:** ইমেইল পাঠানো একটি ধীর গতির কাজ (I/O heavy)। একসাথে অনেক রিকোয়েস্ট এলে Node.js-এর ইভেন্ট লুপ ব্লক হয়ে সার্ভার স্লো হতে পারে।
- **সমাধান:** আমরা `async/await` ব্যবহার করে Non-blocking ওয়েতে কাজ করব। ভবিষ্যতে ট্রাফিক বাড়লে ইমেইল পাঠানোর জন্য Message Queue (যেমন: Redis + Bull) ব্যবহার করার আর্কিটেকচার মাথায় রাখব।

### 3. CORS & Preflight Errors (ফ্রন্টএন্ড-ব্যাকএন্ড কানেকশন)
- **সমস্যা:** ফ্রন্টএন্ড এবং ব্যাকএন্ড আলাদা পোর্টে বা সার্ভারে চললে ব্রাউজার সিকিউরিটি ইস্যু (CORS) দেখায়।
- **সমাধান:** ব্যাকএন্ডে `cors` প্যাকেজ এমনভাবে কনফিগার করা হবে যাতে শুধুমাত্র আমাদের ফ্রন্টএন্ডের ডোমেন বা স্পেসিফিক ডোমেন থেকেই রিকোয়েস্ট এক্সেপ্ট করা হয়।

### 4. Data Consistency (ডেটা সিঙ্কিং)
- **সমস্যা:** ড্যাশবোর্ডে API usage count রিয়েল-টাইমে আপডেট না হলে ইউজার কনফিউজড হতে পারে।
- **সমাধান:** TanStack Query-এর `invalidateQueries` ব্যবহার করে যখনই নতুন কোনো একশন হবে, ব্যাকএন্ড থেকে ফ্রেশ ডেটা রিফেচ করে UI আপডেট করা হবে।

---
*Architected and Developed with ❤️ by Anubhab Dutta*