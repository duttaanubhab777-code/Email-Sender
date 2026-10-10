import { BASE_URL } from "../services/api";

// Cloudinary তে আপলোড করা badge logo (ছবি যেন কখনো না ভাঙে)
export const LOGO_URL =
    "https://res.cloudinary.com/khvkgpxq/image/upload/w_64,h_64,c_fit,f_auto,q_auto/v1791551108/badge-logo.png";

const DARK = `--es-bg:#0f1a24;--es-bd:#1f3140;--es-tx:#e6eef4;--es-mu:#93a7b5;--es-in:#0a141c;--es-inb:#2a4152;--es-ac:#3b82f6;--es-ac2:#06b6d4;--es-ring:rgba(59,130,246,.28);--es-err:#f87171;--es-sh:0 18px 40px rgba(0,0,0,.45);--es-link:#60a5fa;`;

export const ES_CSS = `.es-form{--es-bg:#fff;--es-bd:#e5e7eb;--es-tx:#1f2937;--es-mu:#6b7280;--es-in:#f9fafb;--es-inb:#d1d5db;--es-ac:#2563eb;--es-ac2:#0ea5e9;--es-ring:rgba(37,99,235,.18);--es-err:#dc2626;--es-sh:0 10px 30px rgba(15,23,42,.08);--es-link:#1d4ed8}
@media (prefers-color-scheme:dark){.es-form:not([data-theme="light"]){${DARK}}}
.es-form[data-theme="dark"]{${DARK}}
.es-form,.es-form *{box-sizing:border-box}
.es-form{position:relative;max-width:480px;margin:0 auto;padding:28px;color:var(--es-tx);background:var(--es-bg);border:1px solid var(--es-bd);border-radius:18px;box-shadow:var(--es-sh);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;transition:background .25s,border-color .25s}
.es-field{margin-bottom:16px}
.es-field label{display:block;margin-bottom:6px;font-size:14px;font-weight:600}
.es-field input,.es-field textarea{display:block;width:100%;padding:12px 14px;font:inherit;font-size:16px;color:var(--es-tx);background:var(--es-in);border:1px solid var(--es-inb);border-radius:12px;outline:none;transition:border-color .2s,box-shadow .2s}
.es-field input::placeholder,.es-field textarea::placeholder{color:var(--es-mu);opacity:.7}
.es-field input:focus,.es-field textarea:focus{border-color:var(--es-ac);box-shadow:0 0 0 4px var(--es-ring)}
.es-field textarea{min-height:120px;resize:vertical}
.es-hint{display:none;margin-top:5px;font-size:12.5px;color:var(--es-err)}
.es-field.touched input:invalid,.es-field.touched textarea:invalid{border-color:var(--es-err)}
.es-field.touched input:invalid~.es-hint,.es-field.touched textarea:invalid~.es-hint{display:block}
.es-msg{display:none;margin:0 0 14px;padding:11px 14px;font-size:14px;color:var(--es-err);border:1px solid var(--es-err);border-radius:10px}
.es-msg.show{display:block}
.es-btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:13px 18px;font:inherit;font-size:16px;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--es-ac),var(--es-ac2));border:0;border-radius:12px;cursor:pointer;transition:transform .15s,box-shadow .2s,opacity .2s}
.es-btn:hover{transform:translateY(-1px);box-shadow:0 8px 18px var(--es-ring)}
.es-btn:disabled{opacity:.8;cursor:progress;transform:none}
.es-form.is-busy .es-btn::before{content:"";width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:es-spin .8s linear infinite}
@keyframes es-spin{to{transform:rotate(360deg)}}
.es-hp{position:absolute;left:-9999px;width:0;height:0;opacity:0}
.es-done{display:none;text-align:center;padding:18px 0 8px;outline:none}
.es-form.is-sent .es-body{display:none}
.es-form.is-sent .es-done{display:block}
.es-done svg{width:76px;height:76px;margin-bottom:10px}
.es-done circle{fill:none;stroke:var(--es-ac);stroke-width:2.5;stroke-dasharray:145;stroke-dashoffset:145;animation:es-draw .7s ease forwards}
.es-done path{fill:none;stroke:var(--es-ac);stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:40;stroke-dashoffset:40;animation:es-draw .45s .55s ease forwards}
@keyframes es-draw{to{stroke-dashoffset:0}}
.es-done h3{margin:0 0 6px;font-size:22px}
.es-done p{margin:0 auto 18px;max-width:300px;font-size:15px;line-height:1.6;color:var(--es-mu)}
.es-again{padding:10px 18px;font:inherit;font-size:14px;font-weight:700;color:var(--es-tx);background:transparent;border:1px solid var(--es-inb);border-radius:10px;cursor:pointer}
.es-again:hover{border-color:var(--es-ac);color:var(--es-ac)}
.es-badge{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:16px;font-size:12px;color:var(--es-mu);text-decoration:none}
.es-badge img{width:18px;height:18px;border-radius:4px}
.es-badge b{color:var(--es-link)}
@media (prefers-reduced-motion:reduce){.es-form *{animation-duration:.001ms!important;transition-duration:.001ms!important}}`;

