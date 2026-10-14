import { BASE_URL } from "../services/api";

// Cloudinary তে আপলোড করা badge logo (ছবি যেন কখনো না ভাঙে)।
// ফর্মের হেডারে বড় করে দেখানো হয় (160px), তাই আগের 64px এর বদলে বড় সাইজ চাওয়া হয়েছে।
// বড় সাইজ না পেলে নিজে থেকে আগের ছোট লিংকে ফিরে যায় (onerror fallback)।
export const LOGO_URL =
    "https://res.cloudinary.com/khvkgpxq/image/upload/v1791965885/badge-logo-320.png";
export const LOGO_FALLBACK =
    "https://res.cloudinary.com/khvkgpxq/image/upload/w_64,h_64,c_fit,f_auto,q_auto/v1791551108/badge-logo.png";

const DARK = `--es-bg:#0b1730;--es-bd:#1c3560;--es-tx:#e8f0ff;--es-mu:#93a9cf;--es-in:#071126;--es-inb:#2a4676;--es-ac:#3d94ff;--es-ac2:#22d0ff;--es-or:#ff8a2a;--es-or2:#ffb347;--es-ring:rgba(61,148,255,.3);--es-err:#ff7b7b;--es-sh:0 24px 60px rgba(0,0,0,.55);--es-link:#7ab8ff;`;

