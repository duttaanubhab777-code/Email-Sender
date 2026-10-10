import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import AdminRoute from "./components/AdminRoute";
import ConsoleLayout from "./components/ConsoleLayout";
import SystemWatcher from "./components/SystemWatcher";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";
import VerifyRegister from "./features/auth/VerifyRegister";
import ForgotPassword from "./features/auth/ForgotPassword";
import ResetPassword from "./features/auth/ResetPassword";
import Dashboard from "./features/dashboard/Dashboard";
import UserProfile from "./features/profile/UserProfile";
import ApiKeys from "./features/apikeys/ApiKeys";
import MailSend from "./features/mail/MailSend";
import AdminDashboard from "./features/admin/AdminDashboard";
import AdminUsers from "./features/admin/AdminUsers";
import CreateAdmin from "./features/admin/CreateAdmin";
import Approvals from "./features/approvals/Approvals";
import KillSwitch from "./features/killswitch/KillSwitch";
import SystemStatus from "./features/system/SystemStatus";
import NotFound from "./features/notfound/NotFound";

// Frontend route গুলো ব্যাকএন্ডের API path এর সাথে হুবহু মেলানো:
//   /api/v1/users/...      -> /users/...
//   /api/v1/apiKeys/all    -> /apiKeys/all
//   /api/v1/mail/send      -> /mail/send
//   /api/v1/admin/...      -> /admin/...
//   /api/v1/approvals      -> /approvals
//   /api/v1/kill-switch    -> /kill-switch
//   /api/v1/system/status  -> /system/status
function App() {
    return (
        <>
            {/* Kill switch চালু হলে যেকোনো পেজ থেকে /system/status এ নিয়ে যায় */}
            <SystemWatcher />
            <Routes>
                {/* সবার জন্য খোলা (লগইন থাকুক বা না থাকুক) */}
                <Route path="/system/status" element={<SystemStatus />} />

                {/* শুধু লগআউট ইউজারদের জন্য */}
                <Route element={<PublicRoute />}>
                    <Route path="/users/login" element={<Login />} />
                    <Route path="/users/register" element={<Register />} />
                    <Route
                        path="/users/register/verify"
                        element={<VerifyRegister />}
                    />
                    <Route
                        path="/users/forgot-password"
                        element={<ForgotPassword />}
                    />
                    <Route
                        path="/users/forgot-password/reset"
                        element={<ResetPassword />}
                    />
                </Route>

                {/* শুধু লগইন ইউজারদের জন্য (সাইডবার + টপবার + মোবাইল ট্যাব বার) */}
                <Route element={<ProtectedRoute />}>
                    <Route element={<ConsoleLayout />}>
                        <Route
                            path="/users/dashboard"
                            element={<Dashboard />}
                        />
                        <Route
                            path="/users/current-user"
                            element={<UserProfile />}
                        />
                        <Route path="/apiKeys/all" element={<ApiKeys />} />
                        <Route path="/mail/send" element={<MailSend />} />

                        {/* শুধু অ্যাডমিনদের জন্য (Admin + Super Admin) */}
                        <Route element={<AdminRoute />}>
                            <Route
                                path="/admin"
                                element={<Navigate to="/admin/stats" replace />}
                            />
                            <Route
                                path="/admin/stats"
                                element={<AdminDashboard />}
                            />
                            <Route
                                path="/admin/users"
                                element={<AdminUsers />}
                            />
                            <Route
                                path="/admin/create-admin"
                                element={<CreateAdmin />}
                            />
                            <Route path="/approvals" element={<Approvals />} />
                            <Route
                                path="/kill-switch"
                                element={<KillSwitch />}
                            />
                        </Route>
                    </Route>
                </Route>

                {/* আগের পুরনো লিংক/বুকমার্ক কাজ করবে */}
                <Route
                    path="/"
                    element={<Navigate to="/users/dashboard" replace />}
                />
                <Route
                    path="/login"
                    element={<Navigate to="/users/login" replace />}
                />
                <Route
                    path="/register"
                    element={<Navigate to="/users/register" replace />}
                />
                <Route
                    path="/dashboard"
                    element={<Navigate to="/users/dashboard" replace />}
                />
                <Route
                    path="/profile"
                    element={<Navigate to="/users/current-user" replace />}
                />

                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
}

export default App;
