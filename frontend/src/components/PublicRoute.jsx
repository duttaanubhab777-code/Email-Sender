import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Spinner from "./Spinner";
import Backdrop from "./Backdrop";
import ThemeToggle from "./ThemeToggle";

export default function PublicRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Spinner />;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Backdrop />
      <div className="theme-float"><ThemeToggle /></div>
      <Outlet />
    </>
  );
}
