// The /docs page: the README turned into a small book.
// One self-contained HTML string (no build step, no extra package).
//  - screen: cover, contents, chapters, dark/light, search, progress bar, copy buttons
//  - print / "Download PDF": a clean light version (cover + contents + chapters, every section opened)

const esc = s =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ------------------------------------------------------------------ */
/* CSS                                                                 */
/* ------------------------------------------------------------------ */
const LIGHT_VARS = String.raw`
    --bg: #e9eff9;
    --page: #ffffff;
    --page-2: #f5f8fd;
    --ink: #13233d;
    --ink-2: #2b3f5c;
    --muted: #5b6b86;
    --line: #dfe7f3;
    --brand: #0b57c4;
    --brand-2: #1d8bff;
    --orange: #ff7a1a;
    --tint: #eaf2ff;
    --tint-2: #fff1e4;
    --code-tint: #e8f0fe;
    --shadow: 0 14px 40px rgba(10, 50, 120, 0.12);
    --vs-bg: #ffffff; --vs-fg: #1f1f1f; --vs-cmt: #008000; --vs-str: #a31515; --vs-num: #098658;
    --vs-kw: #0000ff; --vs-ctl: #af00db; --vs-fn: #795e26; --vs-type: #267f99; --vs-var: #001080;
    --vs-prop: #001080; --vs-const: #0000ff; --vs-regex: #811f3f; --vs-op: #1f1f1f; --vs-pun: #1f1f1f;
    --vs-tag: #800000; --vs-tag-pun: #800000; --vs-attr: #e50000; --vs-attrval: #0000ff; --vs-selc: #800000;
    --vs-cssprop: #e50000; --vs-cssval: #0451a5; --vs-json-key: #0451a5; --vs-flag: #001080; --vs-tpl: #0000ff;
    --code-line: #dfe3ea;
`;
const DARK_VARS = String.raw`
    --bg: #050d1b;
    --page: #0b1930;
    --page-2: #0f2142;
    --ink: #e8eefb;
    --ink-2: #c5d2ea;
    --muted: #93a5c4;
    --line: #1c2f50;
    --brand: #5aa8ff;
    --brand-2: #1d8bff;
    --orange: #ff8a3a;
    --tint: #0f2447;
    --tint-2: #2a1d12;
    --code-tint: #12294d;
    --shadow: 0 18px 50px rgba(0, 0, 0, 0.5);
    --vs-bg: #1e1e1e; --vs-fg: #d4d4d4; --vs-cmt: #6a9955; --vs-str: #ce9178; --vs-num: #b5cea8;
    --vs-kw: #569cd6; --vs-ctl: #c586c0; --vs-fn: #dcdcaa; --vs-type: #4ec9b0; --vs-var: #9cdcfe;
    --vs-prop: #9cdcfe; --vs-const: #569cd6; --vs-regex: #d16969; --vs-op: #d4d4d4; --vs-pun: #d4d4d4;
    --vs-tag: #569cd6; --vs-tag-pun: #808080; --vs-attr: #9cdcfe; --vs-attrval: #ce9178; --vs-selc: #d7ba7d;
    --vs-cssprop: #9cdcfe; --vs-cssval: #ce9178; --vs-json-key: #9cdcfe; --vs-flag: #9cdcfe; --vs-tpl: #569cd6;
    --code-line: #2a2a2a;
`;

