# Email Sender — মেইল relay (PythonAnywhere + Gmail SMTP)
# ---------------------------------------------------------------------------
# কাজ: Render এর Node backend এই server এ HTTPS POST করে (/send),
#      আর এটা তোমার Gmail দিয়ে আসল ইমেইলটা পাঠিয়ে দেয়।
#      (Render free plan এ SMTP পোর্ট বন্ধ, কিন্তু PythonAnywhere থেকে Gmail SMTP চলে)
#
# 🔐 সিক্রেট কোথায় থাকবে: এই ফাইলে কোনো সিক্রেট নেই → নিশ্চিন্তে GitHub এ push করা যায়।
#    সব সিক্রেট থাকবে PythonAnywhere এ আলাদা `config.py` ফাইলে (নমুনা: config.example.py)।
#    config.py কখনো GitHub এ তুলো না (.gitignore এ আগে থেকেই বন্ধ করা আছে)।
#
# ⚙ সেটআপ (PythonAnywhere):
#   1) Google Account → Security → 2-Step Verification চালু → "App passwords" থেকে ১৬ অক্ষরের password নাও
#   2) PythonAnywhere → Web → Add a new web app → Flask → (Python 3.10+)
#   3) Files ট্যাবে app এর ফোল্ডারে (যেমন /home/USERNAME/mysite/):
#        - flask_app.py  ← এই ফাইলের পুরো কোড বসাও
#        - config.py     ← config.example.py কপি করে নিজের মান বসাও
#   4) Web ট্যাবে Reload চাপো
#   5) ব্রাউজারে খোলো:  https://USERNAME.pythonanywhere.com/health
#        → "configured": true দেখালে ঠিক আছে
#   6) পরীক্ষা (ফোনের ব্রাউজারেই হয়):
#        https://USERNAME.pythonanywhere.com/diag?key=RELAY_SECRET&to=তোমার@gmail.com
#        → কোন পোর্টে connect/login হচ্ছে আর টেস্ট মেইল গেল কিনা সব দেখাবে
#   7) Render এর Environment এ:
#        MAIL_PROVIDER=relay
#        MAIL_RELAY_URL=https://USERNAME.pythonanywhere.com/send
#        MAIL_RELAY_SECRET=<config.py এর RELAY_SECRET এর হুবহু একই মান>
#
# ℹ PythonAnywhere free account এ ওয়েব অ্যাপ প্রতি ৩ মাসে একবার Web ট্যাবের
#   "Run until 3 months from today" বাটন চেপে বাড়াতে হয়, নাহলে বন্ধ হয়ে যায়।

import hmac
import logging
import os
import re
import smtplib
import socket
import ssl
from email.message import EmailMessage
from email.utils import formataddr, formatdate, make_msgid
from html import unescape

from flask import Flask, jsonify, request

try:  # সিক্রেট config.py থেকে; না থাকলে environment variable
    import config  # type: ignore
except ImportError:  # pragma: no cover
    config = None

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024  # সর্বোচ্চ ১ MB request
log = logging.getLogger("mail-relay")


def _cfg(name, default=""):
    """config.py → environment → default (এই ক্রমে)।"""
    value = getattr(config, name, None) if config else None
    if value in (None, ""):
        value = os.environ.get(name)
    return str(default if value in (None, "") else value).strip()


GMAIL_USER = _cfg("GMAIL_USER")
GMAIL_APP_PASSWORD = _cfg("GMAIL_APP_PASSWORD").replace(" ", "")  # স্পেসসহ কপি করলেও চলবে
RELAY_SECRET = _cfg("RELAY_SECRET")
SMTP_HOST = _cfg("SMTP_HOST", "smtp.gmail.com")
SMTP_MODE = _cfg("SMTP_MODE", "auto").lower()  # auto | 465 | 587
DEFAULT_FROM_NAME = _cfg("FROM_NAME", "Email Sender")
TIMEOUT = 12  # প্রতিটা পোর্টের জন্য সর্বোচ্চ সেকেন্ড (Node এর timeout এর ভেতরে থাকতে হবে)

EMAIL_RE = re.compile(r"^[^\s@<>\",;]+@[^\s@<>\",;]+\.[^\s@<>\",;]{2,}$")


# ---------------------------------------------------------------------------
# ছোট helper
# ---------------------------------------------------------------------------
def _safe_equal(a, b):
    """timing-safe তুলনা। bytes এ নেওয়া হয়, তাই বাংলা/ইউনিকোড secret এ crash করে না।"""
    return hmac.compare_digest(str(a).encode("utf-8"), str(b).encode("utf-8"))