export const ES_CSS = `.es-form{--es-bg:#fff;--es-bd:#dde7f6;--es-tx:#0a1b33;--es-mu:#5f7396;--es-in:#f6f9ff;--es-inb:#c9d8ee;--es-ac:#1a6dff;--es-ac2:#19c3ff;--es-or:#ff6a00;--es-or2:#ffa11f;--es-ring:rgba(26,109,255,.2);--es-err:#d92d38;--es-sh:0 18px 50px rgba(20,70,170,.14);--es-link:#0b57c4}
@media (prefers-color-scheme:dark){.es-form:not([data-theme="light"]){${DARK}}}
.es-form[data-theme="dark"]{${DARK}}
.es-form,.es-form *{box-sizing:border-box}
.es-form{position:relative;max-width:480px;margin:0 auto;padding:30px 28px 20px;overflow:hidden;color:var(--es-tx);background:var(--es-bg);border:1px solid var(--es-bd);border-radius:24px;box-shadow:var(--es-sh);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;transition:background .25s,border-color .25s;animation:es-in .75s cubic-bezier(.22,1,.36,1) both}
.es-form::before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,var(--es-ac),var(--es-ac2),var(--es-or2),var(--es-or),var(--es-ac));background-size:300% 100%;animation:es-bar 6s linear infinite}
.es-form::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(260px 200px at 100% 0,rgba(255,122,26,.13),transparent 70%),radial-gradient(280px 220px at 0 100%,rgba(26,109,255,.14),transparent 70%)}
.es-form>*{position:relative;z-index:1}
@supports (background:linear-gradient(in oklch,red,blue)){.es-form::before{background-image:linear-gradient(90deg in oklch,var(--es-ac),var(--es-ac2),var(--es-or2),var(--es-or),var(--es-ac))}}
@keyframes es-in{from{opacity:0;transform:translateY(18px) scale(.98)}to{opacity:1;transform:none}}
@keyframes es-bar{to{background-position:300% 0}}
@keyframes es-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes es-float{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-7px) rotate(2deg)}}
.es-head{text-align:center;margin:2px 0 22px;animation:es-up .6s .05s both}
.es-logo{display:block;width:104px;height:104px;margin:-4px auto 4px;object-fit:contain;filter:drop-shadow(0 12px 20px rgba(26,109,255,.38));animation:es-float 4.2s ease-in-out infinite}
.es-title{margin:0;font-size:26px;font-weight:800;letter-spacing:-.02em;line-height:1.2;background:linear-gradient(100deg,var(--es-ac),var(--es-ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.es-sub{margin:6px 0 0;font-size:14px;color:var(--es-mu)}
.es-field{margin-bottom:16px;animation:es-up .6s var(--d,.12s) both}
.es-field label{display:flex;align-items:center;justify-content:space-between;margin-bottom:7px;font-size:13.5px;font-weight:700;transition:color .2s}
.es-field:focus-within label{color:var(--es-ac)}
.es-ctl{position:relative}
.es-ico{position:absolute;left:14px;top:15px;width:18px;height:18px;fill:none;stroke:var(--es-mu);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;pointer-events:none;transition:stroke .2s,transform .3s}
.es-field:focus-within .es-ico{stroke:var(--es-or);transform:scale(1.14)}
.es-field input,.es-field textarea{display:block;width:100%;padding:13px 14px 13px 42px;font:inherit;font-size:16px;color:var(--es-tx);background:var(--es-in);border:1.5px solid var(--es-inb);border-radius:14px;outline:none;transition:border-color .2s,box-shadow .25s,background .2s,transform .2s}
.es-field input::placeholder,.es-field textarea::placeholder{color:var(--es-mu);opacity:.65}
.es-field input:focus,.es-field textarea:focus{border-color:var(--es-ac);box-shadow:0 0 0 4px var(--es-ring);transform:translateY(-1px)}
.es-field textarea{min-height:128px;resize:vertical}
.es-count{font-size:11.5px;font-weight:500;color:var(--es-mu)}
.es-hint{display:none;margin-top:5px;font-size:12.5px;color:var(--es-err)}
.es-field.touched input:invalid,.es-field.touched textarea:invalid{border-color:var(--es-err)}
.es-field.touched input:invalid~.es-hint,.es-field.touched textarea:invalid~.es-hint{display:block}
.es-msg{display:none;margin:0 0 14px;padding:11px 14px;font-size:14px;color:var(--es-err);border:1px solid var(--es-err);border-radius:12px}
.es-msg.show{display:block;animation:es-up .3s both}
.es-btn{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px 18px;font:inherit;font-size:16px;font-weight:800;letter-spacing:.01em;color:#fff;background:linear-gradient(110deg,var(--es-ac),var(--es-ac2),var(--es-ac));background-size:220% 100%;border:0;border-radius:14px;cursor:pointer;box-shadow:0 10px 22px var(--es-ring);transition:transform .15s,box-shadow .25s,background-position .5s;animation:es-up .6s .35s both}
.es-btn::after{content:"";position:absolute;top:0;bottom:0;left:-70%;width:45%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-20deg);animation:es-shine 3.4s ease-in-out infinite 1s}
@keyframes es-shine{0%,55%{left:-70%}100%{left:140%}}
.es-btn:hover{transform:translateY(-2px);background-position:100% 0;box-shadow:0 14px 28px rgba(255,106,0,.32)}
.es-btn:active{transform:translateY(0)}
.es-btn svg{width:19px;height:19px;fill:#fff;transition:transform .35s}
.es-btn:hover svg{transform:translate(4px,-3px) rotate(-8deg)}
.es-btn:disabled{opacity:.85;cursor:progress;transform:none}
.es-form.is-busy .es-btn svg{animation:es-take .9s ease-in infinite}
@keyframes es-take{0%{transform:translate(0,0)}70%{transform:translate(26px,-18px);opacity:0}71%{transform:translate(-18px,12px);opacity:0}100%{transform:translate(0,0);opacity:1}}
.es-hp{position:absolute;left:-9999px;width:0;height:0;opacity:0}
.es-done{display:none;position:relative;text-align:center;padding:10px 0 6px;outline:none}
.es-form.is-sent .es-body{display:none}
.es-form.is-sent .es-done{display:block;animation:es-up .5s both}
.es-done svg.es-tick{width:84px;height:84px;margin-bottom:8px}
.es-done circle{fill:rgba(26,109,255,.08);stroke:var(--es-ac);stroke-width:2.5;stroke-dasharray:145;stroke-dashoffset:145;animation:es-draw .7s ease forwards}
.es-done path{fill:none;stroke:var(--es-or);stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:40;stroke-dashoffset:40;animation:es-draw .45s .55s ease forwards}
@keyframes es-draw{to{stroke-dashoffset:0}}
.es-sparks{position:absolute;left:50%;top:44px;width:0;height:0}
.es-sparks i{position:absolute;left:-4px;top:-4px;width:8px;height:8px;border-radius:50%;background:var(--es-ac);opacity:0;animation:es-burst .95s .55s ease-out forwards}
.es-sparks i:nth-child(even){background:var(--es-or)}
@keyframes es-burst{0%{opacity:1;transform:rotate(var(--a)) translateY(-30px) scale(1)}100%{opacity:0;transform:rotate(var(--a)) translateY(-70px) scale(.3)}}
.es-done h3{margin:0 0 6px;font-size:23px;font-weight:800;background:linear-gradient(100deg,var(--es-ac),var(--es-ac2));-webkit-background-clip:text;background-clip:text;color:transparent}
.es-done p{margin:0 auto 18px;max-width:300px;font-size:15px;line-height:1.6;color:var(--es-mu)}
.es-again{padding:10px 18px;font:inherit;font-size:14px;font-weight:700;color:var(--es-tx);background:transparent;border:1.5px solid var(--es-inb);border-radius:12px;cursor:pointer;transition:.2s}
.es-again:hover{border-color:var(--es-ac);color:var(--es-ac);transform:translateY(-1px)}
.es-badge{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:18px;padding-top:14px;border-top:1px dashed var(--es-bd);font-size:12.5px;color:var(--es-mu);text-decoration:none}
.es-badge img{width:34px;height:34px;object-fit:contain;transition:transform .4s}
.es-badge:hover img{transform:rotate(-10deg) scale(1.12)}
.es-badge b{font-size:14px;font-weight:800;color:var(--es-ac)}
.es-badge b span{color:var(--es-or)}
@media (max-width:420px){.es-form{padding:26px 18px 18px;border-radius:20px}}
@media (prefers-reduced-motion:reduce){.es-form,.es-form *,.es-form::before{animation-duration:.001ms!important;transition-duration:.001ms!important}}`;