const CSS = String.raw`
:root {${LIGHT_VARS}
    --serif: "Source Serif 4", "Source Serif Pro", Georgia, "Times New Roman", serif;
    --display: "Playfair Display", "Source Serif 4", Georgia, serif;
    --sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --mono: "JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    --grad: linear-gradient(110deg, #0b57c4 0%, #1d8bff 42%, #ff7a1a 100%);
    --top: 60px;
}
:root[data-theme="dark"] {${DARK_VARS}}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: calc(var(--top) + 14px); -webkit-text-size-adjust: 100%; }
body {
    margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans);
    line-height: 1.6; -webkit-font-smoothing: antialiased; overflow-x: hidden;
}
a { color: var(--brand); text-decoration: none; }
a:hover { text-decoration: underline; }
img { max-width: 100%; height: auto; }
button { font-family: inherit; }
::selection { background: rgba(29, 139, 255, 0.28); }

/* ---------- top bar ---------- */
.topbar {
    position: sticky; top: 0; z-index: 50; height: var(--top);
    display: flex; align-items: center; gap: 10px; padding: 0 14px;
    background: color-mix(in srgb, var(--page) 88%, transparent);
    backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
    border-bottom: 1px solid var(--line);
}
.brand { display: flex; align-items: center; gap: 10px; color: var(--ink); font-weight: 800; letter-spacing: -0.01em; min-width: 0; }
.brand:hover { text-decoration: none; }
.brand img { width: 34px; height: 34px; border-radius: 9px; flex: none; }
.brand b { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.brand b i { font-style: normal; color: var(--orange); }
.brand small { font-weight: 600; color: var(--muted); font-size: 12px; margin-left: 2px; }
.spacer { flex: 1; }
.pill, .btn {
    display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 13px;
    border-radius: 999px; font-size: 13.5px; font-weight: 700; cursor: pointer; white-space: nowrap;
    border: 1px solid var(--line); background: var(--page-2); color: var(--ink);
}
.pill:hover { border-color: var(--brand-2); }
.btn-main {
    border: 0; color: #fff; background: var(--grad);
    box-shadow: 0 8px 22px rgba(29, 109, 255, 0.32);
}
.btn-main:hover { filter: brightness(1.06); }
.btn-main.busy { opacity: 0.7; pointer-events: none; }
.btn svg, .pill svg { width: 17px; height: 17px; flex: none; }
.admin-chip {
    display: none; border-color: color-mix(in srgb, var(--orange) 45%, var(--line));
    background: var(--tint-2); color: var(--ink);
}
.admin-chip.show { display: inline-flex; }
.admin-chip b { color: var(--orange); font-variant-numeric: tabular-nums; }
.only-mobile { display: inline-flex; }
.theme-sun { display: none; }
:root[data-theme="dark"] .theme-sun { display: block; }
:root[data-theme="dark"] .theme-moon { display: none; }
.progress { position: fixed; top: 0; left: 0; height: 3px; width: 0; z-index: 60; background: var(--grad); }

/* ---------- layout ---------- */
.shell { display: grid; grid-template-columns: 1fr; max-width: 1280px; margin: 0 auto; padding: 18px 12px 80px; gap: 22px; }
.side {
    position: fixed; z-index: 70; top: 0; left: 0; bottom: 0; width: min(86vw, 330px);
    background: var(--page); border-right: 1px solid var(--line); box-shadow: var(--shadow);
    transform: translateX(-105%); transition: transform 0.25s ease; display: flex; flex-direction: column;
}
.side.open { transform: none; }
.scrim { position: fixed; inset: 0; z-index: 65; background: rgba(4, 12, 28, 0.55); opacity: 0; pointer-events: none; transition: opacity 0.2s; }
.scrim.show { opacity: 1; pointer-events: auto; }
.side-head { padding: 14px 14px 8px; display: flex; flex-direction: column; gap: 10px; border-bottom: 1px solid var(--line); }
.side-head h3 { margin: 0; font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); }
.side-head input {
    width: 100%; height: 38px; border-radius: 10px; border: 1px solid var(--line);
    background: var(--page-2); color: var(--ink); padding: 0 12px; font: inherit; font-size: 14px;
}
.side-head input:focus { outline: 2px solid var(--brand-2); outline-offset: 1px; }
.toc-nav { overflow: auto; padding: 8px 8px 30px; flex: 1; overscroll-behavior: contain; }
.toc-nav ol { list-style: none; margin: 0; padding: 0; }
.toc-nav li { margin: 0; }
.toc-nav a {
    display: flex; gap: 9px; align-items: baseline; padding: 7px 10px; border-radius: 9px;
    color: var(--ink-2); font-size: 14px; font-weight: 600; line-height: 1.35;
}
.toc-nav a:hover { background: var(--page-2); text-decoration: none; }
.toc-nav a .n { color: var(--orange); font-weight: 800; font-variant-numeric: tabular-nums; min-width: 22px; font-size: 12px; }
.toc-nav a.active { background: var(--tint); color: var(--brand); }
.toc-nav ol ol { display: none; margin: 2px 0 6px 28px; border-left: 2px solid var(--line); }
.toc-nav li.open > ol { display: block; }
.toc-nav ol ol a { font-size: 13px; font-weight: 500; padding: 5px 10px; color: var(--muted); }
.toc-nav ol ol a.active { color: var(--brand); background: transparent; font-weight: 700; }
.toc-nav li.hide { display: none; }

.book { min-width: 0; width: 100%; max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 22px; }
.sheet {
    background: var(--page); border: 1px solid var(--line); border-radius: 20px;
    box-shadow: var(--shadow); padding: 28px 20px; min-width: 0;
}

/* ---------- cover ---------- */
.cover {
    position: relative; overflow: hidden; border-radius: 24px; color: #fff; text-align: center;
    min-height: 620px; display: flex; align-items: center; justify-content: center; padding: 56px 24px;
    background:
        radial-gradient(900px 500px at 12% -10%, rgba(29, 139, 255, 0.55), transparent 60%),
        radial-gradient(800px 520px at 100% 110%, rgba(255, 122, 26, 0.5), transparent 60%),
        linear-gradient(160deg, #061431 0%, #0a2250 55%, #12306b 100%);
    box-shadow: var(--shadow);
}
.cover::before {
    content: ""; position: absolute; inset: 0; opacity: 0.5;
    background-image:
        linear-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
    background-size: 38px 38px;
    -webkit-mask-image: radial-gradient(circle at 50% 45%, #000 0%, transparent 72%);
    mask-image: radial-gradient(circle at 50% 45%, #000 0%, transparent 72%);
}
.cover .ring { position: absolute; border-radius: 50%; border: 1.5px solid rgba(255, 255, 255, 0.14); }
.cover .r1 { width: 520px; height: 520px; top: -190px; right: -170px; border-color: rgba(255, 122, 26, 0.5); }
.cover .r2 { width: 360px; height: 360px; bottom: -150px; left: -110px; border-color: rgba(29, 139, 255, 0.6); }
.cover .r3 { width: 220px; height: 220px; bottom: 90px; right: 8%; border-style: dashed; }
.cover-inner { position: relative; z-index: 2; max-width: 640px; }
.kicker { font: 700 12px/1 var(--sans); letter-spacing: 0.34em; text-transform: uppercase; color: #9fd0ff; }
.plate {
    margin: 26px auto 22px; width: min(300px, 78%); padding: 18px 18px 14px; border-radius: 26px;
    background: #fff; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45), 0 0 0 6px rgba(255, 255, 255, 0.1);
}
.plate img { display: block; width: 100%; height: auto; }
.cover h1 {
    margin: 0; font: 800 clamp(40px, 9vw, 64px)/1.05 var(--display); letter-spacing: -0.02em;
}
.cover h1 span { background: linear-gradient(100deg, #6fb6ff, #ffa45c); -webkit-background-clip: text; background-clip: text; color: transparent; }
.cover .sub { margin: 14px auto 0; font: 500 clamp(16px, 3.6vw, 20px)/1.5 var(--serif); color: #d6e6ff; max-width: 30em; }
.cover .rule { width: 90px; height: 4px; border-radius: 4px; margin: 26px auto; background: var(--grad); }
.cover .tags { font: 600 13px/1.7 var(--sans); color: #a9c4ea; letter-spacing: 0.04em; }
.cover .meta { margin-top: 22px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.cover .meta span { padding: 6px 12px; border-radius: 999px; font: 600 12px var(--sans); background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.18); }
.cover .author { margin-top: 26px; font: italic 500 15px var(--serif); color: #c4d8f7; }
.cover .author b { font-style: normal; color: #fff; }

/* ---------- front matter + contents ---------- */
.front { text-align: center; }
.front p { margin: 8px 0; }
.front img.badge { height: 28px; width: auto; margin: 3px 2px; border-radius: 4px; vertical-align: middle; }
.sheet-title {
    margin: 0 0 4px; font: 800 30px/1.15 var(--display); letter-spacing: -0.01em;
}
.sheet-sub { margin: 0 0 22px; color: var(--muted); font: 500 15px var(--serif); }
.bar { height: 4px; width: 70px; border-radius: 4px; background: var(--grad); margin: 12px 0 22px; }
.contents ol { list-style: none; margin: 0; padding: 0; }
.contents > ol > li { padding: 10px 0; border-bottom: 1px dashed var(--line); }
.contents a { color: var(--ink); display: flex; align-items: baseline; gap: 12px; font-weight: 700; }
.contents a .n { font: 800 14px var(--display); color: var(--orange); min-width: 28px; font-variant-numeric: tabular-nums; }
.contents a .t { flex: 1; }
.contents ol ol { margin: 6px 0 0 40px; columns: 1; }
.contents ol ol a { font: 500 14px var(--serif); color: var(--muted); padding: 2px 0; }

/* ---------- chapters ---------- */
.chapter-head { display: flex; gap: 16px; align-items: center; margin-bottom: 6px; }
.chapter-num {
    flex: none; width: 62px; height: 62px; border-radius: 18px; display: grid; place-items: center;
    background: var(--grad); color: #fff; font: 800 26px var(--display);
    box-shadow: 0 10px 24px rgba(29, 109, 255, 0.3);
}
.chapter-eyebrow { font: 700 11.5px/1 var(--sans); letter-spacing: 0.22em; text-transform: uppercase; color: var(--orange); }
.chapter-head h2 { margin: 6px 0 0; font: 800 clamp(24px, 5.6vw, 34px)/1.15 var(--display); letter-spacing: -0.015em; }
.chapter-head .emo { margin-right: 6px; }
.chapter .bar { margin: 16px 0 22px; }

.prose { font-family: var(--serif); font-size: 17px; line-height: 1.78; color: var(--ink); overflow-wrap: anywhere; }
.prose p { margin: 0 0 1.05em; }
.prose h3, .prose h4, .prose h5 { font-family: var(--display); color: var(--ink); position: relative; line-height: 1.25; }
.prose h3 { font-size: 23px; margin: 2em 0 0.6em; padding-left: 14px; border-left: 5px solid; border-image: var(--grad) 1; }
.prose h4 { font-size: 19px; margin: 1.7em 0 0.5em; color: var(--brand); }
.prose h5, .prose h6 { font-size: 16px; margin: 1.4em 0 0.4em; text-transform: uppercase; letter-spacing: 0.08em; font-family: var(--sans); color: var(--muted); }
.prose .anchor { opacity: 0; margin-left: 8px; font: 700 0.8em var(--sans); color: var(--muted); }
.prose h3:hover .anchor, .prose h4:hover .anchor { opacity: 1; text-decoration: none; }
.prose strong { font-weight: 700; }
.prose a { text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--brand) 40%, transparent); text-underline-offset: 3px; }
.prose hr { border: 0; height: 1px; margin: 2.2em 0; background: linear-gradient(90deg, transparent, var(--line), transparent); }
.prose ul, .prose ol { padding-left: 1.4em; margin: 0 0 1.1em; }
.prose li { margin: 0.35em 0; }
.prose li::marker { color: var(--orange); font-weight: 700; }
.prose li.task { list-style: none; margin-left: -1.2em; }
.prose li.task input { margin-right: 8px; accent-color: var(--brand-2); transform: scale(1.15); }
.prose :not(pre) > code {
    font: 500 0.84em var(--mono); background: var(--code-tint); color: var(--brand);
    padding: 0.14em 0.45em; border-radius: 6px; border: 1px solid var(--line); overflow-wrap: anywhere;
}
.prose blockquote {
    margin: 1.4em 0; padding: 14px 18px; border-radius: 0 14px 14px 0; background: var(--tint);
    border-left: 5px solid var(--brand-2); font-size: 0.97em;
}
.prose blockquote p:last-child { margin-bottom: 0; }
.prose img { border-radius: 10px; }
.prose p > img[width="100%"], .prose p[align="center"] > img { display: block; margin: 0 auto; }
.prose [align="center"] { text-align: center; }

.table-wrap { overflow-x: auto; margin: 1.3em 0; border: 1px solid var(--line); border-radius: 14px; -webkit-overflow-scrolling: touch; }
.prose table { border-collapse: collapse; width: 100%; font: 400 14.5px/1.55 var(--sans); min-width: 420px; }
.prose th { text-align: left; padding: 11px 14px; font-weight: 800; color: var(--ink); background: linear-gradient(180deg, var(--tint), var(--page-2)); border-bottom: 2px solid var(--brand-2); white-space: nowrap; }
.prose td { padding: 10px 14px; border-top: 1px solid var(--line); vertical-align: top; }
.prose tbody tr:nth-child(even) td { background: color-mix(in srgb, var(--page-2) 70%, transparent); }
.prose td code, .prose th code { white-space: nowrap; }

details { margin: 1.2em 0; border: 1px solid var(--line); border-radius: 14px; background: var(--page-2); overflow: hidden; }
details > summary {
    cursor: pointer; padding: 13px 16px; font: 700 15px var(--sans); color: var(--brand);
    list-style: none; display: flex; gap: 10px; align-items: center;
}
details > summary::-webkit-details-marker { display: none; }
details > summary::before { content: "▸"; color: var(--orange); transition: transform 0.15s; }
details[open] > summary::before { transform: rotate(90deg); }
details[open] > summary { border-bottom: 1px solid var(--line); }
details > :not(summary) { margin-left: 16px; margin-right: 16px; }
details > :last-child { margin-bottom: 16px; }
details > summary + * { margin-top: 14px; }

/* ---------- code ---------- */
figure.code { margin: 1.4em 0; border-radius: 14px; overflow: hidden; background: var(--vs-bg); border: 1px solid var(--code-line); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12); }
figure.code figcaption { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: color-mix(in srgb, var(--vs-bg) 88%, #888); border-bottom: 1px solid var(--code-line); font: 600 11.5px var(--sans); color: var(--vs-fg); }
figure.code .dots { display: flex; gap: 6px; }
figure.code .dots i { width: 10px; height: 10px; border-radius: 50%; background: #ff5f57; }
figure.code .dots i:nth-child(2) { background: #febc2e; }
figure.code .dots i:nth-child(3) { background: #28c840; }
figure.code .lang { margin-left: auto; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.7; }
figure.code .copy { border: 1px solid var(--code-line); background: transparent; color: var(--vs-fg); border-radius: 8px; padding: 4px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; }
figure.code .copy:hover { border-color: var(--brand-2); }
figure.code pre { margin: 0; padding: 14px 16px; overflow: auto; font: 400 13px/1.7 var(--mono); color: var(--vs-fg); tab-size: 2; -webkit-overflow-scrolling: touch; }
figure.code pre code { font: inherit; }
.tk-cmt { color: var(--vs-cmt); font-style: italic; } .tk-str { color: var(--vs-str); } .tk-num { color: var(--vs-num); }
.tk-kw { color: var(--vs-kw); } .tk-ctl { color: var(--vs-ctl); } .tk-fn { color: var(--vs-fn); } .tk-type { color: var(--vs-type); }
.tk-var, .tk-prop, .tk-flag { color: var(--vs-var); } .tk-const { color: var(--vs-const); } .tk-regex { color: var(--vs-regex); }
.tk-op { color: var(--vs-op); } .tk-pun { color: var(--vs-pun); } .tk-tpl { color: var(--vs-tpl); }
.tk-tag { color: var(--vs-tag); } .tk-pun-tag { color: var(--vs-tag-pun); } .tk-attr { color: var(--vs-attr); } .tk-attrval { color: var(--vs-attrval); }
.tk-seltag, .tk-selc { color: var(--vs-selc); } .tk-cssprop { color: var(--vs-cssprop); } .tk-cssval { color: var(--vs-cssval); }
figure.code[data-lang="json"] .tk-prop { color: var(--vs-json-key); }

/* ---------- closing page ---------- */
.colophon { text-align: center; }
.colophon img { width: 120px; }
.colophon p { color: var(--muted); font: 500 14px/1.7 var(--serif); margin: 6px 0; }
.colophon .thanks { font: 800 28px var(--display); color: var(--ink); margin-bottom: 6px; }

/* ---------- toast / update bar / to-top ---------- */
.toast {
    position: fixed; left: 50%; bottom: 22px; transform: translate(-50%, 30px); opacity: 0; pointer-events: none;
    z-index: 90; background: #0b1f44; color: #fff; padding: 12px 18px; border-radius: 14px; font-size: 14px; font-weight: 600;
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.4); max-width: 92vw; text-align: center; transition: 0.25s;
    border: 1px solid rgba(255, 255, 255, 0.14);
}
.toast.show { opacity: 1; transform: translate(-50%, 0); }
.update-bar { display: none; position: sticky; top: var(--top); z-index: 45; padding: 9px 14px; text-align: center; font-size: 14px; font-weight: 700; color: #fff; background: var(--grad); }
.update-bar.show { display: block; }
.update-bar button { margin-left: 10px; border: 0; background: #fff; color: #0b57c4; border-radius: 999px; padding: 4px 12px; font-weight: 800; cursor: pointer; }
.to-top {
    position: fixed; right: 16px; bottom: 18px; z-index: 40; width: 44px; height: 44px; border-radius: 50%;
    border: 0; background: var(--grad); color: #fff; font-size: 20px; cursor: pointer; opacity: 0; pointer-events: none;
    transition: 0.2s; box-shadow: 0 10px 26px rgba(29, 109, 255, 0.4);
}
.to-top.show { opacity: 1; pointer-events: auto; }

/* ---------- wide screens ---------- */
@media (min-width: 640px) {
    .sheet { padding: 40px 44px; }
    .prose { font-size: 17.5px; }
}
@media (min-width: 1040px) {
    .shell { grid-template-columns: 300px minmax(0, 1fr); padding: 26px 20px 100px; }
    .side { position: sticky; top: calc(var(--top) + 16px); z-index: 1; height: calc(100vh - var(--top) - 32px); width: auto; transform: none; border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); }
    .scrim, .only-mobile { display: none !important; }
}
@media (max-width: 520px) {
    .brand small, .btn .lbl-long, .only-mobile span { display: none; }
    .only-mobile { width: 38px; padding: 0; justify-content: center; }
    .topbar { gap: 7px; padding: 0 10px; }
    .pill, .btn { padding: 0 11px; height: 36px; }
    .chapter-num { width: 52px; height: 52px; font-size: 22px; border-radius: 15px; }
    .cover { min-height: 560px; padding: 44px 16px; }
}

/* ---------- print = the clean book / PDF ---------- */
@page { size: A4; margin: 18mm 16mm 20mm; @bottom-center { content: counter(page); font: 600 9pt "Inter", sans-serif; color: #5b6b86; } @top-right { content: "Email Sender · The Complete Guide"; font: 600 8.5pt "Inter", sans-serif; color: #8796ad; } }
@page cover { margin: 0; @bottom-center { content: none; } @top-right { content: none; } }
@media print {
    :root, :root[data-theme="dark"] {${LIGHT_VARS}}
    html, body { background: #fff !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .topbar, .side, .scrim, .progress, .toast, .update-bar, .to-top, .copy, .anchor, .no-print { display: none !important; }
    .shell { display: block; padding: 0; max-width: none; }
    .book { max-width: none; gap: 0; display: block; }
    .sheet { box-shadow: none; border: 0; border-radius: 0; padding: 0; background: #fff; }
    .cover { page: cover; width: 210mm; height: 296mm; min-height: 0; border-radius: 0; box-shadow: none; break-after: page; }
    .front, .contents { break-after: page; padding-top: 4mm; }
    .chapter { break-before: page; }
    .prose { font-size: 11pt; line-height: 1.65; }
    .chapter-head h2 { font-size: 26pt; }
    .prose h3, .prose h4, .chapter-head { break-after: avoid; }
    figure.code, .table-wrap, blockquote, details, img, tr { break-inside: avoid; }
    figure.code pre { overflow: visible; white-space: pre-wrap; word-break: break-word; font-size: 8.8pt; line-height: 1.55; }
    .table-wrap { overflow: visible; border-radius: 8px; }
    .prose table { min-width: 0; font-size: 9.5pt; }
    .prose th { white-space: normal; }
    .prose td code, .prose th code { white-space: normal; overflow-wrap: anywhere; }
    details { background: #fff; }
    a { color: inherit; text-decoration: none; }
    .prose a { color: #0b57c4; }
    .contents a { color: #13233d; }
    .colophon { break-before: page; padding-top: 60mm; }
}
`;

