import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Login from "./features/auth/Login";
import Register from "./features/auth/Register";

function App() {
  return (
    <Routes>
      {/* শুধু লগআউট ইউজারদের জন্য */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* শুধু লগইন ইউজারদের জন্য */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<h1 style={{color: 'white'}}>Dashboard Page</h1>} />
        <Route path="/profile" element={<h1 style={{color: 'white'}}>Profile Page</h1>} />
      </Route>

      {/* ভুল ইউআরএল-এর জন্য */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<h1 style={{color: 'white'}}>404 Not Found</h1>} />
    </Routes>
  );
}

export default App;