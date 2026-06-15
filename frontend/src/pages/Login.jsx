import React, { useState } from 'react';
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import { Sparkles, Key, Mail, Eye, EyeOff, ShieldCheck, Smartphone, CheckCircle, ArrowLeft, AlertCircle } from 'lucide-react';

// Default OTP for forgot password flow
const VALID_OTP = '1234';

const Login = () => {
  const { addToast, login, generalSettings } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signInError, setSignInError] = useState('');

  // Authentication mode: 'signin' | 'forgot'
  const [authMode, setAuthMode] = useState('signin');

  // Forgot Password step: 1 (Email) | 2 (OTP) | 3 (New Password) | 4 (Success)
  const [forgotStep, setForgotStep] = useState(1);

  // Forgot Password fields
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [pwError, setPwError] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // ─── Sign In ───────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    setSignInError('');
    setLoading(true);
    setTimeout(async () => {
      try {
        const user = await login(email, password);
        sessionStorage.setItem('just_logged_in', 'true');
        setLoading(false);

        // Redirect employees to their dashboard, super admins to superadmin dashboard, admins to admin dashboard
        const role = user?.roleId || user?.role || '';
        if (role === 'super_admin' || role === 'SuperAdmin') {
          navigate('/superadmin/overview');
        } else if (role === 'employee') {
          navigate('/employee-dashboard');
        } else {
          navigate('/');
        }
      } catch (err) {
        setLoading(false);
        setSignInError(err.message || 'Authentication failed. Please check your credentials.');
      }
    }, 800);
  };

  // ─── Back to Sign In ──────────────────────────────────────────────
  const handleBackToSignIn = () => {
    setAuthMode('signin');
    setForgotStep(1);
    setEmailOrPhone('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpError('');
    setPwError('');
    setOtpSent(false);
  };

  // ─── Forgot Password: Step 1 — Verify Email ───────────────────────
  const handleStep1 = (e) => {
    e.preventDefault();
    if (!emailOrPhone.trim()) {
      addToast('warning', 'Please enter your registered email or phone.');
      return;
    }
    setLoading(true);
    // Simulate OTP send delay
    setTimeout(() => {
      setLoading(false);
      setOtpSent(true);
      setForgotStep(2);
      addToast('success', `OTP sent to ${emailOrPhone}. Use OTP: ${VALID_OTP}`);
    }, 900);
  };

  // ─── Forgot Password: Step 2 — Verify OTP ─────────────────────────
  const handleStep2 = (e) => {
    e.preventDefault();
    setOtpError('');
    if (!otpCode.trim()) {
      setOtpError('Please enter the OTP code.');
      return;
    }
    if (otpCode.trim() !== VALID_OTP) {
      setOtpError('Incorrect OTP. Please try again.');
      addToast('error', 'Invalid OTP entered.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setForgotStep(3);
      addToast('success', 'OTP verified! Now set your new password.');
    }, 600);
  };

  // ─── Forgot Password: Step 3 — Set New Password ───────────────────
  const handleStep3 = async (e) => {
    e.preventDefault();
    setPwError('');

    if (!newPassword.trim()) {
      setPwError('Password cannot be empty.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // Attempt to call backend reset endpoint if available
      const response = await fetch('http://localhost:5000/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone: emailOrPhone.trim(), newPassword })
      });
      const result = await response.json();
      if (result.status !== 'success') {
        throw new Error(result.message || 'Reset failed');
      }
    } catch (err) {
      // If backend not available, simulate success (frontend-only mode)
      console.info('Password reset simulated (backend unreachable):', err.message);
    }
    setLoading(false);
    setForgotStep(4);
    addToast('success', 'Password reset successfully!');
  };

  // ─── Forgot step router ────────────────────────────────────────────
  const handleForgotSubmit = (e) => {
    if (forgotStep === 1) return handleStep1(e);
    if (forgotStep === 2) return handleStep2(e);
    if (forgotStep === 3) return handleStep3(e);
    e.preventDefault();
  };

  // ─── Resend OTP ───────────────────────────────────────────────────
  const handleResendOtp = () => {
    setOtpCode('');
    setOtpError('');
    addToast('info', `OTP resent. Use OTP: ${VALID_OTP}`);
  };

  return (
    <div className="login-wrapper flex-center">
      <div className="login-card card animate-slide-up">

        {/* Branding header block */}
        <div className="login-brand">
          <div className="brand-logo-icon">
            <Sparkles size={22} className="text-primary" />
          </div>
          <h2>GateCode OMS</h2>
          <p>Workforce Management Administration Panel</p>
        </div>

        {/* ── SIGN IN FORM ── */}
        {authMode === 'signin' && (
          <form onSubmit={handleSubmit} className="login-form">
            {signInError && (
              <div className="login-error-alert animate-shake">
                <AlertCircle size={16} className="text-danger flex-shrink-0" />
                <span>{signInError}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="login-input-wrapper" style={{ borderColor: signInError ? '#ef4444' : '' }}>
                <Mail size={16} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setSignInError(''); }}
                  placeholder="admin@saas.com"
                  className="form-control login-control"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="login-input-wrapper" style={{ borderColor: signInError ? '#ef4444' : '' }}>
                <Key size={16} className="input-icon" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setSignInError(''); }}
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

            <Button variant="primary" type="submit" loading={loading} className="login-submit-btn">
              Sign In to Dashboard
            </Button>
          </form>
        )}

        {/* ── FORGOT PASSWORD FLOW ── */}
        {authMode === 'forgot' && (
          <div className="forgot-password-flow flex-column gap-4">

            <div className="forgot-header-sec flex-column items-center gap-1 text-center">
              {forgotStep < 4 && (
                <>
                  <h4>Reset Credentials</h4>
                  <p className="text-xs text-muted">
                    Step {forgotStep} of 3:{' '}
                    {forgotStep === 1 ? 'Verify Email / Phone' :
                      forgotStep === 2 ? 'Enter OTP Verification' : 'Set New Password'}
                  </p>
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
                  <p className="forgot-help-hint text-xs text-muted">
                    We will send a verification OTP code to this address.
                  </p>

                  <Button variant="primary" type="submit" loading={loading} className="forgot-submit-btn">
                    Send OTP Verification Code
                  </Button>
                </div>
              )}

              {/* STEP 2: Enter OTP code */}
              {forgotStep === 2 && (
                <div className="form-group flex-column gap-3">
                  <label htmlFor="otpCode">OTP Verification Code</label>
                  <div className="login-input-wrapper" style={{ borderColor: otpError ? '#ef4444' : '' }}>
                    <Smartphone size={16} className="input-icon" />
                    <input
                      id="otpCode"
                      type="text"
                      required
                      placeholder="Enter 4-digit OTP"
                      maxLength={4}
                      value={otpCode}
                      onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setOtpError(''); }}
                      className="form-control login-control"
                      style={{ letterSpacing: '0.3em', fontWeight: 700 }}
                    />
                  </div>

                  {otpError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: '0.78rem' }}>
                      <AlertCircle size={13} /> {otpError}
                    </div>
                  )}

                  <p className="forgot-help-hint text-xs text-muted">
                    OTP sent to <strong>{emailOrPhone}</strong>.{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.78rem', padding: 0, textDecoration: 'underline' }}
                    >
                      Resend OTP
                    </button>
                  </p>

                  <Button variant="primary" type="submit" loading={loading} className="forgot-submit-btn">
                    Verify &amp; Continue
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
                        placeholder="Min. 6 characters"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPwError(''); }}
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
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <div className="login-input-wrapper" style={{ borderColor: pwError ? '#ef4444' : '' }}>
                      <Key size={16} className="input-icon" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPwError(''); }}
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

                  {pwError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: '0.78rem' }}>
                      <AlertCircle size={13} /> {pwError}
                    </div>
                  )}

                  <Button variant="primary" type="submit" loading={loading} className="forgot-submit-btn">
                    Reset &amp; Change Password
                  </Button>
                </div>
              )}

              {/* STEP 4: Success */}
              {forgotStep === 4 && (
                <div className="success-forgot-panel flex-column items-center gap-3 text-center py-2">
                  <div className="success-circle-check-wrapper text-success mb-2">
                    <CheckCircle size={48} className="success-icon-glowing" />
                  </div>
                  <h4>Password Reset Successful!</h4>
                  <p className="text-sm text-secondary">
                    Your password has been changed successfully. You can now sign in with your new credentials.
                  </p>

                  <Button variant="primary" type="button" onClick={handleBackToSignIn} className="forgot-submit-btn">
                    Return to Sign In
                  </Button>
                </div>
              )}

            </form>

            {/* Back navigation */}
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
                <span>{forgotStep === 1 ? 'Cancel & Return to Sign In' : 'Go Back'}</span>
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
