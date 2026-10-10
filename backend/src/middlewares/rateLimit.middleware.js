import { ApiError } from "../utils/ApiError.js";

const hits = new Map();

// ছোট in-memory rate limiter (extra package লাগে না)
export const rateLimit = ({ name, windowMs, max, key }) => (req, res, next) => {
    const id = `${name}:${key ? key(req) : req.ip}`;
    const now = Date.now();
    let entry = hits.get(id);

    if (!entry || entry.reset < now) {
        entry = { count: 0, reset: now + windowMs };
        hits.set(id, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
        const retryAfter = Math.ceil((entry.reset - now) / 1000);
        res.set("Retry-After", String(retryAfter));
        throw new ApiError(429, `Too many requests. Try again in ${retryAfter}s`, [
            { retryAfter }
        ]);
    }
    next();
};

setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
}, 60_000).unref();
