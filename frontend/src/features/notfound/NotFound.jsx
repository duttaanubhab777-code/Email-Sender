import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icons";
import ThemeToggle from "../../components/ThemeToggle";
import { LogoMark } from "../../components/Logo";

export default function NotFound() {
    const { user } = useAuth();
    return (
        <div className="notfound">
            <div
                style={{
                    position: "fixed",
                    top: "calc(14px + env(safe-area-inset-top))",
                    right: 14
                }}
            >
                <ThemeToggle />
            </div>
            <div className="col" style={{ alignItems: "center" }}>
                <LogoMark size={56} />
                <div className="code404">404</div>
                <h1 style={{ fontSize: 22 }}>This page doesn't exist</h1>
                <p className="muted" style={{ maxWidth: 360 }}>
                    The link may be broken, or the page may have moved.
                </p>
                <Link
                    to={user ? "/users/dashboard" : "/users/login"}
                    className="btn btn-primary btn-lg"
                >
                    <Icon name="home" size={17} />{" "}
                    {user ? "Back to dashboard" : "Go to sign in"}
                </Link>
            </div>
        </div>
    );
}
