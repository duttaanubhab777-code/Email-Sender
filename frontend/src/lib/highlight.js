// Tiny dependency-free syntax highlighter.
// Output uses the same token colours as VS Code "Dark+" and "Light+"
// (the colours themselves live in styles/code.css).
//
// highlight(code, lang) -> safe HTML string (all text is escaped).

const esc = s =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const wrap = (cls, text) =>
    cls ? `<span class="tk-${cls}">${esc(text)}</span>` : esc(text);

/* ------------------------------------------------------------------ */
/* Language tables                                                     */
/* ------------------------------------------------------------------ */

const set = s => new Set(s.split(/\s+/).filter(Boolean));

const LANGS = {
    js: {
        control: set(
            "import export from default return if else for while do switch case break continue throw try catch finally await yield as of in"
        ),
        keyword: set(
            "const let var function class extends new typeof instanceof void delete async static get set super"
        ),
        constant: set("true false null undefined this NaN Infinity"),
        builtin: set(
            "JSON Math Promise Object Array String Number Boolean Date Error Response Request URL URLSearchParams FormData Headers Map Set"
        ),
        globals: set(
            "console window document process crypto localStorage sessionStorage navigator location"
        ),
        regex: true,
        template: true
    },
    php: {
        control: set(
            "if else elseif foreach for while do switch case break continue return exit die try catch finally throw include require include_once require_once"
        ),
        keyword: set(
            "function class public private protected static new extends implements namespace use const echo isset empty array"
        ),
        constant: set("true false null TRUE FALSE NULL"),
        builtin: set(
            "trim json_encode curl_init curl_setopt_array curl_exec curl_getinfo curl_close http_response_code header"
        ),
        hashComment: true,
        phpVars: true
    },
    python: {
        control: set(
            "if elif else for while return try except finally raise with as import from pass break continue yield in is not and or lambda assert"
        ),
        keyword: set("def class global nonlocal async await del"),
        constant: set("True False None self cls"),
        builtin: set(
            "print len range str int float dict list set tuple open isinstance super"
        ),
        hashComment: true,
        tripleQuote: true,
        decorator: true
    },
    java: {
        control: set(
            "if else for while do switch case break continue return try catch finally throw import package"
        ),
        keyword: set(
            "public private protected static final class interface extends implements new void throws var abstract this super"
        ),
        constant: set("true false null"),
        builtin: set("String int long double boolean char byte float System"),
        textBlock: true,
        annotation: true
    },
    csharp: {
        control: set(
            "if else for foreach while do switch case break continue return try catch finally throw using await"
        ),
        keyword: set(
            "public private protected internal static class struct interface new void var async namespace readonly const override virtual abstract"
        ),
        constant: set("true false null this"),
        builtin: set("string int long double bool char byte float object"),
        textBlock: false
    },
    go: {
        control: set(
            "if else for range switch case break continue return go defer import package select fallthrough goto"
        ),
        keyword: set("func var const type struct interface map chan"),
        constant: set("true false nil iota"),
        builtin: set(
            "string int int64 bool byte rune error float64 any make new len cap append panic"
        ),
        backtick: true
    },
    ruby: {
        control: set(
            "if elsif else unless while until for in do end begin rescue ensure return yield case when then break next require require_relative"
        ),
        keyword: set("def class module self super lambda proc"),
        constant: set("true false nil"),
        builtin: set("puts print p"),
        hashComment: true,
        rubySymbols: true
    },
    dart: {
        control: set(
            "if else for while do switch case break continue return try catch finally throw await import export part"
        ),
        keyword: set(
            "class extends implements with new void var final const static async late required abstract factory enum mixin"
        ),
        constant: set("true false null this"),
        builtin: set(
            "String int double bool num dynamic Future List Map Set print"
        )
    },
    bash: {
        control: set("if then else fi for do done while case esac"),
        keyword: set("export function"),
        constant: set(""),
        builtin: set(""),
        hashComment: true,
        shell: true
    }
};

/* ------------------------------------------------------------------ */
/* Generic code tokenizer (JS, PHP, Python, Java, C#, Go ...)          */
/* ------------------------------------------------------------------ */

