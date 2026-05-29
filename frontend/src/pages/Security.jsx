import React, { useState } from 'react';
import './Security.css';
import { useApp } from '../context/AppContext';
import usePageLoading from '../hooks/usePageLoading';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import {
  Shield,
  Key,
  Smartphone,
  Globe,
  Settings,
  Plus,
  Trash2,
  AlertTriangle,
  Tv,
  CheckCircle,
  Eye,
  RefreshCw
} from 'lucide-react';

const initialSessions = [
  { id: 'S-01', device: 'Chrome on Windows 11 (HQ Office)', ip: '192.168.1.120', status: 'Current Session', date: 'Active now' },
  { id: 'S-02', device: 'Safari on iPhone 15 Pro (Mobile)', ip: '172.56.21.90', status: 'Active', date: '2 hours ago' },
  { id: 'S-03', device: 'Firefox on macOS Sonoma (Home)', ip: '72.190.43.15', status: 'Active', date: '3 days ago' }
];

const initialIps = [
  { id: 'IP-01', range: '192.168.1.0/24', label: 'Office LAN Primary', status: 'Active' },
  { id: 'IP-02', range: '10.0.0.0/8', label: 'Internal VPN Range', status: 'Active' }
];

const Security = () => {
  const { addToast, showConfirm } = useApp();
  const loading = usePageLoading();

  const [tfaEnabled, setTfaEnabled] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('30m');
  const [sessions, setSessions] = useState(initialSessions);
  const [ipList, setIpList] = useState(initialIps);
  
  // Whitelist IP form
  const [newIpRange, setNewIpRange] = useState('');
  const [newIpLabel, setNewIpLabel] = useState('');

  // Password policies
  const [passMinLength, setPassMinLength] = useState(12);
  const [requireSpecial, setRequireSpecial] = useState(true);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [expireDays, setExpireDays] = useState(90);

  const handleRevokeSession = (sessionId, deviceName) => {
    showConfirm(
      'Revoke Active Session?',
      `Are you sure you want to log out the session on "${deviceName}"? The device will be forced to log in again.`,
      () => {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        addToast('warning', `Session on "${deviceName}" has been revoked.`);
      },
      'danger'
    );
  };

  const handleAddIp = (e) => {
    e.preventDefault();
    if (!newIpRange || !newIpLabel) {
      addToast('error', 'Please fill in all IP whitelist fields.');
      return;
    }
    const entry = {
      id: `IP-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
      range: newIpRange,
      label: newIpLabel,
      status: 'Active'
    };
    setIpList(prev => [...prev, entry]);
    setNewIpRange('');
    setNewIpLabel('');
    addToast('success', `IP Range "${entry.range}" added to Whitelist.`);
  };

  const handleRemoveIp = (ipId, rangeStr) => {
    setIpList(prev => prev.filter(ip => ip.id !== ipId));
    addToast('warning', `IP Range "${rangeStr}" removed from Whitelist.`);
  };

  const handleSavePolicies = (e) => {
    e.preventDefault();
    addToast('success', 'Password security policies updated successfully.');
  };

  const handleRegenerateCodes = () => {
    addToast('info', 'New two-factor backup codes generated. Save them securely.');
  };

  if (loading) {
    return (
      <div className="page-loading-wrapper">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="security-page animate-fade-in">
      {/* Header */}
      <div className="security-header">
        <div className="security-title-section">
          <h1>Security Settings</h1>
          <p className="subtitle">Configure corporate security policies, active user session lifespans, and IP restrictions.</p>
        </div>
      </div>

      <div className="security-grid">
        
        {/* Left Column: 2FA & Whitelisting */}
        <div className="security-left-col">
          
          {/* Two-Factor Authentication (2FA) Card */}
          <div className="security-card card">
            <div className="card-header">
              <div className="header-icon-title">
                <Smartphone className="text-primary" size={20} />
                <h3>Two-Factor Authentication (2FA)</h3>
              </div>
              <Badge variant={tfaEnabled ? 'success' : 'secondary'}>
                {tfaEnabled ? 'Enforced' : 'Disabled'}
              </Badge>
            </div>
            
            <div className="card-body-content">
              <p className="body-desc">
                Require a verification code from a mobile authenticator app (Google Authenticator, Duo) to sign in to administrator accounts.
              </p>
              
              <div className="tfa-toggle-row">
                <span>Enforce 2FA for all Super Admins</span>
                <button
                  className={`tfa-toggle-btn ${tfaEnabled ? 'active' : ''}`}
                  onClick={() => {
                    setTfaEnabled(!tfaEnabled);
                    addToast(tfaEnabled ? 'warning' : 'success', `2FA requirement ${tfaEnabled ? 'disabled' : 'enforced'}.`);
                  }}
                >
                  <div className="toggle-thumb"></div>
                </button>
              </div>

              {tfaEnabled && (
                <div className="tfa-setup-section animate-slide-up">
                  <div className="qr-wrapper">
                    {/* Simulated SVG QR Code */}
                    <svg width="100" height="100" viewBox="0 0 100 100" className="qr-svg">
                      <rect width="100" height="100" fill="#fff" />
                      <rect x="10" y="10" width="20" height="20" fill="#000" />
                      <rect x="15" y="15" width="10" height="10" fill="#fff" />
                      <rect x="70" y="10" width="20" height="20" fill="#000" />
                      <rect x="75" y="15" width="10" height="10" fill="#fff" />
                      <rect x="10" y="70" width="20" height="20" fill="#000" />
                      <rect x="15" y="75" width="10" height="10" fill="#fff" />
                      {/* Random noise squares */}
                      <rect x="40" y="20" width="10" height="15" fill="#000" />
                      <rect x="55" y="40" width="15" height="10" fill="#000" />
                      <rect x="30" y="55" width="10" height="10" fill="#000" />
                      <rect x="50" y="60" width="10" height="20" fill="#000" />
                      <rect x="80" y="50" width="10" height="10" fill="#000" />
                      <rect x="75" y="80" width="15" height="10" fill="#000" />
                      <rect x="45" y="45" width="10" height="10" fill="#000" />
                    </svg>
                    <div className="qr-details">
                      <span className="details-title">Authenticator Key</span>
                      <span className="details-key">SAAS-ADMN-SECURE-2026</span>
                      <button className="regenerate-btn" onClick={handleRegenerateCodes}>
                        <RefreshCw size={12} /> Regenerate Codes
                      </button>
                    </div>
                  </div>
                  <div className="backup-codes">
                    <span className="backup-title">Backup Recovery Codes</span>
                    <div className="codes-grid">
                      <span>4452-9901</span>
                      <span>1120-4389</span>
                      <span>6739-1055</span>
                      <span>8821-3094</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* IP Whitelisting Card */}
          <div className="security-card card">
            <div className="card-header">
              <div className="header-icon-title">
                <Globe className="text-primary" size={20} />
                <h3>IP Whitelist Restrictions</h3>
              </div>
            </div>

            <div className="card-body-content">
              <p className="body-desc">
                Restrict workspace administration access to the following IP ranges. If enabled, access attempts from outside these blocks will be rejected.
              </p>

              <div className="whitelist-items">
                {ipList.map((ip) => (
                  <div key={ip.id} className="ip-row">
                    <div>
                      <span className="ip-range">{ip.range}</span>
                      <span className="ip-label">{ip.label}</span>
                    </div>
                    <div className="ip-actions">
                      <Badge variant="success">Active</Badge>
                      <button className="delete-ip-btn" onClick={() => handleRemoveIp(ip.id, ip.range)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add IP Form */}
              <form onSubmit={handleAddIp} className="add-ip-form">
                <div className="ip-form-inputs">
                  <input
                    type="text"
                    placeholder="e.g. 192.168.1.1/24"
                    value={newIpRange}
                    onChange={(e) => setNewIpRange(e.target.value)}
                    required
                    className="form-control"
                  />
                  <input
                    type="text"
                    placeholder="e.g. Branch Office VPN"
                    value={newIpLabel}
                    onChange={(e) => setNewIpLabel(e.target.value)}
                    required
                    className="form-control"
                  />
                </div>
                <Button variant="secondary" size="sm" type="submit" icon={Plus}>
                  Add IP Address
                </Button>
              </form>
            </div>
          </div>

        </div>

        {/* Right Column: Sessions & Password Policies */}
        <div className="security-right-col">
          
          {/* Active Sessions Card */}
          <div className="security-card card">
            <div className="card-header">
              <div className="header-icon-title">
                <Tv className="text-primary" size={20} />
                <h3>Active Administrator Sessions</h3>
              </div>
            </div>

            <div className="card-body-content">
              <div className="session-timeout-picker">
                <span>Inactivity Session Timeout</span>
                <select
                  value={sessionTimeout}
                  onChange={(e) => {
                    setSessionTimeout(e.target.value);
                    addToast('success', `Session timeout updated to ${e.target.value}.`);
                  }}
                  className="form-control"
                >
                  <option value="15m">15 Minutes</option>
                  <option value="30m">30 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="12h">12 Hours</option>
                </select>
              </div>

              <div className="sessions-list">
                {sessions.map((s) => (
                  <div key={s.id} className="session-row">
                    <div className="session-main">
                      <span className="session-device">{s.device}</span>
                      <span className="session-meta">IP: {s.ip} • Last seen {s.date}</span>
                    </div>
                    {s.status === 'Current Session' ? (
                      <Badge variant="info">Current</Badge>
                    ) : (
                      <button
                        className="session-revoke-btn"
                        onClick={() => handleRevokeSession(s.id, s.device)}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Password Policy Card */}
          <div className="security-card card">
            <div className="card-header">
              <div className="header-icon-title">
                <Key className="text-primary" size={20} />
                <h3>Password Security Policy</h3>
              </div>
            </div>

            <form onSubmit={handleSavePolicies} className="card-body-content">
              <div className="policy-settings-stack">
                <div className="policy-row">
                  <label htmlFor="min-len">Minimum Password Length</label>
                  <select
                    id="min-len"
                    value={passMinLength}
                    onChange={(e) => setPassMinLength(Number(e.target.value))}
                    className="form-control"
                  >
                    <option value={8}>8 Characters</option>
                    <option value={12}>12 Characters (Recommended)</option>
                    <option value={16}>16 Characters</option>
                  </select>
                </div>

                <div className="policy-row">
                  <label htmlFor="expire-days">Password Expiration Interval</label>
                  <select
                    id="expire-days"
                    value={expireDays}
                    onChange={(e) => setExpireDays(Number(e.target.value))}
                    className="form-control"
                  >
                    <option value={30}>Every 30 Days</option>
                    <option value={90}>Every 90 Days</option>
                    <option value={180}>Every 180 Days</option>
                    <option value={0}>Never Expire</option>
                  </select>
                </div>

                <div className="policy-checkbox-group">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={requireSpecial}
                      onChange={(e) => setRequireSpecial(e.target.checked)}
                    />
                    <span>Require special characters (!@#$%^&*)</span>
                  </label>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={requireNumbers}
                      onChange={(e) => setRequireNumbers(e.target.checked)}
                    />
                    <span>Require alphanumeric digits (0-9)</span>
                  </label>
                </div>

                <div className="security-alert-box">
                  <AlertTriangle size={16} className="text-warning" />
                  <p>Enforced rules apply to all branch administrators, team leaders, and employees immediately.</p>
                </div>

                <Button variant="primary" size="sm" type="submit">
                  Save Password Policies
                </Button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Security;