/* ------------------------------------------------------------------ */
/* Browser JS                                                          */
/* ------------------------------------------------------------------ */
const JS = String.raw`
(function () {
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var root = document.documentElement;
    var API = "/api/v1";
    var ETAG = window.__DOCS_ETAG__;

    /* ----- toast ----- */
    var toastEl = $("#toast"), toastTimer;
    function toast(msg, ms) {
        toastEl.textContent = msg; toastEl.classList.add("show");
        clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, ms || 3200);
    }

    /* ----- theme ----- */
    $("#themeBtn").addEventListener("click", function () {
        var t = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", t);
        try { localStorage.setItem("es-docs-theme", t); } catch (e) {}
    });

    /* ----- contents drawer (mobile) ----- */
    var side = $("#side"), scrim = $("#scrim");
    function drawer(open) { side.classList.toggle("open", open); scrim.classList.toggle("show", open); }
    $("#tocBtn").addEventListener("click", function () { drawer(!side.classList.contains("open")); });
    scrim.addEventListener("click", function () { drawer(false); });
    side.addEventListener("click", function (e) { if (e.target.closest("a") && window.innerWidth < 1040) drawer(false); });

    /* ----- contents search ----- */
    $("#tocSearch").addEventListener("input", function (e) {
        var q = e.target.value.trim().toLowerCase();
        $$(".toc-nav > ol > li").forEach(function (li) {
            li.classList.toggle("hide", q && li.textContent.toLowerCase().indexOf(q) === -1);
            if (q) li.classList.add("open"); else li.classList.remove("open");
        });
    });

    /* ----- progress bar, back-to-top ----- */
    var bar = $("#progress"), toTopBtn = $("#toTop"), ticking = false;
    function onScroll() {
        var h = document.documentElement;
        var max = h.scrollHeight - h.clientHeight;
        bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + "%";
        toTopBtn.classList.toggle("show", h.scrollTop > 900);
        ticking = false;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    toTopBtn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    onScroll();

    /* ----- scroll spy ----- */
    var links = {};
    $$(".toc-nav a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    if ("IntersectionObserver" in window) {
        var current = null;
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (!en.isIntersecting) return;
                var a = links[en.target.id]; if (!a) return;
                if (current) current.classList.remove("active");
                $$(".toc-nav li.open").forEach(function (l) { l.classList.remove("open"); });
                a.classList.add("active"); current = a;
                var li = a.closest("li"); while (li) { li.classList.add("open"); li = li.parentElement.closest("li"); }
                if (window.innerWidth >= 1040) a.scrollIntoView({ block: "nearest" });
            });
        }, { rootMargin: "-12% 0px -80% 0px" });
        $$(".chapter h2, .prose h3").forEach(function (h) { if (h.id && links[h.id]) io.observe(h); });
    }

    /* ----- copy buttons ----- */
    document.addEventListener("click", function (e) {
        var b = e.target.closest(".copy"); if (!b) return;
        var code = b.closest("figure").querySelector("code").innerText;
        var done = function () { b.textContent = "Copied ✓"; setTimeout(function () { b.textContent = "Copy"; }, 1500); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, done);
        else { var t = document.createElement("textarea"); t.value = code; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch (x) {} t.remove(); done(); }
    });

    /* ----- admin-only download counter (everyone else sees nothing) ----- */
    var chip = $("#adminChip");
    function fetchStats(retry) {
        return fetch(API + "/docs/stats", { credentials: "same-origin", cache: "no-store" }).then(function (r) {
            if (r.status === 401 && retry) {
                return fetch(API + "/users/refresh-token", { method: "POST", credentials: "same-origin" })
                    .then(function (rr) { return rr.ok ? fetchStats(false) : null; });
            }
            return r.ok ? r.json() : null;
        });
    }
    function refreshStats() {
        fetchStats(true).then(function (j) {
            if (!j || !j.data) return;
            $("#adminCount").textContent = j.data.total;
            chip.title = "Admins only — today: " + j.data.today + ", last 7 days: " + j.data.last7 + ", last 30 days: " + j.data.last30;
            chip.classList.add("show");
        }).catch(function () {});
    }
    chip.addEventListener("click", function () { toast(chip.title); });
    refreshStats();

    /* ----- Download PDF = print the clean version ----- */
    var dlBtn = $("#dlBtn"), busy = false, opened = [];
    function expand() {
        opened = $$("details").map(function (d) { return [d, d.open]; });
        opened.forEach(function (p) { p[0].open = true; });
        $$("img[loading=lazy]").forEach(function (i) { i.loading = "eager"; });
    }
    function restore() {
        opened.forEach(function (p) { p[0].open = p[1]; }); opened = [];
        busy = false; dlBtn.classList.remove("busy");
    }
    function imagesReady() {
        var pending = $$("img").filter(function (i) { return !i.complete; }).map(function (i) {
            return new Promise(function (res) { i.addEventListener("load", res); i.addEventListener("error", res); });
        });
        var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        return Promise.all(pending.concat([fonts]));
    }
    function countDownload() {
        try {
            fetch(API + "/docs/download", { method: "POST", credentials: "same-origin", keepalive: true })
                .then(function () { setTimeout(refreshStats, 600); }).catch(function () {});
        } catch (e) {}
    }
    dlBtn.addEventListener("click", function () {
        if (busy) return; busy = true; dlBtn.classList.add("busy");
        toast("Preparing a clean print version… choose “Save as PDF” in the next window.", 4200);
        expand();
        Promise.race([imagesReady(), new Promise(function (r) { setTimeout(r, 9000); })]).then(function () {
            countDownload();
            setTimeout(function () { window.print(); }, 80);
            setTimeout(restore, 60000); // safety: some mobile browsers never fire afterprint
        });
    });
    window.addEventListener("beforeprint", function () { if (!opened.length) expand(); });
    window.addEventListener("afterprint", restore);

    /* ----- "a newer version is available" ----- */
    var upd = $("#updateBar");
    $("#reloadBtn").addEventListener("click", function () { location.reload(); });
    setInterval(function () {
        if (document.hidden) return;
        fetch(API + "/docs/meta", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
            if (j && j.data && ETAG && j.data.version !== ETAG) upd.classList.add("show");
        }).catch(function () {});
    }, 60000);
})();
`;