const IDENT = /[A-Za-z_$][\w$]*/y;
const NUMBER = /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?|\.\d+)[a-zA-Z]*/y;
const OPERATOR = /(?:=>|===|!==|\?\?=?|\*\*=?|<<=?|>>>?=?|[-+*/%&|^!=<>?:~]=?|&&|\|\||\+\+|--|\.\.\.|->|::|<-)/y;

function matchAt(re, src, i) {
    re.lastIndex = i;
    const m = re.exec(src);
    return m && m.index === i ? m[0] : null;
}

// where a "/" can start a regular expression instead of dividing
const REGEX_PREV = new Set(["(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "return", "=>", "typeof", "&&", "||", "+", "-"]);

function isLetter(ch) {
    return /[A-Za-z_$]/.test(ch);
}

function highlightCode(src, langKey, opts = {}) {
    const L = LANGS[langKey] || LANGS.js;
    const jsx = !!opts.jsx;
    let out = "";
    let i = 0;
    let prevSig = ""; // last significant token text (for regex / property)

    const push = (cls, text) => {
        out += wrap(cls, text);
        if (!/^\s+$/.test(text)) {
            prevSig = text;
        }
    };

    // read a string with escapes; returns end index (exclusive)
    const readQuoted = (start, q) => {
        let j = start + 1;
        while (j < src.length) {
            if (src[j] === "\\") j += 2;
            else if (src[j] === q) return j + 1;
            else if (src[j] === "\n" && q !== "`") return j;
            else j++;
        }
        return src.length;
    };

    // template literal with nested ${ ... } highlighting
    const readTemplate = start => {
        push("str", "`");
        let j = start + 1;
        let buf = "";
        const flush = () => {
            if (buf) {
                push("str", buf);
                buf = "";
            }
        };
        while (j < src.length) {
            const c = src[j];
            if (c === "\\") {
                buf += src.slice(j, j + 2);
                j += 2;
            } else if (c === "`") {
                flush();
                push("str", "`");
                return j + 1;
            } else if (c === "$" && src[j + 1] === "{") {
                flush();
                push("tpl", "${");
                // find matching }
                let depth = 1;
                let k = j + 2;
                while (k < src.length && depth) {
                    if (src[k] === "{") depth++;
                    else if (src[k] === "}") depth--;
                    else if (src[k] === '"' || src[k] === "'")
                        k = readQuoted(k, src[k]) - 1;
                    k++;
                }
                const inner = src.slice(j + 2, k - 1);
                out += highlightCode(inner, langKey, opts);
                push("tpl", "}");
                j = k;
            } else {
                buf += c;
                j++;
            }
        }
        flush();
        return j;
    };

    // <Tag attr="x" attr={expr}>children</Tag> (JSX)
    const readJsx = start => {
        let j = start;
        const readTag = () => {
            // returns { end, selfClose, closing, name }
            push("pun-tag", "<");
            j++;
            let closing = false;
            if (src[j] === "/") {
                push("pun-tag", "/");
                j++;
                closing = true;
            }
            const name = matchAt(/[A-Za-z_$][\w$.:-]*/y, src, j) || "";
            if (name) {
                const first = name[0];
                const isComp = first === first.toUpperCase() && first !== first.toLowerCase();
                push(isComp ? "type" : "tag", name);
                j += name.length;
            }
            let selfClose = false;
            while (j < src.length) {
                const c = src[j];
                if (/\s/.test(c)) {
                    const ws = matchAt(/\s+/y, src, j);
                    out += esc(ws);
                    j += ws.length;
                } else if (c === "/" && src[j + 1] === ">") {
                    push("pun-tag", "/>");
                    j += 2;
                    selfClose = true;
                    break;
                } else if (c === ">") {
                    push("pun-tag", ">");
                    j++;
                    break;
                } else if (c === "{") {
                    // spread attributes {...props}
                    const end = matchBrace(j);
                    push("pun", "{");
                    out += highlightCode(src.slice(j + 1, end), langKey, opts);
                    push("pun", "}");
                    j = end + 1;
                } else if (c === "=") {
                    push("op", "=");
                    j++;
                } else if (c === '"' || c === "'") {
                    const end = readQuoted(j, c);
                    push("attrval", src.slice(j, end));
                    j = end;
                } else {
                    const attr = matchAt(/[\w$:-]+/y, src, j);
                    if (!attr) {
                        push("", c);
                        j++;
                    } else {
                        push("attr", attr);
                        j += attr.length;
                    }
                }
            }
            return { closing, selfClose, name };
        };

        const matchBrace = from => {
            let depth = 0;
            for (let k = from; k < src.length; k++) {
                const c = src[k];
                if (c === '"' || c === "'" || c === "`") {
                    k = readQuoted(k, c) - 1;
                } else if (c === "{") depth++;
                else if (c === "}") {
                    depth--;
                    if (depth === 0) return k;
                }
            }
            return src.length;
        };

        let depth = 0;
        do {
            const tag = readTag();
            if (tag.selfClose) {
                // nothing to track
            } else if (tag.closing) depth--;
            else depth++;
            if (depth <= 0) break;
            // children until next "<"
            while (j < src.length) {
                if (src[j] === "{") {
                    const end = matchBrace(j);
                    push("pun", "{");
                    out += highlightCode(src.slice(j + 1, end), langKey, opts);
                    push("pun", "}");
                    j = end + 1;
                } else if (src[j] === "<") {
                    break;
                } else {
                    let k = j;
                    while (k < src.length && src[k] !== "<" && src[k] !== "{") k++;
                    out += esc(src.slice(j, k));
                    j = k;
                }
            }
        } while (j < src.length && depth > 0);
        return j;
    };

    while (i < src.length) {
        const c = src[i];

        // whitespace
        if (/\s/.test(c)) {
            const ws = matchAt(/\s+/y, src, i);
            out += esc(ws);
            i += ws.length;
            continue;
        }

        // PHP open/close tags
        if (L.phpVars && (src.startsWith("<?php", i) || src.startsWith("?>", i))) {
            const t = src.startsWith("<?php", i) ? "<?php" : "?>";
            push("kw", t);
            i += t.length;
            continue;
        }

        // comments
        if (c === "/" && src[i + 1] === "/" && !(L.shell)) {
            const end = src.indexOf("\n", i);
            const stop = end === -1 ? src.length : end;
            push("cmt", src.slice(i, stop));
            i = stop;
            continue;
        }
        if (c === "/" && src[i + 1] === "*") {
            const end = src.indexOf("*/", i + 2);
            const stop = end === -1 ? src.length : end + 2;
            push("cmt", src.slice(i, stop));
            i = stop;
            continue;
        }
        if (c === "#" && L.hashComment && !(L.shell && /[\w-]/.test(src[i - 1] || ""))) {
            const end = src.indexOf("\n", i);
            const stop = end === -1 ? src.length : end;
            push("cmt", src.slice(i, stop));
            i = stop;
            continue;
        }

        // Python triple quotes / Java text blocks
        if ((L.tripleQuote || L.textBlock) && (src.startsWith('"""', i) || (L.tripleQuote && src.startsWith("'''", i)))) {
            const q = src.slice(i, i + 3);
            const end = src.indexOf(q, i + 3);
            const stop = end === -1 ? src.length : end + 3;
            push("str", src.slice(i, stop));
            i = stop;
            continue;
        }

        // strings
        if (c === '"' || c === "'") {
            // Dart/Java char etc. all treated as strings
            const end = readQuoted(i, c);
            push("str", src.slice(i, end));
            i = end;
            continue;
        }
        if (c === "`") {
            if (L.template) {
                i = readTemplate(i);
                continue;
            }
            if (L.backtick) {
                const end = readQuoted(i, "`");
                push("str", src.slice(i, end));
                i = end;
                continue;
            }
        }

        // JSX element
        if (jsx && c === "<" && /[A-Za-z>]/.test(src[i + 1] || "") && (REGEX_PREV.has(prevSig) || prevSig === "" || prevSig === ")")) {
            i = readJsx(i);
            continue;
        }

        // regex literal
        if (L.regex && c === "/" && (REGEX_PREV.has(prevSig) || prevSig === "")) {
            const m = matchAt(/\/(?![*/])(?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\\n])+\/[dgimsuvy]*/y, src, i);
            if (m) {
                push("regex", m);
                i += m.length;
                continue;
            }
        }

        // PHP / shell / Ruby variables & symbols
        if (c === "$" && (L.phpVars || L.shell)) {
            const m = matchAt(/\$(?:\{[^}]*\}|[A-Za-z_]\w*)/y, src, i);
            if (m) {
                push("var", m);
                i += m.length;
                continue;
            }
        }
        if (c === "@" && (L.decorator || L.annotation)) {
            const m = matchAt(/@[A-Za-z_][\w.]*/y, src, i);
            if (m) {
                push("fn", m);
                i += m.length;
                continue;
            }
        }
        if (c === ":" && L.rubySymbols && /[A-Za-z_]/.test(src[i + 1] || "") && !/[\w)\]"']/.test(src[i - 1] || "")) {
            const m = matchAt(/:[A-Za-z_]\w*[?!]?/y, src, i);
            push("const", m);
            i += m.length;
            continue;
        }

        // shell flags: -X, --header
        if (L.shell && c === "-" && /[A-Za-z-]/.test(src[i + 1] || "")) {
            const m = matchAt(/--?[A-Za-z][\w-]*/y, src, i);
            if (m) {
                push("flag", m);
                i += m.length;
                continue;
            }
        }
        if (L.shell && c === "\\") {
            push("pun", c);
            i++;
            continue;
        }

        // numbers
        if (/\d/.test(c) || (c === "." && /\d/.test(src[i + 1] || ""))) {
            const m = matchAt(NUMBER, src, i);
            if (m) {
                push("num", m);
                i += m.length;
                continue;
            }
        }

        // identifiers
        if (isLetter(c)) {
            const word = matchAt(IDENT, src, i);
            i += word.length;
            // next non-space char
            let n = i;
            while (n < src.length && (src[n] === " " || src[n] === "\t")) n++;
            const next = src[n];
            const afterDot = prevSig === "." || prevSig === "?." || prevSig === "->" || prevSig === "::";
            const afterNew = prevSig === "new";
            const afterDecl = ["function", "def", "func", "class", "struct", "interface", "enum"].includes(prevSig);

            let cls;
            if (L.control.has(word) && !afterDot) cls = "ctl";
            else if (L.keyword.has(word) && !afterDot) cls = "kw";
            else if (L.constant.has(word) && !afterDot) cls = "const";
            else if (L.globals && L.globals.has(word) && !afterDot && next !== "(") cls = "var";
            else if (L.builtin.has(word) && !afterDot && next !== "(" && !L.phpVars) cls = "type";
            else if (afterNew || (afterDecl && (prevSig === "class" || prevSig === "struct" || prevSig === "interface" || prevSig === "enum"))) cls = "type";
            else if (afterDecl) cls = "fn";
            else if (next === "(" || (L.builtin.has(word) && next === "(")) cls = afterDot || /^[a-z_]/.test(word) || L.builtin.has(word) ? "fn" : "type";
            else if (afterDot) cls = "prop";
            else if (/^[A-Z][A-Za-z0-9_$]*$/.test(word) && /[a-z]/.test(word)) cls = "type";
            else if (L.shell && prevSig === "") cls = "fn";
            else if (L.shell && prevSig === "\\") cls = "";
            else cls = "var";

            // object keys:  name: value  /  name => value
            if (cls === "var" && next === ":" && src[n + 1] !== ":" && (prevSig === "{" || prevSig === ",")) cls = "prop";

            push(cls, word);
            continue;
        }

        // operators
        const op = matchAt(OPERATOR, src, i);
        if (op) {
            push("op", op);
            i += op.length;
            continue;
        }

        // punctuation
        if ("{}[]();,.".includes(c)) {
            push("pun", c);
            i++;
            continue;
        }

        // anything else
        push("", c);
        i++;
    }
    return out;
}

