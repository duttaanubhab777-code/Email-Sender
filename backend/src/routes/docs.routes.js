import { Router } from "express";
import path from "node:path";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";
import { rateLimit } from "../middlewares/rateLimit.middleware.js";
import {
    getDocsBook,
    recordDownload,
    getDownloadStats,
    REPO_ROOT
} from "../services/docs.service.js";

/* =====================================================================
   /docs            → README থেকে বানানো বই (HTML) — যে কেউ দেখতে ও PDF নামাতে পারে
   /docs/asset/...  → README এর ভেতরের ছবি (যেমন docs/assets/*.svg)
   /api/v1/docs/... → meta (public), download গণনা (public), stats (শুধু Admin)
   ===================================================================== */

export const docsPageRouter = Router();
export const docsApiRouter = Router();

const IMAGE_EXT = /\.(?:svg|png|jpe?g|gif|webp|ico)$/i;

// ---- page ----
docsPageRouter.get("/", async (req, res, next) => {
    try {
        const book = await getDocsBook();
        res.set({
            "Content-Type": "text/html; charset=utf-8",
            // সবসময় যাচাই করবে (304 হলে ডেটা যায় না) — README বদলালে সাথে সাথে নতুন বই
            "Cache-Control": "no-cache",
            ETag: book.etag,
            Vary: "Accept-Encoding"
        });
        if (req.fresh) return res.status(304).end();
        if (/\bgzip\b/.test(req.headers["accept-encoding"] || "")) {
            res.set("Content-Encoding", "gzip");
            return res.send(book.gz);
        }
        res.send(book.html);
    } catch (error) {
        if (error?.code === "ENOENT") {
            return res
                .status(503)
                .type("html")
                .send("<h1>Docs unavailable</h1><p>README.md was not found on the server.</p>");
        }
        next(error);
    }
});

// logo + favicon (frontend ফোল্ডারের ছবি থেকেই)
const sendRepoFile = (rel, maxAge = 86400) => (req, res, next) =>
    res.sendFile(rel, { root: REPO_ROOT, maxAge: maxAge * 1000, dotfiles: "deny" }, err => {
        if (err) next(err.statusCode === 404 ? new ApiError(404, "Not found") : err);
    });
docsPageRouter.get("/logo.png", sendRepoFile("frontend/src/assets/logo-full.png"));
docsPageRouter.get("/favicon.png", sendRepoFile("frontend/public/icon-192.png"));

// README এর relative ছবি। শুধু ছবির ধরন, আর repo এর বাইরে যাওয়া যাবে না
docsPageRouter.get(/^\/asset\/(.+)$/, (req, res, next) => {
    const rel = path.posix.normalize(String(req.params[0] || ""));
    if (!IMAGE_EXT.test(rel) || rel.startsWith("..") || path.isAbsolute(rel) || /(^|\/)\./.test(rel)) {
        return next(new ApiError(404, "Not found"));
    }
    if (/^(?:backend|node_modules)\//.test(rel)) return next(new ApiError(404, "Not found"));
    res.sendFile(rel, { root: REPO_ROOT, maxAge: 3_600_000, dotfiles: "deny" }, err => {
        if (err) next(new ApiError(404, "Not found"));
    });
});

// ---- API ----
// version বদলালে খোলা পেজ "নতুন ভার্সন এসেছে" দেখায়
docsApiRouter.get("/meta", async (req, res, next) => {
    try {
        const book = await getDocsBook();
        res.set("Cache-Control", "no-store");
        res.status(200).json(
            new ApiResponse(
                200,
                { version: book.version, title: book.title, updatedAt: book.updatedAt },
                "Docs meta"
            )
        );
    } catch (error) {
        next(error);
    }
});

// "PDF download" চাপলে পেজ এটা ডাকে। একই IP থেকে ৩ মিনিটে একবারই গোনা হয় (বারবার চাপলে সংখ্যা ফুলে না ওঠে)
docsApiRouter.post(
    "/download",
    rateLimit({ name: "docs-dl-burst", windowMs: 3 * 60 * 1000, max: 1 }),
    rateLimit({ name: "docs-dl-hour", windowMs: 60 * 60 * 1000, max: 20 }),
    async (req, res, next) => {
        try {
            await recordDownload();
            res.status(202).json(new ApiResponse(202, { counted: true }, "Counted"));
        } catch (error) {
            next(error);
        }
    }
);

// শুধু Admin + Super Admin দেখতে পায় কতজন নামিয়েছে
docsApiRouter.get("/stats", verifyJWT, verifyAdmin, async (req, res, next) => {
    try {
        res.set("Cache-Control", "no-store");
        res.status(200).json(
            new ApiResponse(200, await getDownloadStats(), "Docs download stats")
        );
    } catch (error) {
        next(error);
    }
});