/* small inline icons */
const I = {
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    moon: '<svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M4 20h16"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/></svg>'
};

/* ------------------------------------------------------------------ */
/* Page builder                                                        */
/* ------------------------------------------------------------------ */
const pad = n => String(n).padStart(2, "0");

export function buildDocsPage({ meta, frontHtml, chapters, version }) {
    // chapters: [{ id, title, emoji, html, subs: [{id,title}] }]
    const tocSide = chapters
        .map(
            (c, i) =>
                `<li><a href="#${esc(c.id)}"><span class="n">${pad(i + 1)}</span><span>${esc(c.title)}</span></a>` +
                (c.subs.length
                    ? `<ol>${c.subs.map(s => `<li><a href="#${esc(s.id)}">${esc(s.title)}</a></li>`).join("")}</ol>`
                    : "") +
                `</li>`
        )
        .join("");

    const tocPage = chapters
        .map(
            (c, i) =>
                `<li><a href="#${esc(c.id)}"><span class="n">${pad(i + 1)}</span><span class="t">${c.emoji ? esc(c.emoji) + " " : ""}${esc(c.title)}</span></a>` +
                (c.subs.length
                    ? `<ol>${c.subs.map(s => `<li><a href="#${esc(s.id)}">${esc(s.title)}</a></li>`).join("")}</ol>`
                    : "") +
                `</li>`
        )
        .join("");

    const chapterHtml = chapters
        .map(
            (c, i) => `
<section class="sheet chapter" id="${esc(c.id)}-sec">
  <div class="chapter-head">
    <div class="chapter-num">${pad(i + 1)}</div>
    <div><div class="chapter-eyebrow">Chapter ${i + 1}</div>
      <h2 id="${esc(c.id)}">${c.emoji ? `<span class="emo">${esc(c.emoji)}</span>` : ""}${c.inner}</h2></div>
  </div>
  <div class="bar"></div>
  <div class="prose">${c.html}</div>
</section>`
        )
        .join("\n");

    const titleWords = esc(meta.title).split(" ");
    const lastWord = titleWords.pop();
    const titleHtml = titleWords.length ? `${titleWords.join(" ")} <span>${lastWord}</span>` : `<span>${lastWord}</span>`;

    return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(meta.title)} — The Complete Guide</title>
