import React, { useState } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import { Sparkles, Key, Mail, Eye, EyeOff, ShieldCheck, Phone, Smartphone, CheckCircle, ArrowLeft } from 'lucide-react';

const Login = () => {
  const { addToast, login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Authentication mode: 'signin' | 'forgot'
  const [authMode, setAuthMode] = useState('signin');

  // Forgot Password step states: 1 (Email/Phone) | 2 (OTP) | 3 (Change Password) | 4 (Success)
  const [forgotStep, setForgotStep] = useState(1);

  // Forgot Password fields
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate server network authentication delay
    setTimeout(async () => {
      try {
        await login(email, password);
        setLoading(false);
        navigate('/');
      } catch (err) {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="login-wrapper flex-center">
      <div className="login-card card animate-slide-up">

        {/* Branding header block */}
        <div className="login-brand">
          <div className="brand-logo-icon">
            <Sparkles size={22} className="text-primary" />
          </div>
          <h2>Saas Enterprise</h2>
          <p>Workforce Management Administration Panel</p>
        </div>

        {/* SIGN IN FORM */}
        {authMode === 'signin' && (
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
              <button
                type="button"
                className="forgot-password-link-btn"
                onClick={() => setAuthMode('forgot')}
              >
                Forgot password?
              </button>
            </div>

            <Button variant="primary" type="submit" loading={loading} className="login-submit-btn">
              Sign In to Dashboard
            </Button>
          </form>
        )}

        {/* FORGOT PASSWORD STATEFUL FLOW */}
        {authMode === 'forgot' && (
          <div className="forgot-password-flow flex-column gap-4">

            <div className="forgot-header-sec flex-column items-center gap-1 text-center">
              {forgotStep < 4 && (
                <>
                  <h4>Reset Credentials</h4>
                  <p className="text-xs text-muted">Step {forgotStep} of 3: {
                    forgotStep === 1 ? 'Verify Email/Phone' :
                      forgotStep === 2 ? 'Enter OTP Verification' : 'Set New Password'
                  }</p>
                </>
              )}
            </div>

            <form onSubmit={handleForgotSubmit} className="login-form">

              {/* STEP 1: Enter email or phone */}
              {forgotStep === 1 && (
                <div className="form-group flex-column gap-3">
                  <label htmlFor="emailOrPhone">Registered Email / Phone</label>
                  <div className="login-input-wrapper">
                    <Mail size={16} className="input-icon" />
                    <input
                      id="emailOrPhone"
                      type="text"
                      required
                      placeholder="e.g. admin@saas.com or +123456789"
                      value={emailOrPhone}
                      onChange={(e) => setEmailOrPhone(e.target.value)}
                      className="form-control login-control"
                    />
                  </div>
                  <p className="forgot-help-hint text-xs text-muted">We will send a 6-digit verification code to this address.</p>

                  <Button variant="primary" type="submit" loading={loading} className="forgot-submit-btn">
                    Send Verification Code (OTP)
                  </Button>
                </div>
              )}

              {/* STEP 2: Enter OTP code */}
              {forgotStep === 2 && (
                <div className="form-group flex-column gap-3">
                  <label htmlFor="otpCode">OTP Verification Code</label>
                  <div className="login-input-wrapper">
                    <Smartphone size={16} className="input-icon" />
                    <input
                      id="otpCode"
                      type="text"
                      required
                      placeholder="Enter 6-digit OTP code"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="form-control login-control"
                    />
                  </div>
                  <p className="forgot-help-hint text-xs text-muted">
                    Enter code <strong className="text-primary font-mono">123456</strong> to verify mock simulation.
                  </p>

                  <Button variant="primary" type="submit" loading={loading} className="forgot-submit-btn">
                    Verify Code & Continue
                  </Button>
                </div>
              )}

              {/* STEP 3: Change Password */}
              {forgotStep === 3 && (
                <div className="form-group flex-column gap-3">

                  <div className="flex-column gap-1">
                    <label htmlFor="newPassword">New Password</label>
                    <div className="login-input-wrapper">
                      <Key size={16} className="input-icon" />
                      <input
                        id="newPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        placeholder="Choose new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="form-control login-control"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex-column gap-1">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <div className="login-input-wrapper">
                      <Key size={16} className="input-icon" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Re-enter password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="form-control login-control"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <Button variant="primary" type="submit" loading={loading} className="forgot-submit-btn">
                    Reset & Change Password
                  </Button>
                </div>
              )}

              {/* STEP 4: Success Message */}
              {forgotStep === 4 && (
                <div className="success-forgot-panel flex-column items-center gap-3 text-center py-2">
                  <div className="success-circle-check-wrapper text-success mb-2">
                    <CheckCircle size={48} className="success-icon-glowing" />
                  </div>
                  <h4>Password Reset Success!</h4>
                  <p className="text-sm text-secondary">
                    Your password has been changed successfully. You can now sign in using your new credentials.
                  </p>

                  <Button variant="primary" type="button" onClick={handleBackToSignIn} className="forgot-submit-btn">
                    Return to Sign In
                  </Button>
                </div>
              )}

            </form>

            {/* Back links layout */}
            {forgotStep < 4 && (
              <button
                type="button"
                className="forgot-back-nav"
                onClick={() => {
                  if (forgotStep === 1) handleBackToSignIn();
                  else setForgotStep(forgotStep - 1);
                }}
              >
                <ArrowLeft size={14} />
                <span>{forgotStep === 1 ? 'Cancel & Return' : 'Go Back'}</span>
              </button>
            )}

          </div>
        )}

        <div className="login-footer-notice">
          <ShieldCheck size={14} className="text-success" />
          <span>Secured with AES-256 and multi-factor compliance triggers.</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
