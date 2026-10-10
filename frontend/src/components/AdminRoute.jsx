import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// UI-র পাহারা। আসল নিরাপত্তা ব্যাকএন্ডের verifyAdmin
export default function AdminRoute() {
    const { user } = useAuth();
    if (user?.role !== "admin")
        return <Navigate to="/users/dashboard" replace />;
    return <Outlet />;
}
