// Small dependency-free Markdown -> HTML renderer, written for this project's README.
// (No extra npm package, so `npm ci` and the lock file stay untouched.)
//
// Supports what the README uses: headings, paragraphs, **bold**, *italic*, ~~strike~~,
// `code`, links, images, tables (with alignment), nested lists, task lists, blockquotes,
// fenced code blocks, horizontal rules and raw HTML blocks (<div>, <p>, <details> ...).
//
// renderMarkdown(src, { repo, highlight }) -> { blocks, headings }

const esc = s =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = s => esc(s).replace(/"/g, "&quot;");

/* ---------- headings: GitHub-style ids so the README's own #anchors keep working ---------- */
export const slugify = text =>
    String(text)
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\p{M}\s\-_]/gu, "")
        .replace(/\s/g, "-");

const EMOJI_LEAD = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\uFE0F)*)\s*/u;
export const splitEmoji = text => {
    const m = String(text).match(EMOJI_LEAD);
    return m ? { emoji: m[1], title: text.slice(m[0].length) } : { emoji: "", title: text };
};

/* ---------- url helpers ---------- */
const isAbs = u => /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(u);

const makeUrlFixer = repo => ({
    link(url) {
        if (url.startsWith("#")) {
            try {
                return "#" + decodeURIComponent(url.slice(1));
            } catch {
                return url;
            }
        }
        if (isAbs(url) || url.startsWith("/")) return url;
        if (!repo) return url;
        // "../../issues" (a GitHub-relative link) -> https://github.com/<repo>/issues
        const m = url.match(/^(?:\.\.\/)+(issues|pulls|actions|wiki|discussions)(\/.*)?$/);
        if (m) return `https://github.com/${repo}/${m[1]}${m[2] || ""}`;
        const clean = url.replace(/^(?:\.\/)+/, "").replace(/^(?:\.\.\/)+/, "");
        return `https://github.com/${repo}/blob/main/${clean}`;
    },
    image(url) {
        if (isAbs(url) || url.startsWith("/")) return url;
        const clean = url.replace(/^(?:\.\/)+/, "").replace(/^(?:\.\.\/)+/, "");
        return `/docs/asset/${clean.split("/").map(encodeURIComponent).join("/")}`;
    }
});

// images that only make sense on GitHub (banner, dividers, animated typing text) are dropped —
// the docs page has its own cover and chapter design
const DECORATIVE = /capsule-render\.vercel\.app|readme-typing-svg/i;

/* ---------- inline ---------- */
const SAFE_INLINE_TAGS = new Set([
    "img", "br", "b", "strong", "i", "em", "a", "kbd", "code", "sub", "sup", "span", "small", "mark", "u", "s", "del"
]);

function makeInline(fix) {
    const attrsOf = str => {
        const out = {};
        str.replace(/([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g, (_, k, a, b) => {
            out[k.toLowerCase()] = a ?? b ?? "";
            return "";
        });
        return out;
    };

    const imgTag = (src, alt = "", extra = {}) => {
        if (DECORATIVE.test(src)) return "";
        const w = extra.width ? ` width="${escAttr(extra.width)}"` : "";
        const h = extra.height ? ` height="${escAttr(extra.height)}"` : "";
        return `<img src="${escAttr(fix.image(src))}" alt="${escAttr(alt)}"${w}${h} loading="lazy" decoding="async">`;
    };

    return function inline(text) {
        const stash = [];
        const keep = html => `\u0000${stash.push(html) - 1}\u0000`;

        // 1) code spans
        text = text.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, __, code) =>
            keep(`<code>${esc(code.replace(/^ (.*) $/s, "$1"))}</code>`)
        );

        // 2) HTML comments, <https://auto> links and allow-listed raw tags
        text = text.replace(/<!--[\s\S]*?-->/g, "");
        text = text.replace(/<(https?:\/\/[^\s>]+)>/g, (_, u) =>
            keep(`<a href="${escAttr(u)}">${esc(u)}</a>`)
        );
        text = text.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^<>]*?)?)\s*(\/?)>/g, (all, close, name, attrs) => {
            const tag = name.toLowerCase();
            if (!SAFE_INLINE_TAGS.has(tag)) return all; // stays as text and gets escaped below
            if (close) return keep(`</${tag}>`);
            if (tag === "br") return keep("<br>");
            const a = attrsOf(attrs);
            if (tag === "img") return keep(imgTag(a.src || "", a.alt || "", a));
            if (tag === "a") {
                const href = a.href ? fix.link(a.href) : "#";
                const ext = isAbs(href) ? ' target="_blank" rel="noopener"' : "";
                return keep(`<a href="${escAttr(href)}"${ext}>`);
            }
            return keep(`<${tag}>`);
        });

        // 3) escape what is left (keep existing entities such as &nbsp;)
        text = text.replace(/&(?!#?\w+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // 4) images, then links (so [![img](src)](href) works)
        text = text.replace(/!\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g, (_, alt, src) =>
            keep(imgTag(src.replace(/&amp;/g, "&"), alt))
        );
        text = text.replace(/\[([^\]]*)\]\(\s*<?([^\s)>]+)>?(?:\s+"([^"]*)")?\s*\)/g, (_, label, href, title) => {
            const url = fix.link(href.replace(/&amp;/g, "&"));
            // a link that only wrapped a dropped image has an empty stash entry -> drop it
            const inner = label.replace(/\u0000(\d+)\u0000/g, (m, i) => stash[i]);
            if (!inner.trim()) return "";
            const ext = isAbs(url) ? ' target="_blank" rel="noopener"' : "";
            const t = title ? ` title="${escAttr(title)}"` : "";
            return keep(`<a href="${escAttr(url)}"${t}${ext}>${label}</a>`);
        });

        // 5) emphasis
        text = text
            .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
            .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, "$1<strong>$2</strong>")
            .replace(/\*(?=[^\s*])([\s\S]*?[^\s*])\*/g, "<em>$1</em>")
            .replace(/(^|[^\w])_(?=[^\s_])([\s\S]*?[^\s_])_(?!\w)/g, "$1<em>$2</em>")
            .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>");

        // 6) hard line breaks ("  \n" or "\\\n")
        text = text.replace(/(?: {2,}|\\)\n/g, "<br>\n");

        // 7) put the stashed pieces back (they can nest)
        let guard = 0;
        while (/\u0000\d+\u0000/.test(text) && guard++ < 8) {
            text = text.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[i]);
        }
        return text;
    };
}