// fetch দিয়ে পাঠায় (redirect নেই)। URLSearchParams = urlencoded body, যা ব্যাকএন্ডের express.urlencoded() পড়তে পারে
export const ES_JS = `(function () {
  var form = document.getElementById("es-form");
  var msg = form.querySelector(".es-msg");
  var btn = form.querySelector(".es-btn");
  var btnText = btn.querySelector(".es-btn-t");
  var label = btnText.textContent;
  var area = form.querySelector("textarea");
  var count = form.querySelector(".es-count");
  var OUTBOX = "es-outbox";
  var RETRY = [3000, 8000, 20000, 45000, 90000];

  function uid() {
    try { return crypto.randomUUID(); } catch (e) {}
    return "es" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
  }
  function load() {
    try { return JSON.parse(localStorage.getItem(OUTBOX)) || []; } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(OUTBOX, JSON.stringify(list)); } catch (e) {}
  }
  function drop(id) { save(load().filter(function (m) { return m.id !== id; })); }

  // ফর্ম খোলা/ফোকাস হওয়া মাত্র সার্ভারকে জাগিয়ে দেয় (hosting ঘুমিয়ে থাকলে) — পূরণ শেষ হওয়ার আগেই সে তৈরি
  var warmed = false;
  function warm() {
    if (warmed) return;
    warmed = true;
    try { fetch(form.action.replace(/send$/, "ping"), { mode: "no-cors", cache: "no-store" }); } catch (e) {}
  }
  form.addEventListener("focusin", warm);
  form.addEventListener("pointerdown", warm);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en, ob) {
      if (en[0].isIntersecting) { warm(); ob.disconnect(); }
    }).observe(form);
  }

  function updateCount() {
    if (area && count) count.textContent = area.value.length + " / " + (area.maxLength > 0 ? area.maxLength : 1000);
  }
  if (area) { area.addEventListener("input", updateCount); updateCount(); }

  function touch(el) {
    var f = el.closest(".es-field");
    if (f) f.classList.add("touched");
  }
  form.querySelectorAll("input,textarea").forEach(function (el) {
    el.addEventListener("blur", function () { touch(el); });
  });
  form.addEventListener("invalid", function (e) { touch(e.target); }, true);

  // একই submissionId দিয়ে বারবার পাঠানো নিরাপদ — সার্ভার duplicate ধরে ফেলে
  function post(item) {
    var body = typeof item.body === "string" ? new URLSearchParams(item.body) : item.body;
    return fetch(item.action, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: body,
      keepalive: body.toString().length < 60000
    }).then(function (res) {
      if (res.ok) return { ok: true };
      // 400-403 = ফর্ম/কী ঠিক নেই, আবার চেষ্টা করে লাভ নেই
      return { ok: false, final: res.status >= 400 && res.status <= 403, status: res.status };
    }, function () { return { ok: false, final: false, status: 0 }; });
  }

  function deliver(item, n) {
    return post(item).then(function (r) {
      if (r.ok || r.final) { drop(item.id); return r; }
      if (n >= RETRY.length) return r; // outbox এ থাকে, পরের বার পেজ খুললে আবার চেষ্টা হবে
      return new Promise(function (ok) { setTimeout(ok, RETRY[n]); }).then(function () {
        return deliver(item, n + 1);
      });
    });
  }

  // আগের বার যা পাঠানো যায়নি (ট্যাব বন্ধ/অফলাইন ছিল) পেজ খুলতেই আবার পাঠায়
  var DAY = 24 * 3600 * 1000;
  load().forEach(function (item) {
    if (Date.now() - item.t > DAY) return drop(item.id);
    if (item.action === form.action) deliver(item, 1);
  });

  function showSent() {
    form.reset();
    updateCount();
    form.querySelectorAll(".touched").forEach(function (f) { f.classList.remove("touched"); });
    form.classList.add("is-sent");
    form.querySelector(".es-done").focus();
  }
  function fail(r) {
    msg.textContent = r.status === 0 ? "Network error. Please check your connection."
      : r.status === 429 ? "Too many messages. Please try again in a little while."
      : r.status === 401 || r.status === 403 ? "This form is not set up correctly."
      : "Something went wrong. Please try again.";
    msg.classList.add("show");
  }
  function idle() {
    form.classList.remove("is-busy");
    btn.disabled = false;
    btnText.textContent = label;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.classList.remove("show");
    form.classList.add("is-busy");
    btn.disabled = true;
    btnText.textContent = "Sending...";

    var data = new FormData(form);
    var id = uid();
    data.set("submissionId", id);
    var item = { id: id, action: form.action, body: new URLSearchParams(data), t: Date.now() };
    // সার্ভার ঘুমন্ত থাকলে জাগতে সময় লাগতে পারে — মেসেজটা আগে ফোনে/ব্রাউজারে সুরক্ষিত রাখি
    var list = load();
    list.push({ id: id, action: item.action, body: item.body.toString(), t: item.t });
    save(list);

    var settled = false;
    function finish(r) {
      if (settled) return;
      settled = true;
      if (r.ok) showSent(); else fail(r);
      idle();
    }

    // সাধারণত ১-২ সেকেন্ডেই সার্ভার সাড়া দেয়। ২.৫ সেকেন্ডে না দিলে ভিজিটরকে আটকে না রেখে
    // "পাঠানো হয়েছে" দেখাই; আসল পাঠানো ব্যাকগ্রাউন্ডে retry সহ চলতে থাকে।
    var timer = setTimeout(function () { finish({ ok: true }); }, 2500);
    deliver(item, 0).then(function (r) {
      clearTimeout(timer);
      if (!settled) finish(r);
    });
  });

  form.querySelector(".es-again").addEventListener("click", function () {
    form.classList.remove("is-sent");
  });
})();`;