def _authorized(given):
    return bool(RELAY_SECRET) and _safe_equal(given or "", RELAY_SECRET)


def _one_line(value, limit):
    return " ".join(str(value or "").split())[:limit]


def _html_to_text(html):
    """HTML থেকে সাধারণ plain-text (spam score ভালো রাখে, পুরনো mail app এও পড়া যায়)।"""
    text = re.sub(r"(?is)<(script|style|head).*?>.*?</\1>", "", html)
    text = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</tr>|</h[1-6]>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return text.strip() or "Please view this email in an HTML-capable mail app."


def _build_message(to, subject, html, from_name, reply_to):
    msg = EmailMessage()
    msg["From"] = formataddr((_one_line(from_name or DEFAULT_FROM_NAME, 80), GMAIL_USER))
    msg["To"] = to
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=False)
    msg["Message-ID"] = make_msgid(domain=GMAIL_USER.split("@")[-1] or None)
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(_html_to_text(html))
    msg.add_alternative(html, subtype="html")
    return msg


def _port_plan():
    """কোন কোন পোর্টে কোন ক্রমে চেষ্টা হবে।"""
    if SMTP_MODE == "465":
        return [(465, "ssl")]
    if SMTP_MODE == "587":
        return [(587, "starttls")]
    return [(465, "ssl"), (587, "starttls")]


def _open(port, mode):
    """একটা পোর্টে connect + login করে খোলা connection ফেরত দেয়।"""
    ctx = ssl.create_default_context()
    if mode == "ssl":  # 465 → শুরু থেকেই SSL
        server = smtplib.SMTP_SSL(SMTP_HOST, port, timeout=TIMEOUT, context=ctx)
    else:  # 587 → সাধারণ connect, তারপর STARTTLS
        server = smtplib.SMTP(SMTP_HOST, port, timeout=TIMEOUT)
        server.ehlo()
        server.starttls(context=ctx)
        server.ehlo()
    try:
        server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
    except Exception:
        try:
            server.close()
        except Exception:
            pass
        raise
    return server


def _explain(exc):
    """error কে মানুষের বোঝার মতো কারণ + সমাধানে ভাগ করে।"""
    if isinstance(exc, smtplib.SMTPAuthenticationError):
        return (
            "gmail_auth_failed",
            "Gmail login ব্যর্থ — GMAIL_USER ঠিক আছে? 2-Step Verification চালু করে নতুন "
            "App password বানিয়েছ? (সাধারণ Gmail password চলে না)",
        )
    if isinstance(exc, smtplib.SMTPRecipientsRefused):
        return "recipient_refused", "প্রাপকের ঠিকানা Gmail গ্রহণ করেনি"
    if isinstance(exc, smtplib.SMTPSenderRefused):
        return "sender_refused", "Gmail প্রেরকের ঠিকানা গ্রহণ করেনি"
    if isinstance(exc, (socket.timeout, TimeoutError)):
        return "timeout", "Gmail এর সাথে connect হতে সময় শেষ — পরে আবার চেষ্টা হবে"
    if isinstance(exc, smtplib.SMTPException):
        return "smtp_error", "Gmail SMTP error"
    if isinstance(exc, (socket.gaierror, ConnectionError, OSError)):
        return (
            "network_blocked",
            "smtp.gmail.com এ connect করা যায়নি — PythonAnywhere free account এ "
            "শুধু whitelist করা সাইট খোলে; /diag দিয়ে দেখো কোন পোর্ট চলছে",
        )
    return "error", "অজানা error"


def send_via_gmail(msg, recipient):
    """পোর্টগুলো একে একে চেষ্টা করে। login ভুল হলে বাকি পোর্টে চেষ্টা করে লাভ নেই, তাই থামে।"""
    last = None
    for port, mode in _port_plan():
        try:
            server = _open(port, mode)
            try:
                server.send_message(msg, from_addr=GMAIL_USER, to_addrs=[recipient])
            finally:
                try:
                    server.quit()
                except Exception:
                    server.close()
            return port
        except smtplib.SMTPAuthenticationError:
            raise
        except Exception as exc:  # connect/timeout/ssl → পরের পোর্ট
            log.warning("SMTP %s failed: %s: %s", port, type(exc).__name__, exc)
            last = exc
    if last is None:
        raise RuntimeError("no SMTP port configured")
    raise last


# ---------------------------------------------------------------------------
# routes
# ---------------------------------------------------------------------------
@app.get("/")
def home():
    return "ok"


