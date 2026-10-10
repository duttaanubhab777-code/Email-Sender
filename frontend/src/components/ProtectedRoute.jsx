import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Splash from "./ui/Splash";

export default function ProtectedRoute() {
    const { user, loading, justLoggedOut } = useAuth();
    const location = useLocation();
    if (loading) return <Splash />;
    if (!user)
        return (
            <Navigate
                to="/users/login"
                replace
                state={justLoggedOut ? null : { from: location }}
            />
        );
    return <Outlet />;
}
