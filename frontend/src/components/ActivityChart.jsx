import { useEffect, useMemo, useRef, useState } from "react";
import { fmtDate } from "../lib/format";

const H = 210;
const PAD = { t: 18, r: 14, b: 8, l: 30 };

// Smooth (monotone) curve — no overshoot below zero
function smoothPath(pts) {
    if (pts.length < 2) return "";
    const n = pts.length;
    const dx = [],
        dy = [],
        m = [];
    for (let i = 0; i < n - 1; i++) {
        dx.push(pts[i + 1].x - pts[i].x);
        dy.push(pts[i + 1].y - pts[i].y);
        m.push(dy[i] / dx[i]);
    }
    const t = [m[0]];
    for (let i = 1; i < n - 1; i++) {
        t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
    }
    t.push(m[n - 2]);
    for (let i = 0; i < n - 1; i++) {
        if (m[i] === 0) {
            t[i] = 0;
            t[i + 1] = 0;
            continue;
        }
        const a = t[i] / m[i];
        const b = t[i + 1] / m[i];
        const s = a * a + b * b;
        if (s > 9) {
            const k = 3 / Math.sqrt(s);
            t[i] = k * a * m[i];
            t[i + 1] = k * b * m[i];
        }
    }
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < n - 1; i++) {
        const h = dx[i] / 3;
        d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${
            pts[i + 1].y - t[i + 1] * h
        } ${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return d;
}

// Blue → orange gradient line + area graph, with touch / hover tooltip
export default function ActivityChart({ days }) {
    const wrap = useRef(null);
    const [w, setW] = useState(320);
    const [hover, setHover] = useState(null);
    const [ready, setReady] = useState(false);
    const uid = useRef(`ac${Math.random().toString(36).slice(2, 8)}`).current;

    useEffect(() => {
        const el = wrap.current;
        if (!el) return;
        const ro = new ResizeObserver(([e]) =>
            setW(Math.max(220, Math.floor(e.contentRect.width)))
        );
        ro.observe(el);
        setW(Math.max(220, Math.floor(el.clientWidth)));
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        setReady(false);
        const id = setTimeout(() => setReady(true), 60);
        return () => clearTimeout(id);
    }, [days.length]);

    const max = Math.max(1, ...days.map(d => d.count));
    const top = max <= 4 ? max : Math.ceil(max / 4) * 4;
    const iw = w - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const step = days.length > 1 ? iw / (days.length - 1) : 0;

    const pts = useMemo(
        () =>
            days.map((d, i) => ({
                x: PAD.l + i * step,
                y: PAD.t + ih - (d.count / top) * ih,
                d
            })),
        [days, step, ih, top]
    );
    const line = smoothPath(pts);
    const base = PAD.t + ih;
    const area = pts.length
        ? `${line} L${pts[pts.length - 1].x},${base} L${pts[0].x},${base} Z`
        : "";

    const ticks = useMemo(() => {
        const n = top <= 4 ? top : 4;
        const arr = [];
        for (let i = 0; i <= n; i++) arr.push(Math.round((top / n) * i));
        return [...new Set(arr)];
    }, [top]);

    function onMove(e) {
        const r = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - r.left;
        const i = Math.round((x - PAD.l) / (step || 1));
        setHover(Math.max(0, Math.min(days.length - 1, i)));
    }

    const hp = hover != null ? pts[hover] : null;
    const tipLeft = hp ? Math.min(Math.max(hp.x, 54), w - 54) : 0;
    const dense = days.length > 20;

    return (
        <div className="ac" ref={wrap}>
            <svg
                className={`ac-svg ${ready ? "ready" : ""}`}
                width={w}
                height={H}
                viewBox={`0 0 ${w} ${H}`}
                role="img"
                aria-label="Emails per day"
                onPointerMove={onMove}
                onPointerDown={onMove}
                onPointerLeave={() => setHover(null)}
            >
                <defs>
                    <linearGradient id={`${uid}-s`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#1d6dff" />
                        <stop offset="34%" stopColor="#19c3ff" />
                        <stop offset="62%" stopColor="#ffc233" />
                        <stop offset="100%" stopColor="#ff6a00" />
                    </linearGradient>
                    <linearGradient id={`${uid}-a`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1d8bff" stopOpacity="0.38" />
                        <stop offset="55%" stopColor="#ff7a1a" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="#ff7a1a" stopOpacity="0" />
                    </linearGradient>
                    <filter id={`${uid}-g`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="b" />
                        <feMerge>
                            <feMergeNode in="b" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                {ticks.map(t => {
                    const y = PAD.t + ih - (t / top) * ih;
                    return (
                        <g key={t}>
                            <line
                                x1={PAD.l}
                                x2={w - PAD.r}
                                y1={y}
                                y2={y}
                                className="ac-grid"
                            />
                            <text x={PAD.l - 8} y={y + 4} className="ac-y" textAnchor="end">
                                {t}
                            </text>
                        </g>
                    );
                })}

                {area && <path d={area} fill={`url(#${uid}-a)`} className="ac-area" />}
                {line && (
                    <path
                        d={line}
                        fill="none"
                        stroke={`url(#${uid}-s)`}
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        filter={`url(#${uid}-g)`}
                        pathLength="1"
                        className="ac-line"
                    />
                )}

                {!dense &&
                    pts.map((p, i) =>
                        p.d.count > 0 ? (
                            <circle
                                key={p.d.key}
                                cx={p.x}
                                cy={p.y}
                                r={hover === i ? 6 : 3.6}
                                className="ac-dot"
                                style={{ animationDelay: `${0.4 + i * 0.03}s` }}
                            />
                        ) : null
                    )}

                {hp && (
                    <g pointerEvents="none">
                        <line
                            x1={hp.x}
                            x2={hp.x}
                            y1={PAD.t}
                            y2={base}
                            className="ac-cross"
                        />
                        <circle cx={hp.x} cy={hp.y} r="9" className="ac-halo" />
                        <circle cx={hp.x} cy={hp.y} r="5.5" className="ac-dot on" />
                    </g>
                )}
            </svg>

            {hp && (
                <div className="ac-tip" style={{ left: tipLeft, top: Math.max(0, hp.y - 52) }}>
                    <b>
                        {hp.d.count} {hp.d.count === 1 ? "email" : "emails"}
                    </b>
                    <span>{fmtDate(hp.d.date).replace(/ \d{4}$/, "")}</span>
                </div>
            )}
        </div>
    );
}