/* ------------------------------------------------------------------ */
/* CSS                                                                 */
/* ------------------------------------------------------------------ */

function highlightCssValue(v) {
    let out = "";
    let i = 0;
    while (i < v.length) {
        const c = v[i];
        let m;
        if (/\s/.test(c)) {
            m = matchAt(/\s+/y, v, i);
            out += esc(m);
        } else if (c === '"' || c === "'") {
            let j = i + 1;
            while (j < v.length && v[j] !== c) j += v[j] === "\\" ? 2 : 1;
            m = v.slice(i, j + 1);
            out += wrap("str", m);
        } else if (c === "/" && v[i + 1] === "*") {
            const e = v.indexOf("*/", i + 2);
            m = v.slice(i, e === -1 ? v.length : e + 2);
            out += wrap("cmt", m);
        } else if ((m = matchAt(/#[\da-fA-F]{3,8}\b/y, v, i))) {
            out += wrap("num", m);
        } else if ((m = matchAt(/[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?(?:%|[a-zA-Z]+)?/y, v, i)) && !/[\w-]/.test(v[i - 1] || "")) {
            out += wrap("num", m);
        } else if ((m = matchAt(/!\s*important/y, v, i))) {
            out += wrap("kw", m);
        } else if ((m = matchAt(/--[\w-]+/y, v, i))) {
            out += wrap("cssprop", m);
        } else if ((m = matchAt(/[A-Za-z_-][\w-]*/y, v, i))) {
            if (v[i + m.length] === "(") out += wrap("fn", m);
            else out += wrap("cssval", m);
        } else {
            m = c;
            out += wrap("pun", c);
        }
        i += m.length;
    }
    return out;
}

function highlightSelector(sel) {
    let out = "";
    let i = 0;
    while (i < sel.length) {
        const c = sel[i];
        let m;
        if (/\s/.test(c)) {
            m = matchAt(/\s+/y, sel, i);
            out += esc(m);
        } else if (c === "/" && sel[i + 1] === "*") {
            const e = sel.indexOf("*/", i + 2);
            m = sel.slice(i, e === -1 ? sel.length : e + 2);
            out += wrap("cmt", m);
        } else if ((m = matchAt(/\.[\w-]+/y, sel, i))) {
            out += wrap("selc", m);
        } else if ((m = matchAt(/#[\w-]+/y, sel, i))) {
            out += wrap("selc", m);
        } else if ((m = matchAt(/::?[\w-]+/y, sel, i))) {
            out += wrap("selc", m);
        } else if (c === "[") {
            let j = sel.indexOf("]", i);
            if (j === -1) j = sel.length - 1;
            const inner = sel.slice(i + 1, j);
            const am = /^([^~|^$*=\s]+)(\s*[~|^$*]?=\s*)?(.*)$/.exec(inner);
            out += wrap("pun", "[");
            if (am) {
                out += wrap("attr", am[1]);
                if (am[2]) out += wrap("op", am[2]);
                if (am[3]) out += wrap("str", am[3]);
            }
            out += wrap("pun", "]");
            m = sel.slice(i, j + 1);
        } else if ((m = matchAt(/[A-Za-z][\w-]*/y, sel, i))) {
            out += wrap("seltag", m);
        } else if (c === "*") {
            m = c;
            out += wrap("seltag", c);
        } else if (">+~,".includes(c)) {
            m = c;
            out += wrap("pun", c);
        } else if (c === "(" || c === ")") {
            m = c;
            out += wrap("pun", c);
        } else if ((m = matchAt(/[\d%.]+/y, sel, i))) {
            out += wrap("num", m);
        } else {
            m = c;
            out += esc(c);
        }
        i += m.length;
    }
    return out;
}

// finds next "{", ";" or "}" outside of (), [] and strings
function nextCssDelim(src, from) {
    let paren = 0;
    for (let i = from; i < src.length; i++) {
        const c = src[i];
        if (c === '"' || c === "'") {
            i++;
            while (i < src.length && src[i] !== c) i += src[i] === "\\" ? 2 : 1;
        } else if (c === "/" && src[i + 1] === "*") {
            const e = src.indexOf("*/", i + 2);
            i = e === -1 ? src.length : e + 1;
        } else if (c === "(" || c === "[") paren++;
        else if (c === ")" || c === "]") paren--;
        else if (!paren && (c === "{" || c === ";" || c === "}")) return i;
    }
    return -1;
}

function highlightCss(src) {
    let out = "";
    let i = 0;
    while (i < src.length) {
        const c = src[i];
        if (/\s/.test(c)) {
            const ws = matchAt(/\s+/y, src, i);
            out += esc(ws);
            i += ws.length;
            continue;
        }
        if (c === "/" && src[i + 1] === "*") {
            const e = src.indexOf("*/", i + 2);
            const stop = e === -1 ? src.length : e + 2;
            out += wrap("cmt", src.slice(i, stop));
            i = stop;
            continue;
        }
        if (c === "}" || c === ";") {
            out += wrap("pun", c);
            i++;
            continue;
        }
        const d = nextCssDelim(src, i);
        if (d === -1) {
            out += esc(src.slice(i));
            break;
        }
        const chunk = src.slice(i, d);
        if (src[d] === "{") {
            if (chunk.trimStart().startsWith("@")) {
                const am = /^(\s*)(@[\w-]+)([\s\S]*)$/.exec(chunk);
                out += esc(am[1]) + wrap("ctl", am[2]);
                // params: (feature: value) pairs
                out += am[3].replace(/(\([^()]*(?:\([^()]*\)[^()]*)*\))|([^()]+)/g, (all, paren, plain) => {
                    if (paren) {
                        const inner = paren.slice(1, -1);
                        const k = inner.indexOf(":");
                        if (k === -1) return wrap("pun", "(") + wrap("cssprop", inner) + wrap("pun", ")");
                        return (
                            wrap("pun", "(") +
                            wrap("cssprop", inner.slice(0, k)) +
                            wrap("pun", ":") +
                            highlightCssValue(inner.slice(k + 1)) +
                            wrap("pun", ")")
                        );
                    }
                    if (/^\s+$/.test(plain)) return plain;
                    const lead = plain.match(/^\s*/)[0];
                    const trail = plain.match(/\s*$/)[0];
                    return lead + wrap("cssval", plain.trim()) + trail;
                });
            } else if (/^\s*(?:from|to|\d+(?:\.\d+)?%)(?:\s*,\s*(?:from|to|\d+(?:\.\d+)?%))*\s*$/.test(chunk)) {
                out += highlightCssValue(chunk).replace(/<span class="tk-cssval">(from|to)<\/span>/g, '<span class="tk-seltag">$1</span>');
            } else {
                out += highlightSelector(chunk);
            }
            out += wrap("pun", "{");
            i = d + 1;
            continue;
        }
        // declaration or statement at-rule (@import ...;)
        if (chunk.trimStart().startsWith("@")) {
            const am = /^(\s*)(@[\w-]+)([\s\S]*)$/.exec(chunk);
            out += esc(am[1]) + wrap("ctl", am[2]) + highlightCssValue(am[3]);
        } else {
            const k = chunk.indexOf(":");
            if (k === -1) {
                out += esc(chunk);
            } else {
                const name = chunk.slice(0, k);
                const lead = name.match(/^\s*/)[0];
                out += esc(lead) + wrap("cssprop", name.trim()) + wrap("pun", ":") + highlightCssValue(chunk.slice(k + 1));
            }
        }
        i = d;
    }
    return out;
}

/* ------------------------------------------------------------------ */
/* HTML (with embedded <style> / <script>)                             */
/* ------------------------------------------------------------------ */

function highlightHtml(src) {
    let out = "";
    let i = 0;
    while (i < src.length) {
        if (src.startsWith("<!--", i)) {
            const e = src.indexOf("-->", i + 4);
            const stop = e === -1 ? src.length : e + 3;
            out += wrap("cmt", src.slice(i, stop));
            i = stop;
            continue;
        }
        if (src[i] === "<" && /[A-Za-z!/]/.test(src[i + 1] || "")) {
            let j = i + 1;
            out += wrap("pun-tag", "<");
            if (src[j] === "/") {
                out += wrap("pun-tag", "/");
                j++;
            }
            if (src[j] === "!") {
                // <!doctype html>
                const e = src.indexOf(">", j);
                const stop = e === -1 ? src.length : e;
                out += wrap("pun-tag", src.slice(j, stop));
                out += wrap("pun-tag", ">");
                i = stop + 1;
                continue;
            }
            const name = matchAt(/[A-Za-z][\w:-]*/y, src, j) || "";
            out += wrap("tag", name);
            j += name.length;
            // attributes
            while (j < src.length) {
                const ch = src[j];
                if (/\s/.test(ch)) {
                    const ws = matchAt(/\s+/y, src, j);
                    out += esc(ws);
                    j += ws.length;
                } else if (ch === "/" && src[j + 1] === ">") {
                    out += wrap("pun-tag", "/>");
                    j += 2;
                    break;
                } else if (ch === ">") {
                    out += wrap("pun-tag", ">");
                    j++;
                    break;
                } else if (ch === "=") {
                    out += wrap("op", "=");
                    j++;
                } else if (ch === '"' || ch === "'") {
                    const e = src.indexOf(ch, j + 1);
                    const stop = e === -1 ? src.length : e + 1;
                    out += wrap("attrval", src.slice(j, stop));
                    j = stop;
                } else {
                    const a = matchAt(/[^\s=>/"']+/y, src, j);
                    if (!a) {
                        out += esc(ch);
                        j++;
                    } else {
                        out += wrap("attr", a);
                        j += a.length;
                    }
                }
            }
            i = j;
            // raw-text elements
            const lower = name.toLowerCase();
            if ((lower === "style" || lower === "script") && src[i - 2] !== "/" && !/^<\//.test(src.slice(i - name.length - 3, i))) {
                const close = src.toLowerCase().indexOf(`</${lower}`, i);
                const stop = close === -1 ? src.length : close;
                const body = src.slice(i, stop);
                out += lower === "style" ? highlightCss(body) : highlightCode(body, "js");
                i = stop;
            }
            continue;
        }
        // text / entities
        let j = i;
        while (j < src.length && src[j] !== "<") j++;
        if (j === i) j = i + 1;
        out += esc(src.slice(i, j)).replace(/&amp;[#\w]+;/g, m => `<span class="tk-const">${m}</span>`);
        i = j;
    }
    return out;
}

/* ------------------------------------------------------------------ */
/* JSON                                                                */
/* ------------------------------------------------------------------ */

function highlightJson(src) {
    const re =
        /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],:])/g;
    let out = "";
    let last = 0;
    let m;
    while ((m = re.exec(src))) {
        out += esc(src.slice(last, m.index));
        const [, str, colon, kw, num, pun] = m;
        if (str) {
            out += wrap(colon ? "prop" : "str", str);
            if (colon) out += wrap("pun", colon);
        } else if (kw) out += wrap("kw", kw);
        else if (num) out += wrap("num", num);
        else out += wrap("pun", pun);
        last = re.lastIndex;
    }
    return out + esc(src.slice(last));
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

const ALIASES = {
    html: "html",
    htm: "html",
    css: "css",
    js: "js",
    javascript: "js",
    node: "js",
    jsx: "jsx",
    react: "jsx",
    next: "jsx",
    json: "json",
    php: "php",
    python: "python",
    py: "python",
    java: "java",
    csharp: "csharp",
    cs: "csharp",
    go: "go",
    ruby: "ruby",
    rb: "ruby",
    dart: "dart",
    curl: "bash",
    bash: "bash",
    sh: "bash"
};

export function highlight(code, lang = "js") {
    // plain text (not code): only escape it
    if (String(lang).toLowerCase() === "text") return esc(code);
    const key = ALIASES[String(lang).toLowerCase()] || "js";
    try {
        switch (key) {
            case "html":
                return highlightHtml(code);
            case "css":
                return highlightCss(code);
            case "json":
                return highlightJson(code);
            case "jsx":
                return highlightCode(code, "js", { jsx: true });
            default:
                return highlightCode(code, key);
        }
    } catch {
        return esc(code);
    }
}

// maps a "Send & embed" tab id to a language
export const TAB_LANG = {
    styled: "html",
    plain: "html",
    js: "js",
    react: "jsx",
    next: "jsx",
    node: "js",
    php: "php",
    python: "python",
    java: "java",
    csharp: "csharp",
    go: "go",
    ruby: "ruby",
    dart: "dart",
    curl: "bash"
};
