import Backdrop from "./Backdrop";

// ফুল-স্ক্রিন লোডার (ProtectedRoute/PublicRoute-এ ব্যবহার হয়)
export default function Spinner({ text = "Loading..." }) {
  return (
    <>
      <Backdrop />
      <div className="splash">
        <div className="splash-orbit">
          <span /><span /><span />
          <svg viewBox="0 0 48 48" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="2.500" strokeLinecap="round">
            <rect x="6" y="11" width="36" height="26" rx="7" />
            <path d="m8 15 16 11.500L40 15" />
          </svg>
        </div>
        <p>{text}</p>
      </div>
    </>
  );
}
