# Email Sender — মেইল relay (PythonAnywhere + Gmail)
# Node backend (Render) এই URL এ HTTPS POST করে, এটা তোমার Gmail দিয়ে ইমেইল পাঠায়।
#
# সেটআপ:
#  1) Google Account → Security → 2-Step Verification চালু → "App passwords" থেকে ১৬ অক্ষরের password বানাও
#  2) PythonAnywhere → Web → Add a new web app → Flask → flask_app.py তে এই পুরো কোড বসাও
#     (আগে থেকেই Flask app থাকলে শুধু send() ফাংশনটা + import গুলো তোমার app এ যোগ করো)
#  3) নিচের ৩টা মান বদলাও → Web ট্যাবে Reload চাপো
#  4) Render/.env:  MAIL_RELAY_URL=https://USERNAME.pythonanywhere.com/send
#                   MAIL_RELAY_SECRET=নিচের RELAY_SECRET এর হুবহু একই মান
#  ⚠ এই ফাইলের আসল মানগুলো GitHub এ তুলো না (শুধু PythonAnywhere এ থাকবে)

import hmac
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

from flask import Flask, jsonify, request

app = Flask(__name__)

GMAIL_USER = "your-gmail@gmail.com"
GMAIL_APP_PASSWORD = "xxxx xxxx xxxx xxxx"  # Gmail App password (সাধারণ password নয়)
RELAY_SECRET = "একটা-লম্বা-ইংরেজি-সংখ্যার-গোপন-লেখা"


@app.get("/")
def home():
    return "ok"


@app.post("/send")
def send():
    d = request.get_json(silent=True) or {}

    if not RELAY_SECRET or not hmac.compare_digest(str(d.get("secret", "")), RELAY_SECRET):
        return jsonify(ok=False, error="forbidden"), 403

    to = str(d.get("to", "")).strip()
    subject = " ".join(str(d.get("subject", "")).split())
    html = str(d.get("html", ""))
    if not to or not subject or not html:
        return jsonify(ok=False, error="bad request"), 400

    try:
        msg = EmailMessage()
        msg["From"] = formataddr((" ".join(str(d.get("fromName") or "Email Sender").split())[:80], GMAIL_USER))
        msg["To"] = to
        msg["Subject"] = subject
        reply_to = str(d.get("replyTo") or "").strip()
        if reply_to:
            msg["Reply-To"] = reply_to
        msg.set_content("Please view this email in an HTML-capable mail app.")
        msg.add_alternative(html, subtype="html")

        with smtplib.SMTP("smtp.gmail.com", 587, timeout=20) as s:
            s.starttls()
            s.login(GMAIL_USER, GMAIL_APP_PASSWORD.replace(" ", ""))
            s.send_message(msg)
        return jsonify(ok=True)
    except Exception as e:  # Node এর queue এই error দেখে পরে আবার চেষ্টা করবে
        return jsonify(ok=False, error=str(e)[:200]), 502