// Preview তে আসল request যায় না — শুধু সফল হওয়ার অ্যানিমেশন দেখায়
const PREVIEW_JS = `(function(){var f=document.getElementById("es-form");var a=f.querySelector("textarea"),c=f.querySelector(".es-count");function u(){if(a&&c)c.textContent=a.value.length+" / "+(a.maxLength>0?a.maxLength:1000)}if(a){a.addEventListener("input",u);u()}f.addEventListener("submit",function(e){e.preventDefault();f.classList.add("is-sent");f.querySelector(".es-done").focus()});f.querySelectorAll("input,textarea").forEach(function(el){el.addEventListener("blur",function(){var p=el.closest(".es-field");if(p)p.classList.add("touched")})});f.querySelector(".es-again").addEventListener("click",function(){f.classList.remove("is-sent")})})();`;

const ICON = {
    user: `<svg class="es-ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
    mail: `<svg class="es-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>`,
    tag: `<svg class="es-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.2"/></svg>`,
    chat: `<svg class="es-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/></svg>`
};

export const buildForm = ({ key, action, theme, logo, home }) => {
    const onErr = `if(this.dataset.f){this.style.display='none'}else{this.dataset.f=1;this.src='${LOGO_FALLBACK}'}`;
    return `<form class="es-form" id="es-form" data-theme="${theme}" action="${action}" method="POST">
  <div class="es-head">
    <img class="es-logo" src="${logo}" alt="Email Sender" width="104" height="104" onerror="${onErr}">
    <h2 class="es-title">Get in touch</h2>
    <p class="es-sub">Send us a message and we will reply soon.</p>
  </div>

  <div class="es-body">
    <input type="hidden" name="access_key" value="${key}">
    <input type="text" name="botcheck" class="es-hp" tabindex="-1" autocomplete="off" aria-hidden="true">

    <div class="es-field" style="--d:.15s">
      <label for="es-name">Name</label>
      <div class="es-ctl">${ICON.user}<input id="es-name" type="text" name="name" placeholder="John Doe" autocomplete="name" required><small class="es-hint">Please enter your name</small></div>
    </div>
    <div class="es-field" style="--d:.22s">
      <label for="es-email">Email</label>
      <div class="es-ctl">${ICON.mail}<input id="es-email" type="email" name="email" placeholder="john@example.com" autocomplete="email" required><small class="es-hint">Enter a valid email address</small></div>
    </div>
    <div class="es-field" style="--d:.29s">
      <label for="es-subject">Subject</label>
      <div class="es-ctl">${ICON.tag}<input id="es-subject" type="text" name="subject" placeholder="How can we help?" required><small class="es-hint">Add a short subject</small></div>
    </div>
    <div class="es-field" style="--d:.36s">
      <label for="es-message">Message <span class="es-count">0 / 1000</span></label>
      <div class="es-ctl ta">${ICON.chat}<textarea id="es-message" name="message" rows="5" maxlength="1000" placeholder="Write your message..." required></textarea><small class="es-hint">Write a few words</small></div>
    </div>

    <p class="es-msg" role="alert"></p>
    <button type="submit" class="es-btn"><span class="es-btn-t">Send message</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 21 4l-7.5 17-2.4-7.1L3 11.5z"/></svg></button>
  </div>

  <div class="es-done" role="status" aria-live="polite" tabindex="-1">
    <div class="es-sparks" aria-hidden="true"><i style="--a:0deg"></i><i style="--a:45deg"></i><i style="--a:90deg"></i><i style="--a:135deg"></i><i style="--a:180deg"></i><i style="--a:225deg"></i><i style="--a:270deg"></i><i style="--a:315deg"></i></div>
    <svg class="es-tick" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 14-16"/></svg>
    <h3>Message sent!</h3>
    <p>Thank you for reaching out. We will get back to you soon.</p>
    <button type="button" class="es-again">Send another message</button>
  </div>

  <a class="es-badge" href="${home}" target="_blank" rel="noopener">
    Powered by <img src="${logo}" alt="" onerror="${onErr}"> <b>Email <span>Sender</span></b>
  </a>
</form>`;
};

