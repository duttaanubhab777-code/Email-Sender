import { useState } from 'react';

export default function Auth() {
  // state গুলো
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');

  return (
    <div className="auth-container">
      <div className="glass-card">
        <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        
        <form onSubmit={(e) => e.preventDefault()}>
          
          {/* যদি isLogin ফলস (False) হয়, অর্থাৎ ইউজার রেজিস্টার করতে চায়, তখন Name এবং Username দেখাবে */}
          {!isLogin && (
            <>
              <div className="input-group">
                <label>Name</label>
                <input type="text" placeholder="Enter your full name" />
              </div>

              <div className="input-group">
                <label>Username</label>
                <input 
                  type="text" 
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => {
                    // বড় হাতের অক্ষর ছোট করা এবং স্পেস বা স্পেশাল ক্যারেক্টার মুছে ফেলা
                    const formattedValue = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
                    setUsername(formattedValue);
                  }}
                />
              </div>
            </>
          )}

          {/* ইমেইল এবং পাসওয়ার্ড (লগইন এবং রেজিস্টার দুটোতেই দেখাবে) */}
          <div className="input-group">
            <label>Email</label>
            <input type="email" placeholder="Enter your email" />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input type="password" placeholder="Enter your password" />
          </div>

          <button className="submit-btn" type="submit">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <p className="toggle-text">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          
          {/* এখানে ক্লিক করলে isLogin এর মান উল্টে যাবে */}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register here' : 'Login here'}
          </span>
        </p>

      </div>
    </div>
  );
}