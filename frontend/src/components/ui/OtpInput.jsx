import { useRef } from "react";

// ৬ ঘরের OTP: টাইপ করলে পরের ঘরে যায়, paste করলে সব ভরে, backspace এ পিছনে
export default function OtpInput({
    value,
    onChange,
    length = 6,
    bad = false,
    disabled = false,
    onComplete
}) {
    const refs = useRef([]);
    const chars = Array.from({ length }, (_, i) => value[i] || "");

    function setAt(i, ch) {
        const next = chars.slice();
        next[i] = ch;
        const joined = next.join("");
        onChange(joined);
        if (joined.length === length && !next.includes(""))
            onComplete?.(joined);
    }

    function fill(digits, start = 0) {
        const next = chars.slice();
        digits
            .slice(0, length - start)
            .split("")
            .forEach((d, k) => {
                next[start + k] = d;
            });
        const joined = next.join("");
        onChange(joined);
        refs.current[Math.min(start + digits.length, length - 1)]?.focus();
        if (joined.length === length && !next.includes(""))
            onComplete?.(joined);
    }

    function handleChange(i, e) {
        const digits = e.target.value.replace(/\D/g, "");
        if (!digits) return setAt(i, "");
        if (digits.length > 1) return fill(digits, i);
        setAt(i, digits);
        if (i < length - 1) refs.current[i + 1]?.focus();
    }

    function handleKey(i, e) {
        if (e.key === "Backspace" && !chars[i] && i > 0)
            refs.current[i - 1]?.focus();
        if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
        if (e.key === "ArrowRight" && i < length - 1)
            refs.current[i + 1]?.focus();
    }

    return (
        <div
            className={`otp ${bad ? "bad" : ""}`}
            onPaste={e => {
                e.preventDefault();
                fill(e.clipboardData.getData("text").replace(/\D/g, ""));
            }}
        >
            {chars.map((c, i) => (
                <input
                    key={i}
                    ref={el => (refs.current[i] = el)}
                    className={c ? "filled" : ""}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    maxLength={length}
                    value={c}
                    disabled={disabled}
                    autoFocus={i === 0}
                    aria-label={`Digit ${i + 1}`}
                    onChange={e => handleChange(i, e)}
                    onKeyDown={e => handleKey(i, e)}
                    onFocus={e => e.target.select()}
                />
            ))}
        </div>
    );
}
