// ছবি না থাকলে নামের আদ্যক্ষর
export default function Avatar({ src, name = "", size = 36, className = "" }) {
    const initials =
        name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(w => w[0]?.toUpperCase())
            .join("") || "?";
    const style = {
        width: size,
        height: size,
        fontSize: Math.max(11, size * 0.38)
    };
    if (src)
        return (
            <img
                src={src}
                alt={name}
                style={style}
                className={`avatar ${className}`}
            />
        );
    return (
        <span style={style} className={`avatar avatar-fallback ${className}`}>
            {initials}
        </span>
    );
}

