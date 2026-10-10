import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Splash from "./ui/Splash";

// শুধু লগআউট ইউজারদের পেজ (login/register/forgot)
export default function PublicRoute() {
    const { user, loading } = useAuth();
    if (loading) return <Splash />;
    if (user) return <Navigate to="/users/dashboard" replace />;
    return <Outlet />;
}
