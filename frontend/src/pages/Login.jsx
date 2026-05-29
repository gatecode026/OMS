import React, { useState } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import { Sparkles, Key, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const Login = () => {
  const { addToast, setCurrentUserRole } = useApp();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('admin@saas.com');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate server network authentication delay
    setTimeout(() => {
      setLoading(false);
      
      // Store mock authentication token to persist login state across reloads
      sessionStorage.setItem('saas_token', 'mock-admin-token');
      setCurrentUserRole('super_admin');
      
      addToast('success', 'Authenticated successfully. Welcome back, Aarav Sharma!');
      navigate('/');
    }, 1200);
  };

  return (
    <div className="login-wrapper flex-center">
      <div className="login-card card animate-slide-up">
        {/* Branding logo */}
        <div className="login-brand">
          <div className="brand-logo-icon">
            <Sparkles size={22} className="text-primary" />
          </div>
          <h2>Saas Enterprise</h2>
          <p>Workforce Management Administration Panel</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="login-input-wrapper">
              <Mail size={16} className="input-icon" />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@saas.com"
                className="form-control login-control"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="login-input-wrapper">
              <Key size={16} className="input-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="form-control login-control"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="login-options">
            <label className="remember-me">
              <input type="checkbox" defaultChecked />
              <span>Keep session active</span>
            </label>
            <a href="#forgot" className="forgot-password-link" onClick={() => addToast('info', 'Contact system IT support to reset admin credentials.')}>
              Forgot password?
            </a>
          </div>

          <Button variant="primary" type="submit" loading={loading} className="login-submit-btn">
            Sign In to Dashboard
          </Button>
        </form>

        <div className="login-footer-notice">
          <ShieldCheck size={14} className="text-success" />
          <span>Secured with AES-256 and multi-factor compliance triggers.</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
