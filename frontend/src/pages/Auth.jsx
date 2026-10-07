import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap } from 'lucide-react';
import './Auth.css'; // এখানে কাস্টম CSS লিংক করা হলো

const Auth = () => {
  const [view, setView] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      if (view === 'signup') setView('login');
      else console.log('Submitted Data:', formData);
    }, 1500);
  };

  return (
    <div className="auth-page">
      
      {/* Background glowing effects */}
      <div className="glow-blob blob-1"></div>
      <div className="glow-blob blob-2"></div>

      <div className="auth-card">
        
        {/* Header */}
        <div className="auth-header">
          <div className="logo-icon">
            <Zap color="white" size={24} />
          </div>
          <h2>{view === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
          <p>
            {view === 'login' 
              ? 'Log in to your Email Sender dashboard' 
              : 'Start sending professional emails today'}
          </p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          
          {view === 'signup' && (
            <div className="input-group">
              <User className="input-icon" size={20} />
              <input type="text" name="name" placeholder="Full Name" required value={formData.name} onChange={handleChange} />
            </div>
          )}

          <div className="input-group">
            <Mail className="input-icon" size={20} />
            <input type="email" name="email" placeholder="Email Address" required value={formData.email} onChange={handleChange} />
          </div>

          <div className="input-group">
            <Lock className="input-icon" size={20} />
            <input type={showPassword ? "text" : "password"} name="password" placeholder="Password" required value={formData.password} onChange={handleChange} />
            <button type="button" className="toggle-pass" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? <span className="spinner"></span> : (
              <>
                {view === 'login' ? 'Log In' : 'Create Account'}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          {view === 'login' ? (
            <p>Don't have an account? <button type="button" onClick={() => setView('signup')}>Sign up</button></p>
          ) : (
            <p>Already have an account? <button type="button" onClick={() => setView('login')}>Log in</button></p>
          )}
        </div>

      </div>
    </div>
  );
};

export default Auth;