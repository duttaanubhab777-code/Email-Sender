import { Link } from "react-router-dom";
import Backdrop from "../../components/Backdrop";
import Icon from "../../components/Icons";
import ThemeToggle from "../../components/ThemeToggle";
import { LogoMark } from "../../components/Logo";

export default function NotFound() {
  return (
    <>
      <Backdrop />
      <div className="theme-float"><ThemeToggle /></div>
      <div className="center-screen">
        <div className="card notfound reveal">
          <LogoMark size={84} className="notfound-logo" />
          <div className="glitch" data-text="404">404</div>
          <p>The page you are looking for does not exist.</p>
          <Link to="/dashboard" className="btn btn-primary"><Icon name="home" size={18} /> Back to dashboard</Link>
        </div>
      </div>
    </>
  );
}
