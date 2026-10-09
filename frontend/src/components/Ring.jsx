import { useEffect, useState } from "react";

// conic-gradient প্রগ্রেস রিং — লোড হলে ০ থেকে আসল মানে ভরাট হবে
export default function Ring({ percent = 0, size = 64, label }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setP(percent), 120);
    return () => clearTimeout(id);
  }, [percent]);
  const tone = percent >= 90 ? "bad" : percent >= 70 ? "warn" : "ok";
  return (
    <div className={`ring ring-${tone}`} style={{ "--p": p, width: size, height: size }}>
      <span>{label ?? `${percent}%`}</span>
    </div>
  );
}