/* ---------- block parser ---------- */
const RE = {
    blank: /^\s*$/,
    fence: /^\s{0,3}(`{3,}|~{3,})\s*([\w+#.-]*)[^\n]*$/,
    heading: /^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/,
    hr: /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/,
    quote: /^\s{0,3}>\s?/,
    list: /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/,
    htmlBlock: /^\s{0,3}(?:<!--|<\/?(?:div|p|details|summary|table|thead|tbody|tr|td|th|center|section|figure|picture|form|ul|ol|li|h[1-6]|br|hr|pre|blockquote)(?:\s|>|\/|$))/i,
    tableSep: /^\s*\|?\s*:?-{1,}:?\s*(?:\|\s*:?-{1,}:?\s*)*\|?\s*$/
};

const splitRow = line => {
    let s = line.trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
    const cells = [];
    let cur = "";
    let inCode = false;
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === "\\" && s[i + 1] === "|") {
            cur += "|";
            i++;
        } else if (ch === "`") {
            inCode = !inCode;
            cur += ch;
        } else if (ch === "|" && !inCode) {
            cells.push(cur.trim());
            cur = "";
        } else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
};

export function renderMarkdown(src, { repo = "", highlight = null } = {}) {
    const fix = makeUrlFixer(repo);
    const inline = makeInline(fix);
    const headings = [];
    const used = new Map();

    const uniqueId = text => {
        const base = slugify(text) || "section";
        const n = used.get(base) || 0;
        used.set(base, n + 1);
        return n ? `${base}-${n}` : base;
    };

    const codeBlock = (lang, code) => {
        const language = (lang || "text").toLowerCase();
        let body;
        try {
            body = highlight && language !== "text" ? highlight(code, language) : esc(code);
        } catch {
            body = esc(code);
        }
        return (
            `<figure class="code" data-lang="${escAttr(language)}">` +
            `<figcaption><span class="dots"><i></i><i></i><i></i></span><span class="lang">${escAttr(language)}</span>` +
            `<button type="button" class="copy" aria-label="Copy code">Copy</button></figcaption>` +
            `<pre><code>${body}</code></pre></figure>`
        );
    };

    // returns [{ kind, html, level?, text?, id? }]
    function parseBlocks(lines, top = false) {
        const out = [];
        let i = 0;

        const startsBlock = (line, next) =>
            RE.fence.test(line) ||
            RE.heading.test(line) ||
            RE.hr.test(line) ||
            RE.quote.test(line) ||
            RE.htmlBlock.test(line) ||
            (RE.list.test(line) && /^\s{0,3}(?:[-*+]|1[.)])\s/.test(line)) ||
            (line.includes("|") && next !== undefined && RE.tableSep.test(next) && next.includes("-"));

        while (i < lines.length) {
            const line = lines[i];

            if (RE.blank.test(line)) {
                i++;
                continue;
            }

            // fenced code
            let m = line.match(RE.fence);
            if (m) {
                const fence = m[1];
                const lang = m[2];
                const indent = line.match(/^\s*/)[0].length;
                const buf = [];
                i++;
                while (i < lines.length && !new RegExp(`^\\s{0,3}${fence[0]}{${fence.length},}\\s*$`).test(lines[i])) {
                    buf.push(lines[i].slice(Math.min(indent, lines[i].match(/^\s*/)[0].length)));
                    i++;
                }
                i++; // closing fence
                out.push({ kind: "code", html: codeBlock(lang, buf.join("\n")) });
                continue;
            }

            // heading
            m = line.match(RE.heading);
            if (m) {
                const level = m[1].length;
                const raw = m[2].trim();
                const plain = raw.replace(/`/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[*_~]/g, "");
                const id = top ? uniqueId(plain) : slugify(plain);
                const { emoji, title } = splitEmoji(plain);
                const block = {
                    kind: "heading",
                    level,
                    text: plain,
                    title,
                    emoji,
                    id,
                    inner: inline(emoji ? raw.replace(EMOJI_LEAD, "") : raw)
                };
                if (top) headings.push({ level, text: plain, title, emoji, id });
                out.push(block);
                i++;
                continue;
            }

            // horizontal rule
            if (RE.hr.test(line)) {
                out.push({ kind: "hr", html: "<hr>" });
                i++;
                continue;
            }

            // raw HTML block: runs until a blank line (CommonMark rule)
            if (RE.htmlBlock.test(line)) {
                const buf = [];
                while (i < lines.length && !RE.blank.test(lines[i])) buf.push(lines[i++]);
                const html = buf.join("\n");
                out.push({ kind: "html", html: rawHtmlBlock(html, inline, fix) });
                continue;
            }

            // blockquote
            if (RE.quote.test(line)) {
                const buf = [];
                while (i < lines.length && !RE.blank.test(lines[i]) && (RE.quote.test(lines[i]) || !startsBlock(lines[i], lines[i + 1]))) {
                    buf.push(lines[i].replace(RE.quote, ""));
                    i++;
                }
                out.push({ kind: "quote", html: `<blockquote>${join(parseBlocks(buf))}</blockquote>` });
                continue;
            }

            // table
            if (line.includes("|") && i + 1 < lines.length && RE.tableSep.test(lines[i + 1]) && lines[i + 1].includes("-")) {
                const head = splitRow(line);
                const aligns = splitRow(lines[i + 1]).map(c => {
                    const l = c.startsWith(":");
                    const r = c.endsWith(":");
                    return l && r ? "center" : r ? "right" : l ? "left" : "";
                });
                i += 2;
                const rows = [];
                while (i < lines.length && !RE.blank.test(lines[i]) && lines[i].includes("|")) rows.push(splitRow(lines[i++]));
                const cell = (tag, txt, k) =>
                    `<${tag}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ""}>${inline(txt)}</${tag}>`;
                const emptyHead = head.every(h => !h);
                out.push({
                    kind: "table",
                    html:
                        `<div class="table-wrap"><table>` +
                        (emptyHead ? "" : `<thead><tr>${head.map((h, k) => cell("th", h, k)).join("")}</tr></thead>`) +
                        `<tbody>${rows.map(r => `<tr>${head.map((_, k) => cell("td", r[k] ?? "", k)).join("")}</tr>`).join("")}</tbody>` +
                        `</table></div>`
                });
                continue;
            }

            // list
            m = line.match(RE.list);
            if (m) {
                const res = parseList(lines, i);
                out.push({ kind: "list", html: res.html });
                i = res.next;
                continue;
            }

            // paragraph
            const buf = [];
            while (i < lines.length && !RE.blank.test(lines[i])) {
                if (buf.length && startsBlock(lines[i], lines[i + 1])) break;
                buf.push(lines[i++]);
            }
            const text = buf.map(l => l.replace(/^\s+/, "")).join("\n");
            out.push({ kind: "p", html: `<p>${inline(text)}</p>` });
        }
        return out;
    }

    const join = blocks => blocks.map(blockHtml).join("\n");

    function parseList(lines, start) {
        const first = lines[start].match(RE.list);
        const baseIndent = first[1].replace(/\t/g, "    ").length;
        const ordered = /\d/.test(first[2]);
        const startNum = ordered ? parseInt(first[2], 10) : 1;
        const items = [];
        let i = start;
        let loose = false;

        while (i < lines.length) {
            const mm = lines[i].match(RE.list);
            if (!mm) break;
            const indent = mm[1].replace(/\t/g, "    ").length;
            if (indent < baseIndent || indent >= baseIndent + 2 + (items.length ? 0 : 0) + 4) break;
            if (indent > baseIndent + 3) break;
            if (/\d/.test(mm[2]) !== ordered && indent === baseIndent) break;

            const contentOffset = indent + mm[2].length + 1;
            const body = [mm[3]];
            i++;

            while (i < lines.length) {
                const l = lines[i];
                if (RE.blank.test(l)) {
                    // blank line: list continues only if the next non-blank line is indented or another item
                    let j = i;
                    while (j < lines.length && RE.blank.test(lines[j])) j++;
                    if (j >= lines.length) {
                        i = j;
                        break;
                    }
                    const nx = lines[j];
                    const nIndent = nx.match(/^\s*/)[0].replace(/\t/g, "    ").length;
                    const isItem = RE.list.test(nx);
                    if (nIndent > baseIndent || (isItem && nIndent === baseIndent)) {
                        body.push("");
                        if (isItem && nIndent === baseIndent) loose = true;
                        i = j;
                        if (isItem && nIndent === baseIndent) break;
                        continue;
                    }
                    break;
                }
                const lIndent = l.match(/^\s*/)[0].replace(/\t/g, "    ").length;
                if (RE.list.test(l) && lIndent <= baseIndent + 1) break; // next sibling
                if (lIndent > baseIndent) {
                    body.push(l.replace(/\t/g, "    ").slice(Math.min(contentOffset, lIndent)));
                    i++;
                } else if (!startsBlock(l, lines[i + 1])) {
                    body.push(l.trim()); // lazy continuation
                    i++;
                } else break;
            }
            items.push(body);
        }

        const tag = ordered ? "ol" : "ul";
        const li = body => {
            let task = "";
            const t = body[0].match(/^\[([ xX])\]\s+(.*)$/);
            if (t) {
                task = `<input type="checkbox" disabled${t[1] !== " " ? " checked" : ""}> `;
                body = [t[2], ...body.slice(1)];
            }
            const blocks = parseBlocks(body);
            const hasBlank = body.some(b => RE.blank.test(b));
            let html;
            if (!loose && !hasBlank && blocks.length && blocks[0].kind === "p") {
                // tight item: no <p> wrapper around the first paragraph
                const [firstP, ...rest] = blocks;
                html = firstP.html.replace(/^<p>|<\/p>$/g, "") + (rest.length ? "\n" + join(rest) : "");
            } else html = join(blocks);
            return `<li${task ? ' class="task"' : ""}>${task}${html}</li>`;
        };
        const startAttr = ordered && startNum !== 1 ? ` start="${startNum}"` : "";
        return { html: `<${tag}${startAttr}>${items.map(li).join("")}</${tag}>`, next: i };
    }

    const blockHtml = b =>
        b.kind === "heading"
            ? `<h${b.level} id="${escAttr(b.id)}">${b.inner}</h${b.level}>`
            : b.html;

    const lines = String(src).replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
    const blocks = parseBlocks(lines, true);
    return { blocks, headings, blockHtml, join };
}

/* raw HTML block: keep the structure, but run the text through the same safety rules as inline HTML */
function rawHtmlBlock(html, inline, fix) {
    // Only run the inline renderer on tags we recognise; structural tags (div, p, details, summary) pass through.
    const STRUCT = /<\/?(?:div|p|details|summary|table|thead|tbody|tr|td|th|center|section|figure|picture|ul|ol|li|h[1-6]|hr|pre|blockquote)\b[^>]*>/gi;
    let out = "";
    let last = 0;
    let m;
    while ((m = STRUCT.exec(html))) {
        out += inline(html.slice(last, m.index));
        out += cleanStructTag(m[0]);
        last = m.index + m[0].length;
    }
    out += inline(html.slice(last));
    return out;
}

function cleanStructTag(tag) {
    // keep only harmless attributes on structural tags (align, open, width, class-free)
    const name = tag.match(/^<\/?([a-zA-Z0-9]+)/)[1].toLowerCase();
    if (tag.startsWith("</")) return `</${name}>`;
    const keep = [];
    tag.replace(/([a-zA-Z-]+)\s*=\s*"([^"]*)"/g, (_, k, v) => {
        k = k.toLowerCase();
        if (["align", "width", "colspan", "rowspan", "valign"].includes(k)) keep.push(`${k}="${escAttr(v)}"`);
        return "";
    });
    if (/^<details[^>]*\bopen\b/i.test(tag)) keep.push("open");
    return `<${name}${keep.length ? " " + keep.join(" ") : ""}>`;
}
