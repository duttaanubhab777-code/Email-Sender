import { Brand } from "../../components/AppShell";
import Icon from "../../components/Icons";

// অথ পেজের বাঁ দিকের (ডেস্কটপে) অ্যানিমেটেড হিরো
export default function AuthHero() {
  const items = [
    { icon: "key", t: "Secured with API keys", d: "A separate key for every project" },
    { icon: "send", t: "Contact form straight to your inbox", d: "Send mail without writing a backend" },
    { icon: "activity", t: "Live usage tracking", d: "See what was sent and what is left" }
  ];
  return (
    <aside className="auth-hero">
      <Brand />
      <div className="hero-art" aria-hidden="true">
        <span className="orbit o1"><i /></span>
        <span className="orbit o2"><i /></span>
        <div className="hero-envelope"><Icon name="mail" size={64} /></div>
      </div>
      <h1>Your website's<br /><span className="grad-text">email pipeline</span></h1>
      <ul className="hero-list">
        {items.map((it, i) => (
          <li key={it.t} className="reveal" style={{ "--i": i + 2 }}>
            <span className="hero-ic"><Icon name={it.icon} size={18} /></span>
            <div><b>{it.t}</b><small>{it.d}</small></div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