@app.get("/health")
def health():
    """সিক্রেট ছাড়াই খোলা যায়; শুধু জানায় সেটআপ ঠিক আছে কিনা (কোনো মান দেখায় না)।"""
    return jsonify(
        ok=True,
        configured=bool(GMAIL_USER and GMAIL_APP_PASSWORD and RELAY_SECRET),
        has_gmail_user=bool(GMAIL_USER),
        has_app_password=bool(GMAIL_APP_PASSWORD),
        has_secret=bool(RELAY_SECRET),
        app_password_length=len(GMAIL_APP_PASSWORD),  # Gmail App password এর দৈর্ঘ্য ১৬ হওয়া উচিত
        smtp_mode=SMTP_MODE,
    )


@app.post("/send")
def send():
    data = request.get_json(silent=True) or {}

    if not _authorized(data.get("secret")):
        return jsonify(ok=False, error="forbidden"), 403

    if not (GMAIL_USER and GMAIL_APP_PASSWORD):
        return jsonify(ok=False, error="relay is not configured (config.py এ GMAIL_USER / GMAIL_APP_PASSWORD দাও)"), 500

    to = str(data.get("to") or "").strip()
    subject = _one_line(data.get("subject"), 250)
    html = str(data.get("html") or "")
    reply_to = str(data.get("replyTo") or "").strip()

    if not EMAIL_RE.match(to) or not subject or not html:
        return jsonify(ok=False, error="bad request"), 400
    if len(html) > 300_000:
        return jsonify(ok=False, error="message too large"), 413
    if reply_to and not EMAIL_RE.match(reply_to):
        reply_to = ""  # ভুল reply-to থাকলে মেইল আটকাব না, শুধু বাদ দেব

    try:
        msg = _build_message(to, subject, html, data.get("fromName"), reply_to)
        port = send_via_gmail(msg, to)
        return jsonify(ok=True, port=port)
    except Exception as exc:  # Node এর queue এই error দেখে পরে আবার চেষ্টা করবে
        code, hint = _explain(exc)
        log.error("send failed (%s): %s: %s", code, type(exc).__name__, exc)
        return jsonify(ok=False, error=f"{code}: {hint}", detail=str(exc)[:200]), 502


@app.route("/diag", methods=["GET", "POST"])
def diag():
    """সমস্যা ধরার জন্য: প্রতিটা পোর্ট আলাদা করে পরীক্ষা (connect → login), চাইলে টেস্ট মেইলও।
    ফোনের ব্রাউজারে:  /diag?key=RELAY_SECRET&to=you@gmail.com"""
    body = request.get_json(silent=True) or {}
    key = request.args.get("key") or body.get("secret") or request.headers.get("x-relay-key")
    if not _authorized(key):
        return jsonify(ok=False, error="forbidden"), 403

    report = {"gmail_user": GMAIL_USER, "app_password_length": len(GMAIL_APP_PASSWORD), "ports": []}
    for port, mode in [(465, "ssl"), (587, "starttls")]:
        row = {"port": port, "mode": mode}
        try:
            server = _open(port, mode)
            server.quit()
            row["result"] = "OK — connect + login দুটোই ঠিক"
        except Exception as exc:
            code, hint = _explain(exc)
            row["result"] = f"FAIL — {code}"
            row["hint"] = hint
            row["detail"] = f"{type(exc).__name__}: {str(exc)[:150]}"
        report["ports"].append(row)

    to = (request.args.get("to") or body.get("to") or "").strip()
    if to:
        if not EMAIL_RE.match(to):
            report["test_mail"] = "to ঠিকানাটা ঠিক নয়"
        else:
            try:
                msg = _build_message(
                    to,
                    "Email Sender relay test",
                    "<p>✅ Relay ঠিকমতো কাজ করছে। এই মেইলটা PythonAnywhere থেকে গেছে।</p>",
                    DEFAULT_FROM_NAME,
                    "",
                )
                report["test_mail"] = f"পাঠানো হয়েছে (port {send_via_gmail(msg, to)})"
            except Exception as exc:
                code, hint = _explain(exc)
                report["test_mail"] = f"FAIL — {code}: {hint}"

    report["ok"] = any(str(p["result"]).startswith("OK") for p in report["ports"])
    return jsonify(report), 200


@app.errorhandler(413)
def too_big(_e):
    return jsonify(ok=False, error="message too large"), 413


if __name__ == "__main__":  # local এ পরীক্ষা: python mail-relay-pythonanywhere.py
    app.run(port=5000, debug=False)