// অন্য সাইটে বসানো হবে, তাই সবসময় পুরো (absolute) URL
export const endpoint = () =>
    new URL(`${BASE_URL}/mail/send`, window.location.origin).href;

// ড্যাশবোর্ডের ট্যাব: ওয়েবসাইট বানানোর সব জনপ্রিয় ভাষা/ফ্রেমওয়ার্ক
export const SNIPPET_TABS = [
    { id: "styled", label: "HTML form" },
    { id: "plain", label: "Plain HTML" },
    { id: "js", label: "JavaScript" },
    { id: "react", label: "React" },
    { id: "next", label: "Next.js" },
    { id: "node", label: "Node.js" },
    { id: "php", label: "PHP" },
    { id: "python", label: "Python" },
    { id: "java", label: "Java" },
    { id: "csharp", label: "C#" },
    { id: "go", label: "Go" },
    { id: "ruby", label: "Ruby" },
    { id: "dart", label: "Dart / Flutter" },
    { id: "curl", label: "cURL" }
];

export function buildSnippet(tab, key, theme) {
    const url = endpoint();
    if (tab === "styled") {
        return `<!-- Email Sender contact form -->
<style>
${ES_CSS}
</style>

${buildForm({ key, action: url, theme, logo: LOGO_URL, home: window.location.origin })}

<script>
${ES_JS}
</script>`;
    }
    if (tab === "plain") {
        return `<!-- Email Sender contact form (unstyled: add your own CSS) -->
<form action="${url}" method="POST">
  <input type="hidden" name="access_key" value="${key}">
  <input type="hidden" name="redirect" value="https://your-site.com/thank-you">
  <input type="text" name="botcheck" style="position:absolute;left:-9999px;opacity:0" tabindex="-1" autocomplete="off" aria-hidden="true">

  <label>Name <input type="text" name="name" required></label>
  <label>Email <input type="email" name="email" required></label>
  <label>Subject <input type="text" name="subject" required></label>
  <label>Message <textarea name="message" rows="5" required></textarea></label>

  <button type="submit">Send message</button>
</form>`;
    }
    if (tab === "js") {
        return `const res = await fetch("${url}", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": "${key}" },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    subject: "Hello",
    message: "Sent from my app"
  })
});
const data = await res.json();
console.log(res.status, data.message);`;
    }
    if (tab === "react") {
        return `// React contact form (works with Vite, CRA, Remix ...)
import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setStatus("sending");
    try {
      const res = await fetch("${url}", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": "${key}" },
        body: JSON.stringify(Object.fromEntries(new FormData(form)))
      });
      if (!res.ok) throw new Error("Request failed: " + res.status);
      form.reset();
      setStatus("sent");
    } catch (err) {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Your name" required />
      <input name="email" type="email" placeholder="you@example.com" required />
      <input name="subject" placeholder="Subject" required />
      <textarea name="message" rows={5} placeholder="Message" required />
      <button disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
      {status === "sent" && <p>Message sent. Thank you!</p>}
      {status === "error" && <p>Something went wrong. Please try again.</p>}
    </form>
  );
}`;
    }
    if (tab === "next") {
        return `// Next.js (App Router) — app/api/contact/route.js
// The API key stays on the server (put it in .env.local), never in the browser.
export async function POST(req) {
  const { name, email, subject, message } = await req.json();

  const res = await fetch("${url}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.EMAIL_SENDER_KEY
    },
    body: JSON.stringify({ name, email, subject, message })
  });

  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}

// .env.local
// EMAIL_SENDER_KEY=${key}

// In your page/component:
// await fetch("/api/contact", { method: "POST",
//   headers: { "Content-Type": "application/json" },
//   body: JSON.stringify({ name, email, subject, message }) });`;
    }
    if (tab === "node") {
        return `// Node.js 18+ (built-in fetch) + Express
// npm i express
import express from "express";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;
  try {
    const r = await fetch("${url}", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": "${key}" },
      body: JSON.stringify({ name, email, subject, message })
    });
    res.status(r.status).json(await r.json());
  } catch (err) {
    res.status(502).json({ message: "Could not reach Email Sender" });
  }
});

app.listen(3000, () => console.log("http://localhost:3000"));`;
    }
    if (tab === "php") {
        return `<?php
// contact.php — point your HTML form to this file (method="POST")
// Needs the cURL extension (enabled on almost every host).

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    exit("Method not allowed");
}

$payload = [
    "name"    => trim($_POST["name"] ?? ""),
    "email"   => trim($_POST["email"] ?? ""),
    "subject" => trim($_POST["subject"] ?? ""),
    "message" => trim($_POST["message"] ?? ""),
];

$ch = curl_init("${url}");
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => [
        "Content-Type: application/json",
        "x-api-key: ${key}",
    ],
    CURLOPT_POSTFIELDS     => json_encode($payload),
]);

$response = curl_exec($ch);
$status   = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response !== false && $status >= 200 && $status < 300) {
    header("Location: thank-you.html"); // or: echo "Message sent!";
    exit;
}

http_response_code(502);
echo "Sorry, your message could not be sent. Please try again.";`;
    }
    if (tab === "python") {
        return `# pip install requests flask
import requests
from flask import Flask, request, jsonify

API_URL = "${url}"
API_KEY = "${key}"

# 1) Send from any Python script
def send_message(name, email, subject, message):
    res = requests.post(
        API_URL,
        headers={"x-api-key": API_KEY},
        json={"name": name, "email": email, "subject": subject, "message": message},
        timeout=30,
    )
    return res.status_code, res.json()

# print(send_message("John Doe", "john@example.com", "Hello", "Sent from Python"))

# 2) Or a Flask endpoint for your website's form
app = Flask(__name__)

@app.post("/contact")
def contact():
    data = request.get_json(silent=True) or request.form
    status, body = send_message(
        data.get("name", ""), data.get("email", ""),
        data.get("subject", ""), data.get("message", ""),
    )
    return jsonify(body), status

if __name__ == "__main__":
    app.run(port=5000)`;
    }
    if (tab === "java") {
        return `// Java 15+ (java.net.http + text block)
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class SendMail {
    public static void main(String[] args) throws Exception {
        String json = """
            {"name":"John Doe","email":"john@example.com","subject":"Hello","message":"Sent from Java"}
            """;

        HttpRequest request = HttpRequest.newBuilder(URI.create("${url}"))
            .header("Content-Type", "application/json")
            .header("x-api-key", "${key}")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
            .send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println(response.statusCode() + " " + response.body());
    }
}`;
    }
    if (tab === "csharp") {
        return `// C# / .NET 6+
using System.Net.Http;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
client.DefaultRequestHeaders.Add("x-api-key", "${key}");

var json = JsonSerializer.Serialize(new
{
    name = "John Doe",
    email = "john@example.com",
    subject = "Hello",
    message = "Sent from C#"
});

var response = await client.PostAsync(
    "${url}",
    new StringContent(json, Encoding.UTF8, "application/json"));

Console.WriteLine((int)response.StatusCode + " " + await response.Content.ReadAsStringAsync());`;
    }
    if (tab === "go") {
        return `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func main() {
	payload, _ := json.Marshal(map[string]string{
		"name":    "John Doe",
		"email":   "john@example.com",
		"subject": "Hello",
		"message": "Sent from Go",
	})

	req, _ := http.NewRequest("POST", "${url}", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", "${key}")

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		panic(err)
	}
	defer res.Body.Close()

	body, _ := io.ReadAll(res.Body)
	fmt.Println(res.StatusCode, string(body))
}`;
    }
    if (tab === "ruby") {
        return `# Ruby (works in Rails controllers too)
require "net/http"
require "json"
require "uri"

uri = URI("${url}")
req = Net::HTTP::Post.new(uri, "Content-Type" => "application/json", "x-api-key" => "${key}")
req.body = {
  name: "John Doe",
  email: "john@example.com",
  subject: "Hello",
  message: "Sent from Ruby"
}.to_json

res = Net::HTTP.start(uri.hostname, uri.port, use_ssl: uri.scheme == "https") do |http|
  http.request(req)
end

puts "#{res.code} #{res.body}"`;
    }
    if (tab === "dart") {
        return `// Flutter / Dart — run: flutter pub add http
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> sendMessage() async {
  final res = await http.post(
    Uri.parse('${url}'),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${key}',
    },
    body: jsonEncode({
      'name': 'John Doe',
      'email': 'john@example.com',
      'subject': 'Hello',
      'message': 'Sent from Flutter',
    }),
  );
  print(res.statusCode.toString() + ' ' + res.body);
}`;
    }
    return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${key}" \\
  -d '{"name":"John Doe","email":"john@example.com","subject":"Hello","message":"Sent from cURL"}'`;
}

export const previewDoc = (theme, dark) =>
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0}body{padding:20px;font-family:system-ui,sans-serif;background:${dark ? "#07121f" : "#eef4ff"}}${ES_CSS}</style></head>
<body>${buildForm({ key: "", action: "#", theme, logo: LOGO_URL, home: "#" })}<script>${PREVIEW_JS}</script></body></html>`;
