import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

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
      {/* এখানে তোমার গ্লাস কার্ডের CSS ক্লাস বসবে */}
      <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', margin: 'auto', marginTop: '10vh' }}>
        <h2 style={{ textAlign: 'center', color: 'white' }}>Welcome Back</h2>
        
        {/* এরর থাকলে লাল রঙে দেখাবে */}
        {error && <p style={{ color: "#ff4d4d", textAlign: "center" }}>{error}</p>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="input-group">
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Email or Username</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your email or username"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }}
            />
          </div>
          
          <div className="input-group">
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={submitting}
            style={{ padding: '10px', marginTop: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', backgroundColor: '#4a90e2', color: 'white', fontWeight: 'bold' }}
          >
            {submitting ? "Checking..." : "Login"}
          </button>

        </form>
        
        <p style={{ textAlign: 'center', color: 'white', marginTop: '15px' }}>
          Don't have an account? <Link to="/register" style={{ color: '#4a90e2' }}>Register here</Link>
        </p>
      </div>
    </div>
  );
}