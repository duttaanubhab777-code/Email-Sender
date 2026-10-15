// ফর্মটা কোন পেজ (পুরো লিংক) থেকে পূরণ হয়েছে সেটা বের করে।
// অগ্রাধিকার: ১) ফর্মের পাঠানো পুরো লিংক (pageUrl, port ও path সহ)
//             ২) Referer header  ৩) Origin header (শুধু site + port)
// pageUrl ব্রাউজারের ভেতর থেকে আসে বলে বানানো সম্ভব — তাই Origin এর সাথে না মিললে header টাকেই বিশ্বাস করা হয়।

const MAX_LEN = 500;

const parse = value => {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!raw || raw.length > 2000) return null;
    try {
        const u = new URL(raw);
        if (u.protocol !== "http:" && u.protocol !== "https:") return null;
        u.username = "";
        u.password = "";
        return u;
    } catch {
        return null;
    }
};

const clip = u => {
    const href = u.href;
    return href.length > MAX_LEN ? href.slice(0, MAX_LEN) : href;
};

export const pickSourceUrl = req => {
    const body = req.body || {};
    const claimed = parse(body.pageUrl || body.page_url || body.sourceUrl);
    const origin = parse(req.get("origin"));
    const referer = parse(req.get("referer"));
    const trusted = origin || referer;

    if (claimed && (!trusted || claimed.origin === trusted.origin)) return clip(claimed);
    // referer এ সাধারণত path থাকে, origin এ থাকে না — তাই referer আগে
    const fallback = referer || origin;
    return fallback ? clip(fallback) : null;
};
