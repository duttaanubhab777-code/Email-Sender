# Email Sender relay — সিক্রেট ফাইল (নমুনা)
# ---------------------------------------------------------------
# PythonAnywhere এ flask_app.py এর পাশে `config.py` নামে ফাইল বানিয়ে এটা কপি করো,
# তারপর নিচের মানগুলো নিজের দিয়ে বদলাও।
# ⚠ config.py কখনো GitHub এ তুলো না (.gitignore এ বন্ধ করা আছে)।

# যে Gmail দিয়ে ইমেইল যাবে
GMAIL_USER = "your-gmail@gmail.com"

# Gmail App password (১৬ অক্ষর; স্পেস থাকলেও চলবে) — সাধারণ Gmail password নয়
GMAIL_APP_PASSWORD = "abcd efgh ijkl mnop"

# Render এর MAIL_RELAY_SECRET এর হুবহু একই মান। লম্বা, random, ইংরেজি অক্ষর/সংখ্যা দিয়ে বানাও (২৪+ অক্ষর)
RELAY_SECRET = "change-this-to-a-long-random-secret"

# --- ঐচ্ছিক ---
# FROM_NAME = "Email Sender"      # প্রেরকের ডিফল্ট নাম
# SMTP_MODE = "auto"              # auto = আগে 465 (SSL), না হলে 587 (STARTTLS) | "465" | "587"
