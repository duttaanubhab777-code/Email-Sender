import Backdrop from "./Backdrop";
import { LogoMark } from "./Logo";

// ফুল-স্ক্রিন লোডার (ProtectedRoute/PublicRoute-এ ব্যবহার হয়)
export default function Spinner({ text = "Loading..." }) {
  return (
    <>
      <Backdrop />
      <div className="splash">
        <div className="splash-orbit">
          <span /><span /><span />
          <LogoMark size={54} />
        </div>
        <p>{text}</p>
      </div>
    </>
  );
}
