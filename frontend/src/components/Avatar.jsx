// ছবি না থাকলে নামের আদ্যক্ষর দিয়ে গ্রেডিয়েন্ট অ্যাভাটার
export default function Avatar({ src, name = "", size = 48, className = "" }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
  const style = { width: size, height: size, fontSize: size * 0.38 };
  if (src) return <img src={src} alt={name} style={style} className={`avatar ${className}`} />;
  return <span style={style} className={`avatar avatar-fallback ${className}`}>{initials}</span>;
}
