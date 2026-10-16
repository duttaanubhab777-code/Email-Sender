// Prettier-style CSS formatter.
//
// The embed stylesheet is stored minified (it is also injected into the live
// preview). To show it nicely in the "Copy code" box we expand it here the same
// way Prettier would: 2 spaces, one declaration per line, one selector per line,
// "0.5" instead of ".5", spaces after commas / colons, blank line between rules,
// long values wrapped at 80 columns.

const WIDTH = 80;
const INDENT = "  ";

/* ---------- small scanners ---------- */

// split `text` on `sep` characters that are not inside (), [] or quotes
function splitTop(text, sep) {
    const parts = [];
    let depth = 0;
    let quote = "";
    let cur = "";
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quote) {
            cur += c;
            if (c === "\\") cur += text[++i] ?? "";
            else if (c === quote) quote = "";
        } else if (c === '"' || c === "'") {
            quote = c;
            cur += c;
        } else if (c === "(" || c === "[") {
            depth++;
            cur += c;
        } else if (c === ")" || c === "]") {
            depth--;
            cur += c;
        } else if (depth === 0 && sep.test(c)) {
            parts.push(cur);
            cur = "";
        } else cur += c;
    }
    parts.push(cur);
    return parts;
}

/* ---------- values ---------- */

const VALUE_TOKEN =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(url\([^)]*\))|(#[\da-fA-F]+\b)|(-{0,2}[A-Za-z_][\w-]*)|([+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)([A-Za-z%]*)/g;

function fmtNumber(num) {
    let sign = "";
    let n = num;
    if (n[0] === "+" || n[0] === "-") {
        sign = n[0] === "-" ? "-" : "";
        n = n.slice(1);
    }
    let [mant, exp] = n.toLowerCase().split("e");
    if (mant.includes(".")) {
        mant = mant.replace(/0+$/, "").replace(/\.$/, "");
    }
    if (mant.startsWith(".")) mant = "0" + mant;
    if (mant === "" ) mant = "0";
    return sign + mant + (exp !== undefined ? "e" + exp : "");
}

function fmtValue(raw) {
    let v = raw.trim().replace(/\s+/g, " ");
    v = v.replace(/\s*!\s*important/gi, " !important");
    v = v.replace(VALUE_TOKEN, (all, str, url, hex, ident, num, unit) => {
        if (num !== undefined && num !== "") return fmtNumber(num) + unit;
        return all;
    });
    // spaces around commas / inside parens
    let out = "";
    let quote = "";
    for (let i = 0; i < v.length; i++) {
        const c = v[i];
        if (quote) {
            out += c;
            if (c === "\\") out += v[++i] ?? "";
            else if (c === quote) quote = "";
            continue;
        }
        if (c === '"' || c === "'") {
            quote = c;
            out += c;
        } else if (c === ",") {
            out = out.replace(/\s+$/, "") + ", ";
            while (v[i + 1] === " ") i++;
        } else if (c === "(") {
            out += c;
            while (v[i + 1] === " ") i++;
        } else if (c === ")") {
            out = out.replace(/\s+$/, "") + c;
        } else out += c;
    }
    return out.trim();
}

// `fn(a, b, c)` -> broken over several lines, each arg on its own line
function breakFunction(expr, pad) {
    const m = /^([\w-]+)\(([\s\S]*)\)$/.exec(expr);
    if (!m) return null;
    const args = splitTop(m[2], /,/).map(a => a.trim());
    if (args.length < 2 && !/\(/.test(m[2])) return null;
    const inner = pad + INDENT;
    const lines = args.map((a, i) => {
        const comma = i < args.length - 1 ? "," : "";
        const one = inner + a + comma;
        if (one.length <= WIDTH) return one;
        const nested = breakFunction(a, inner);
        return nested ? nested + comma : one;
    });
    return `${pad}${m[1]}(\n${lines.join("\n")}\n${pad})`;
}

function printDecl(pad, prop, rawValue) {
    const value = fmtValue(rawValue);
    const head = `${pad}${prop}:`;
    const one = `${head} ${value};`;
    const items = splitTop(value, /,/).map(s => s.trim());
    const multiWord = items.some(it => splitTop(it, /\s/).filter(Boolean).length > 1);
    const isCustom = prop.startsWith("--");

    // several comma separated values -> one per line (Prettier 3 style)
    if (items.length > 1 && !isCustom && (multiWord || one.length > WIDTH)) {
        const inner = pad + INDENT;
        const lines = items.map((it, i) => {
            const end = i < items.length - 1 ? "," : ";";
            const line = inner + it + end;
            if (line.length <= WIDTH) return line;
            const b = breakFunction(it, inner);
            return b ? b + end : line;
        });
        return `${head}\n${lines.join("\n")}`;
    }

    if (one.length <= WIDTH) return one;

    // a single long function: wrap its arguments
    const direct = breakFunction(value, pad);
    if (direct) return `${head} ${direct.trimStart()};`;

    // "1px solid rgba(...)" style: wrap the last function
    const words = splitTop(value, /\s/).filter(Boolean);
    const lastFn = words[words.length - 1];
    if (words.length > 1 && /\(/.test(lastFn)) {
        const b = breakFunction(lastFn, pad);
        if (b) {
            return `${head} ${words.slice(0, -1).join(" ")} ${b.trimStart()};`;
        }
    }
    return one;
}

/* ---------- selectors & at-rules ---------- */

function fmtSelector(sel) {
    return splitTop(sel, /,/)
        .map(part => {
            let out = "";
            let depth = 0;
            let quote = "";
            const s = part.trim().replace(/\s+/g, " ");
            for (let i = 0; i < s.length; i++) {
                const c = s[i];
                if (quote) {
                    out += c;
                    if (c === quote) quote = "";
                    continue;
                }
                if (c === '"' || c === "'") {
                    quote = c;
                    out += c;
                } else if (c === "(" || c === "[") {
                    depth++;
                    out += c;
                } else if (c === ")" || c === "]") {
                    depth--;
                    out += c;
                } else if (depth === 0 && (c === ">" || c === "+" || c === "~")) {
                    out = out.replace(/\s+$/, "") + " " + c + " ";
                    while (s[i + 1] === " ") i++;
                } else out += c;
            }
            return out.trim();
        })
        .join(",\n");
}

function fmtAtPrelude(text) {
    let s = text.trim().replace(/\s+/g, " ");
    // (feature:value) -> (feature: value)
    s = s.replace(/\(\s*([\w-]+)\s*:\s*/g, "($1: ");
    s = s.replace(/\s*,\s*/g, ", ");
    s = s.replace(VALUE_TOKEN, (all, str, url, hex, ident, num, unit) =>
        num !== undefined && num !== "" ? fmtNumber(num) + unit : all
    );
    return s;
}

/* ---------- parser / printer ---------- */

function parseBlock(src, start) {
    const nodes = [];
    let i = start;
    let buf = "";
    let paren = 0;
    let quote = "";
    while (i < src.length) {
        const c = src[i];
        if (quote) {
            buf += c;
            if (c === "\\") buf += src[++i] ?? "";
            else if (c === quote) quote = "";
            i++;
            continue;
        }
        if (c === '"' || c === "'") {
            quote = c;
            buf += c;
        } else if (c === "/" && src[i + 1] === "*") {
            const e = src.indexOf("*/", i + 2);
            const stop = e === -1 ? src.length : e + 2;
            if (!buf.trim()) nodes.push({ type: "comment", text: src.slice(i, stop) });
            i = stop;
            continue;
        } else if (c === "(" || c === "[") {
            paren++;
            buf += c;
        } else if (c === ")" || c === "]") {
            paren--;
            buf += c;
        } else if (paren === 0 && c === "{") {
            const [children, end] = parseBlock(src, i + 1);
            nodes.push({ type: "rule", head: buf.trim(), children });
            buf = "";
            i = end + 1;
            continue;
        } else if (paren === 0 && c === "}") {
            if (buf.trim()) nodes.push({ type: "decl", text: buf.trim() });
            return [nodes, i];
        } else if (paren === 0 && c === ";") {
            if (buf.trim()) nodes.push({ type: "decl", text: buf.trim() });
            buf = "";
        } else buf += c;
        i++;
    }
    if (buf.trim()) nodes.push({ type: "decl", text: buf.trim() });
    return [nodes, i];
}

function printNodes(nodes, depth) {
    const pad = INDENT.repeat(depth);
    const out = [];
    nodes.forEach((n, idx) => {
        let text;
        if (n.type === "comment") text = pad + n.text;
        else if (n.type === "decl") {
            if (n.text.startsWith("@")) text = `${pad}${fmtAtPrelude(n.text)};`;
            else {
                const k = n.text.indexOf(":");
                text =
                    k === -1
                        ? `${pad}${n.text};`
                        : printDecl(pad, n.text.slice(0, k).trim(), n.text.slice(k + 1));
            }
        } else {
            const head = n.head.startsWith("@")
                ? fmtAtPrelude(n.head)
                : fmtSelector(n.head)
                      .split("\n")
                      .join("\n" + pad);
            const body = printNodes(n.children, depth + 1);
            text = `${pad}${head} {${body ? "\n" + body + "\n" + pad : ""}}`;
        }
        const prev = nodes[idx - 1];
        // blank line between rules (never between plain declarations)
        if (idx > 0 && (n.type === "rule" || prev.type === "rule")) out.push("");
        out.push(text);
    });
    return out.join("\n");
}

export function formatCss(css) {
    const [nodes] = parseBlock(css, 0);
    return printNodes(nodes, 0);
}
