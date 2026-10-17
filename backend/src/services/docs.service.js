import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { renderMarkdown } from "../utils/markdown.js";
import { buildDocsPage } from "../views/docs.page.js";
import { DocStat } from "../models/docStat.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// repo root = backend/src/services/../../..  (README.md, docs/, frontend/ থাকে এখানে)
export const REPO_ROOT = path.resolve(__dirname, "../../..");
export const README_PATH = process.env.DOCS_README_PATH
    ? path.resolve(process.env.DOCS_README_PATH)
    : path.join(REPO_ROOT, "README.md");

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* ---------- syntax highlighter: re-use the frontend's own VS Code-style highlighter ---------- */
let highlighter;
const loadHighlighter = async () => {
    if (highlighter !== undefined) return highlighter;
    try {
        const file = path.join(REPO_ROOT, "frontend/src/lib/highlight.js");
        const mod = await import(pathToFileURL(file).href);
        highlighter = typeof mod.highlight === "function" ? mod.highlight : null;
    } catch {
        highlighter = null; // নাহলে সাধারণ (রঙহীন) কোড দেখাবে — তবুও কাজ করবে
    }
    return highlighter;
};

/* ---------- README -> chapters ---------- */
const readPkg = file => {
    try {
        return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, file), "utf8"));
    } catch {
        return {};
    }
};

const cleanHtml = html =>
    html
        // README তে mermaid ছবি আর তার "source" দুটোই আছে — বইয়ে শুধু ছবি থাকবে
        .replace(/<details>\s*<summary>\s*Mermaid source[^<]*<\/summary>[\s\S]*?<\/details>/gi, "")
        .replace(/<p>\s*<\/p>\s*/g, "")
        .replace(/<img src="(https:\/\/img\.shields\.io\/)/g, '<img class="badge" src="$1');

const textOf = html => html.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ");

async function buildBook() {
    const raw = await fs.promises.readFile(README_PATH, "utf8");
    const stat = await fs.promises.stat(README_PATH);
    const highlight = await loadHighlighter();

    const repo =
        (raw.match(/github\/(?:stars|forks|last-commit|issues)\/([\w.-]+\/[\w.-]+)/) || [])[1] ||
        (raw.match(/github\.com\/([\w.-]+\/[\w.-]+?)(?:[/)?"'\s]|$)/) || [])[1] ||
        "";

    const { blocks, blockHtml, join } = renderMarkdown(raw, { repo, highlight });

    // heading renderer for h3..h6 inside chapters (adds the small # link)
    const renderBlock = b =>
        b.kind === "heading"
            ? `<h${b.level} id="${esc(b.id)}">${b.inner}<a class="anchor" href="#${esc(b.id)}" aria-label="Link to this section">#</a></h${b.level}>`
            : blockHtml(b);

    // 1) front matter (everything above the first "##")  2) one chapter per "##"
    const firstH2 = blocks.findIndex(b => b.kind === "heading" && b.level === 2);
    const front = (firstH2 === -1 ? blocks : blocks.slice(0, firstH2)).filter(b => b.kind !== "heading" || b.level > 1);
    const chapters = [];
    let cur = null;
    for (const b of firstH2 === -1 ? [] : blocks.slice(firstH2)) {
        if (b.kind === "heading" && b.level === 2) {
            // README এর নিজের "Table of Contents" বাদ — বই নিজেই সূচিপত্র বানায়
            cur = /table of contents|^contents$/i.test(b.title)
                ? null
                : { id: b.id, title: b.title, emoji: b.emoji, inner: b.inner, blocks: [], subs: [] };
            if (cur) chapters.push(cur);
            continue;
        }
        if (!cur) continue;
        if (b.kind === "heading" && b.level === 3) cur.subs.push({ id: b.id, title: b.title });
        cur.blocks.push(b);
    }
    for (const c of chapters) {
        while (c.blocks.length && c.blocks[c.blocks.length - 1].kind === "hr") c.blocks.pop(); // শেষের --- লাগবে না
        c.html = cleanHtml(c.blocks.map(renderBlock).join("\n"));
    }
    const frontHtml = cleanHtml(front.map(renderBlock).join("\n")).trim();

    // cover info — read from the README itself, so it stays in sync
    const bannerText = raw.match(/text=([^&)"\s]+)/);
    const bannerDesc = raw.match(/desc=([^&)"\s]+)/);
    const dec = s => {
        try {
            return decodeURIComponent(s);
        } catch {
            return s;
        }
    };
    const pkg = readPkg("backend/package.json");
    const rootPkg = readPkg("package.json");
    const words = textOf(chapters.map(c => c.html).join(" ")).split(/\s+/).filter(Boolean).length;

    const meta = {
        title: bannerText ? dec(bannerText[1]) : "Email Sender",
        subtitle: bannerDesc ? dec(bannerDesc[1]) : "A Contact Form API — Messages Straight to Your Inbox",
        tags: "Node.js · Express · MongoDB · React · Vite · PWA",
        author: pkg.author || "",
        edition: `v${pkg.version || rootPkg.version || "1.0.0"}`,
        updated: stat.mtime.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }),
        chapters: chapters.length,
        minutes: Math.max(1, Math.round(words / 200))
    };

    const version = crypto.createHash("sha1").update(raw).digest("hex").slice(0, 16);
    const html = buildDocsPage({ meta, frontHtml, chapters, version });
    return {
        html,
        gz: zlib.gzipSync(html, { level: 9 }),
        etag: `"${version}"`,
        version,
        updatedAt: stat.mtime,
        title: meta.title,
        mtimeMs: stat.mtimeMs,
        size: stat.size
    };
}

/* ---------- cache: README বদলালে (mtime/size) পরের request এই নতুন করে বানায় ---------- */
let cache = null;
let building = null;

export async function getDocsBook() {
    const stat = await fs.promises.stat(README_PATH); // না থাকলে error → route 503 দেখায়
    if (cache && cache.mtimeMs === stat.mtimeMs && cache.size === stat.size) return cache;
    if (!building) {
        building = buildBook()
            .then(book => (cache = book))
            .finally(() => {
                building = null;
            });
    }
    return building;
}

/* ---------- download counter ---------- */
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10); // UTC

export async function recordDownload() {
    await DocStat.findOneAndUpdate(
        { key: "readme" },
        { $inc: { downloads: 1, [`daily.${dayKey()}`]: 1 }, $set: { lastDownloadAt: new Date() } },
        { upsert: true }
    );
}

export async function getDownloadStats() {
    const doc = await DocStat.findOne({ key: "readme" }).lean();
    const daily = doc?.daily || {};
    const days = [];
    for (let i = 29; i >= 0; i--) {
        const d = dayKey(new Date(Date.now() - i * 86_400_000));
        days.push({ date: d, count: Number(daily[d] || 0) });
    }
    const sum = arr => arr.reduce((n, x) => n + x.count, 0);
    return {
        total: doc?.downloads || 0,
        today: days[days.length - 1].count,
        last7: sum(days.slice(-7)),
        last30: sum(days),
        lastDownloadAt: doc?.lastDownloadAt || null,
        days
    };
}
