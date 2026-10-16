import { useEffect, useState } from "react";

// 0–10%, 10–20% … 90–100% — every band has its own colour, blended smoothly
export const BAND_COLORS = [
    "#22d3ee", // 0
    "#2dd4bf", // 10
    "#34d399", // 20
    "#4ade80", // 30
    "#a3e635", // 40
    "#facc15", // 50
    "#fb923c", // 60
    "#f97316", // 70
    "#f43f5e", // 80
    "#ef4444", // 90
    "#b91c1c" // 100
];

function hex(c) {
    return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
}
function mix(a, b, t) {
    const A = hex(a),
        B = hex(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}
export function colorAt(p) {
    const x = Math.max(0, Math.min(100, p)) / 10;
    const i = Math.min(9, Math.floor(x));
    return mix(BAND_COLORS[i], BAND_COLORS[i + 1], x - i);
}

export default function QuotaRing({ percent = 0, used = 0, limit = 0, size = 190 }) {
    const [p, setP] = useState(0);

    // count up from 0 to the real value
    useEffect(() => {
        let raf;
        const from = 0;
        const t0 = performance.now();
        const dur = 1100;
        const tick = now => {
            const k = Math.min(1, (now - t0) / dur);
            const e = 1 - Math.pow(1 - k, 3);
            setP(from + (percent - from) * e);
            if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [percent]);

    // a tiny bit of arc is always visible once something was used
    const shown = used > 0 ? Math.max(p, 1.6) : p;
    const stops = [];
    for (let i = 0; i <= 10; i++) {
        if (i * 10 < shown) stops.push(`${BAND_COLORS[i]} ${i * 10}%`);
    }
    stops.push(`${colorAt(shown)} ${shown}%`);
    const fill =
        shown > 0
            ? `conic-gradient(from 0deg, ${stops.join(", ")}, transparent ${shown}% 100%)`
            : "none";

    const band = Math.min(9, Math.floor(percent / 10));
    const now = colorAt(p);
    const rem = Math.max(0, limit - used);

    return (
        <div className="qr">
            <div
                className="qr-ring"
                style={{ width: size, height: size, "--now": now, "--rot": `${shown * 3.6}deg` }}
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Monthly quota used"
            >
                <i className="qr-glow" style={{ background: fill }} />
                <i className="qr-fill" style={{ background: fill }} />
                {shown > 0 && (
                    <i className="qr-head">
                        <b />
                    </i>
                )}
                <div className="qr-mid">
                    <strong style={{ color: now }}>{Math.round(p)}%</strong>
                    <span>used</span>
                </div>
            </div>

            <div className="qr-bands" aria-hidden="true">
                {BAND_COLORS.slice(0, 10).map((c, i) => (
                    <i
                        key={i}
                        className={i === band ? "on" : i < band ? "past" : ""}
                        style={{
                            background: `linear-gradient(90deg, ${c}, ${BAND_COLORS[i + 1]})`
                        }}
                    />
                ))}
            </div>
            <p className="qr-note">
                <b>{used.toLocaleString()}</b> of {limit.toLocaleString()} emails ·{" "}
                {rem.toLocaleString()} left
            </p>
        </div>
    );
}
