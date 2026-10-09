import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../styles/Register.css";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // পাহারাদার থেকে আসলে আগের পেজের ঠিকানা মনে রাখা
  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); // ব্রাউজারের ডিফল্ট রিলোড আটকাও
    setError("");
    setSubmitting(true);

    try {
      const id = identifier.trim();
      // @ থাকলে ইমেইল হিসেবে পাঠাবে, না থাকলে ইউজারনেম হিসেবে
      const payload = id.includes("@")
        ? { email: id.toLowerCase(), password }
        : { username: id.toLowerCase(), password };

      await login(payload);
      
      // লগইন সফল হলে ড্যাশবোর্ডে পাঠাও (replace: true দিলে ব্যাক বাটনে আর লগইন পেজে ফিরবে না)
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message); // ভুল পাসওয়ার্ড বা এরর মেসেজ দেখাও
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-container"> 
      <div className="glass-card login-card">
        <h2 className="login-title">Welcome Back</h2>
        
        {error && <p className="error-message">{error}</p>}
        
        <form onSubmit={handleSubmit} className="login-form">
          
          <div className="input-group">
            <label className="input-label">Email or Username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.toLowerCase())}
              placeholder="Enter your email or username"
              required
              className="input-field"
            />
          </div>
          
          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="input-field"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={submitting}
            className="submit-btn"
          >
            {submitting ? "Checking..." : "Login"}
          </button>

        </form>
        
        <p className="register-redirect-text">
          Don't have an account? <Link to="/register" className="register-link">Register here</Link>
        </p>
      </div>
    </div>
  );
}