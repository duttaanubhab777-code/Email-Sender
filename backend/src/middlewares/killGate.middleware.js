import { getPublicStatus } from "../services/killSwitch.service.js";

// Kill switch চালু থাকলে পুরো ওয়েবসাইটের সব request এখানেই আটকে যাবে
export const killGate = (req, res, next) => {
    const status = getPublicStatus();
    if (!status.active) return next();

    if (req.method === "OPTIONS") return next(); // CORS preflight
    // frontend একই server থেকে আসে: পেজ/ফাইল খোলা থাকতে হবে, নাহলে countdown দেখানোর কিছুই থাকবে না
    if (!req.path.startsWith("/api/")) return next();
    if (req.method === "GET" && req.path === "/api/v1/system/status") return next();

    res.set("Retry-After", String(status.remainingSeconds));
    return res.status(503).json({
        statusCode: 503,
        success: false,
        message: "System is shutting down. All services are stopped.",
        data: { killSwitch: status }
    });
};
