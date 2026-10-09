import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// শুধু role === "admin" ইউজার ঢুকতে পারবে (UI-র পাহারা; আসল নিরাপত্তা ব্যাকএন্ডে লাগবে)
export default function AdminRoute() {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
