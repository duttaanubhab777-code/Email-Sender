import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../../services/api"; // api.js থেকে ফাংশনটি ইমপোর্ট করা হচ্ছে

export default function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState(null); // ছবি সেভ করার জন্য
  
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // ছবি ও টেক্সট একসাথে পাঠানোর জন্য FormData ব্যবহার করছি
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("username", username.toLowerCase());
      formData.append("email", email.toLowerCase());
      formData.append("password", password);
      
      // ইউজার যদি ছবি সিলেক্ট করে, তবেই সেটা অ্যাড করব
      if (avatar) {
        formData.append("avatar", avatar);
      }

      // API কল
      await registerUser(formData);
      
      // রেজিস্ট্রেশন সফল হলে অ্যালার্ট দেখিয়ে লগইন পেজে পাঠিয়ে দাও
      alert("Registration Successful! Please login.");
      navigate("/login", { replace: true });

    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-container"> 
      <div className="glass-card" style={{ padding: '2rem', maxWidth: '400px', margin: 'auto', marginTop: '5vh' }}>
        <h2 style={{ textAlign: 'center', color: 'white' }}>Create an Account</h2>
        
        {error && <p style={{ color: "#ff4d4d", textAlign: "center" }}>{error}</p>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div className="input-group">
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }} />
          </div>

          <div className="input-group">
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }} />
          </div>

          <div className="input-group">
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }} />
          </div>
          
          <div className="input-group">
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '5px', border: 'none' }} />
          </div>

          <div className="input-group">
            <label style={{ color: 'white', display: 'block', marginBottom: '5px' }}>Profile Picture (Optional)</label>
            {/* e.target.files[0] দিয়ে সিলেক্ট করা প্রথম ছবিটা ধরা হচ্ছে */}
            <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])} style={{ width: '100%', color: 'white' }} />
          </div>
          
          <button type="submit" disabled={submitting} style={{ padding: '10px', marginTop: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer', backgroundColor: '#4a90e2', color: 'white', fontWeight: 'bold' }}>
            {submitting ? "Registering..." : "Register"}
          </button>

        </form>
        
        <p style={{ textAlign: 'center', color: 'white', marginTop: '15px' }}>
          Already have an account? <Link to="/login" style={{ color: '#4a90e2' }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}