// fetch দিয়ে পাঠায় (redirect নেই)। URLSearchParams = urlencoded body, যা ব্যাকএন্ডের express.urlencoded() পড়তে পারে
export const ES_JS = `(function () {
  var form = document.getElementById("es-form");
  var msg = form.querySelector(".es-msg");
  var btn = form.querySelector(".es-btn");
  var label = btn.textContent;

  function touch(el) {
    var f = el.closest(".es-field");
    if (f) f.classList.add("touched");
  }
  form.querySelectorAll("input,textarea").forEach(function (el) {
    el.addEventListener("blur", function () { touch(el); });
  });
  form.addEventListener("invalid", function (e) { touch(e.target); }, true);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    msg.classList.remove("show");
    form.classList.add("is-busy");
    btn.disabled = true;
    btn.textContent = "Sending...";

    fetch(form.action, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new URLSearchParams(new FormData(form))
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          form.querySelectorAll(".touched").forEach(function (f) { f.classList.remove("touched"); });
          form.classList.add("is-sent");
          form.querySelector(".es-done").focus();
          return;
        }
        throw new Error(
          res.status === 429 ? "Monthly limit reached. Please try again later."
          : res.status === 401 || res.status === 403 ? "This form is not set up correctly."
          : "Something went wrong. Please try again."
        );
      })
      .catch(function (err) {
        msg.textContent = err instanceof TypeError ? "Network error. Please check your connection." : err.message;
        msg.classList.add("show");
      })
      .then(function () {
        form.classList.remove("is-busy");
        btn.disabled = false;
        btn.textContent = label;
      });
  });

  form.querySelector(".es-again").addEventListener("click", function () {
    form.classList.remove("is-sent");
  });
})();`;

// Preview তে আসল request যায় না — শুধু সফল হওয়ার অ্যানিমেশন দেখায়
const PREVIEW_JS = `(function(){var f=document.getElementById("es-form");f.addEventListener("submit",function(e){e.preventDefault();f.classList.add("is-sent");f.querySelector(".es-done").focus()});f.querySelectorAll("input,textarea").forEach(function(el){el.addEventListener("blur",function(){var p=el.closest(".es-field");if(p)p.classList.add("touched")})});f.querySelector(".es-again").addEventListener("click",function(){f.classList.remove("is-sent")})})();`;

export const buildForm = ({
    key,
    action,
    theme,
    logo,
    home
}) => `<form class="es-form" id="es-form" data-theme="${theme}" action="${action}" method="POST">
  <div class="es-body">
    <input type="hidden" name="access_key" value="${key}">
    <input type="text" name="botcheck" class="es-hp" tabindex="-1" autocomplete="off" aria-hidden="true">

    <div class="es-field">
      <label for="es-name">Name</label>
      <input id="es-name" type="text" name="name" placeholder="John Doe" autocomplete="name" required>
      <small class="es-hint">Please enter your name</small>
    </div>
    <div class="es-field">
      <label for="es-email">Email</label>
      <input id="es-email" type="email" name="email" placeholder="john@example.com" autocomplete="email" required>
      <small class="es-hint">Enter a valid email address</small>
    </div>
    <div class="es-field">
      <label for="es-subject">Subject</label>
      <input id="es-subject" type="text" name="subject" placeholder="How can we help?" required>
      <small class="es-hint">Add a short subject</small>
    </div>
    <div class="es-field">
      <label for="es-message">Message</label>
      <textarea id="es-message" name="message" rows="5" maxlength="1000" placeholder="Write your message..." required></textarea>
      <small class="es-hint">Write a few words</small>
    </div>

    <p class="es-msg" role="alert"></p>
    <button type="submit" class="es-btn">Send message</button>
  </div>

  <div class="es-done" role="status" aria-live="polite" tabindex="-1">
    <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="23"/><path d="M15 27l8 8 14-16"/></svg>
    <h3>Message sent!</h3>
    <p>Thank you for reaching out. We will get back to you soon.</p>
    <button type="button" class="es-again">Send another message</button>
  </div>

  <a class="es-badge" href="${home}" target="_blank" rel="noopener">
    Powered by <img src="${logo}" alt="" onerror="this.style.display='none'"> <b>Email Sender</b>
  </a>
</form>`;

export const endpoint = () => `${BASE_URL}/mail/send`;

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
    return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${key}" \\
  -d '{"name":"John Doe","email":"john@example.com","subject":"Hello","message":"Sent from cURL"}'`;
}

export const previewDoc = (theme, dark) =>
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0}body{padding:20px;font-family:system-ui,sans-serif;background:${dark ? "#0a161d" : "#f3f6f5"}}${ES_CSS}</style></head>
<body>${buildForm({ key: "", action: "#", theme, logo: LOGO_URL, home: "#" })}<script>${PREVIEW_JS}</script></body></html>`;