<meta name="description" content="${esc(meta.subtitle)} — full documentation, readable online and downloadable as a PDF.">
<meta name="theme-color" content="#0b57c4">
<meta name="color-scheme" content="light dark">
<meta property="og:title" content="${esc(meta.title)} — The Complete Guide">
<meta property="og:description" content="${esc(meta.subtitle)}">
<meta property="og:image" content="/docs/logo.png">
<link rel="icon" type="image/png" href="/docs/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Playfair+Display:wght@700;800&family=Source+Serif+4:ital,wght@0,400;0,500;0,700;1,400;1,500&display=swap">
<script>
(function(){try{var t=localStorage.getItem("es-docs-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);}catch(e){}})();
window.__DOCS_ETAG__ = ${JSON.stringify(version)};
</script>
<style>${CSS}</style>
</head>
<body>
<div class="progress" id="progress"></div>

<header class="topbar">
  <button class="pill only-mobile" id="tocBtn" aria-label="Contents">${I.menu}<span>Contents</span></button>
  <a class="brand" href="/" title="Open the app"><img src="/docs/favicon.png" alt=""><b>Email<i>Sender</i> <small>Docs</small></b></a>
  <span class="spacer"></span>
  <button class="pill admin-chip" id="adminChip" title="Admins only">${I.shield}<span>Downloads <b id="adminCount">0</b></span></button>
  <button class="pill" id="themeBtn" aria-label="Switch dark / light mode">${I.moon}${I.sun}</button>
  <button class="btn btn-main" id="dlBtn" aria-label="Download as PDF">${I.down}<span>PDF<span class="lbl-long"> download</span></span></button>
</header>
<div class="update-bar" id="updateBar">This book was just updated.<button id="reloadBtn">Reload</button></div>
<div class="scrim" id="scrim"></div>

<div class="shell">
  <aside class="side" id="side" aria-label="Contents">
    <div class="side-head"><h3>Contents</h3><input id="tocSearch" type="search" placeholder="Search chapters…" autocomplete="off"></div>
    <nav class="toc-nav"><ol>${tocSide}</ol></nav>
  </aside>

  <main class="book">
    <header class="cover">
      <span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span>
      <div class="cover-inner">
        <div class="kicker">The Complete Guide</div>
        <div class="plate"><img src="/docs/logo.png" alt="${esc(meta.title)} logo"></div>
        <h1>${titleHtml}</h1>
        <p class="sub">${esc(meta.subtitle)}</p>
        <div class="rule"></div>
        <div class="tags">${esc(meta.tags)}</div>
        <div class="meta"><span>Edition ${esc(meta.edition)}</span><span>Updated ${esc(meta.updated)}</span><span>${meta.chapters} chapters</span><span>${meta.minutes} min read</span></div>
        ${meta.author ? `<div class="author">Designed &amp; written by <b>${esc(meta.author)}</b></div>` : ""}
      </div>
    </header>

    ${frontHtml ? `<section class="sheet front"><h2 class="sheet-title">Built With</h2><div class="bar" style="margin-left:auto;margin-right:auto"></div>${frontHtml}</section>` : ""}

    <section class="sheet contents" id="contents">
      <h2 class="sheet-title">Contents</h2>
      <p class="sheet-sub">Everything in this book, one chapter at a time.</p>
      <div class="bar"></div>
      <ol>${tocPage}</ol>
    </section>

    ${chapterHtml}

    <section class="sheet colophon">
      <img src="/docs/logo.png" alt="">
      <p class="thanks">Thank you for reading</p>
      <p>This book is generated live from the project's <b>README.md</b> — edit the README and this page updates by itself.</p>
      <p>Last updated ${esc(meta.updated)} · Edition ${esc(meta.edition)}${meta.author ? ` · ${esc(meta.author)}` : ""}</p>
    </section>
  </main>
</div>

<button class="to-top" id="toTop" aria-label="Back to top">↑</button>
<div class="toast" id="toast" role="status"></div>
<script>${JS}</script>
</body>
</html>`;
}
