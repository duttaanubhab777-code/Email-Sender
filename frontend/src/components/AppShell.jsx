import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import Backdrop from "./Backdrop";
import Avatar from "./Avatar";
import Icon from "./Icons";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark"><Icon name="mail" size={18} /></span>
      <span className="brand-text">Email<b>Sender</b></span>
    </span>
  );
}

// লগইন করা ইউজারের লেআউট: উপরে টপবার, মোবাইলে নিচে ট্যাব বার
export default function AppShell() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: "home" },
    { to: "/profile", label: "Profile", icon: "user" },
    ...(user?.role === "admin" ? [{ to: "/admin", label: "Admin", icon: "shield" }] : [])
  ];

  async function handleLogout() {
    try {
      await logout();
      toast.info("Signed out successfully");
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <>
      <Backdrop />
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/dashboard"><Brand /></NavLink>

          <nav className="nav-desktop">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                <Icon name={l.icon} size={17} /> {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="topbar-right">
            <NavLink to="/profile" className="topbar-user">
              <Avatar src={user?.avatar} name={user?.fullName} size={34} />
              <span>{user?.username}</span>
            </NavLink>
            <button className="icon-btn" onClick={handleLogout} aria-label="Log out" title="Log out">
              <Icon name="logout" size={19} />
            </button>
          </div>
        </div>
      </header>

      <main key={location.pathname} className="page page-enter">
        <Outlet />
      </main>

      <nav className="nav-mobile">
        {links.map(l => (
          <NavLink key={l.to} to={l.to} className={({ isActive }) => `tab ${isActive ? "active" : ""}`}>
            <Icon name={l.icon} size={22} />
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
