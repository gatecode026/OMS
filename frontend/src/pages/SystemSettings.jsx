import React, { useState } from 'react';
import './Settings.css';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import {
  Settings, Bell, Shield, Globe, Palette, Database, Mail,
  Smartphone, Lock, Users, Save, RefreshCw, Check, ChevronRight,
  Monitor, Moon, Sun, Zap
} from 'lucide-react';

const settingsSections = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'email', label: 'Email & SMTP', icon: Mail },
  { id: 'integrations', label: 'Integrations', icon: Zap },
  { id: 'backup', label: 'Backup & Data', icon: Database }
];

const ToggleSwitch = ({ checked, onChange, label, desc }) => (
  <div className="setting-toggle-row">
    <div className="setting-toggle-info">
      <span className="setting-item-label">{label}</span>
      {desc && <span className="setting-item-desc">{desc}</span>}
    </div>
    <button
      className={`toggle-switch ${checked ? 'toggle-on' : ''}`}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
    >
      <span className="toggle-thumb" />
    </button>
  </div>
);

const SettingsInput = ({ label, value, onChange, type = 'text', placeholder }) => (
  <div className="settings-field">
    <label className="settings-field-label">{label}</label>
    <input
      type={type}
      className="settings-input"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  </div>
);

const SystemSettings = () => {
  const { addToast, currentUser } = useApp();

  const [activeSection, setActiveSection] = useState('general');
  const [saved, setSaved] = useState(false);

  // General Settings state
  const [companyName, setCompanyName] = useState('Office Management Pvt. Ltd.');
  const [timezone, setTimezone] = useState('IST (UTC+5:30)');
  const [language, setLanguage] = useState('English (IN)');
  const [dateFormat, setDateFormat] = useState('DD-MM-YYYY');
  const [currency, setCurrency] = useState('INR (₹)');
  const [fiscalYear, setFiscalYear] = useState('January');

  // Appearance state
  const [theme, setTheme] = useState('dark');
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [fontSize, setFontSize] = useState('medium');
  const [sidebarDense, setSidebarDense] = useState(false);

  // Notification state
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [leaveAlerts, setLeaveAlerts] = useState(true);
  const [payrollAlerts, setPayrollAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Security state
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30 minutes');
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState('');

  const handleSave = () => {
    setSaved(true);
    addToast('success', 'Settings saved successfully!');
    setTimeout(() => setSaved(false), 2000);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">General Settings</h3>
            <p className="settings-section-desc">Configure your organisation's basic information and regional preferences.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Organisation Info</h4>
              <div className="settings-fields-grid">
                <SettingsInput label="Company Name" value={companyName} onChange={setCompanyName} placeholder="Office Management Pvt. Ltd." />
                <SettingsInput label="Fiscal Year Start" value={fiscalYear} onChange={setFiscalYear} placeholder="April" />
                <SettingsInput label="Default Currency" value={currency} onChange={setCurrency} placeholder="INR (₹)" />
                <SettingsInput label="Date Format" value={dateFormat} onChange={setDateFormat} placeholder="YYYY-MM-DD" />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Localisation</h4>
              <div className="settings-fields-grid">
                <SettingsInput label="Default Language" value={language} onChange={setLanguage} placeholder="English (US)" />
                <SettingsInput label="Timezone" value={timezone} onChange={setTimezone} placeholder="UTC-5 (Eastern Time)" />
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Appearance</h3>
            <p className="settings-section-desc">Customise the look and feel of your dashboard.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Theme</h4>
              <div className="theme-picker">
                {[
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'auto', label: 'System', icon: Monitor }
                ].map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      className={`theme-btn ${theme === t.id ? 'active' : ''}`}
                      onClick={() => setTheme(t.id)}
                    >
                      <Icon size={18} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Accent Color</h4>
              <div className="accent-picker">
                {['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'].map(color => (
                  <button
                    key={color}
                    className={`accent-btn ${accentColor === color ? 'accent-active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setAccentColor(color)}
                    title={color}
                  />
                ))}
                <input
                  type="color"
                  className="accent-custom-input"
                  value={accentColor}
                  onChange={e => setAccentColor(e.target.value)}
                  title="Custom Color"
                />
              </div>
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Layout</h4>
              <ToggleSwitch
                checked={sidebarDense}
                onChange={setSidebarDense}
                label="Compact Sidebar"
                desc="Reduces the sidebar width for more content space"
              />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Notification Preferences</h3>
            <p className="settings-section-desc">Control how and when you receive alerts and system notifications.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Channels</h4>
              <ToggleSwitch checked={emailNotifs} onChange={setEmailNotifs} label="Email Notifications" desc="Receive system updates via email" />
              <ToggleSwitch checked={pushNotifs} onChange={setPushNotifs} label="In-App Push Alerts" desc="Real-time alerts within the platform" />
              <ToggleSwitch checked={weeklyDigest} onChange={setWeeklyDigest} label="Weekly Digest" desc="Summary email every Monday morning" />
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Alert Types</h4>
              <ToggleSwitch checked={leaveAlerts} onChange={setLeaveAlerts} label="Leave Request Alerts" desc="Notify when new leave requests are submitted" />
              <ToggleSwitch checked={payrollAlerts} onChange={setPayrollAlerts} label="Payroll Processed Alerts" desc="Notify when payroll runs are completed" />
              <ToggleSwitch checked={securityAlerts} onChange={setSecurityAlerts} label="Security & Login Alerts" desc="Notify on suspicious login activity" />
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="settings-section-content">
            <h3 className="settings-section-title">Security Settings</h3>
            <p className="settings-section-desc">Manage access controls and authentication policies.</p>

            <div className="settings-group">
              <h4 className="settings-group-title">Authentication</h4>
              <ToggleSwitch
                checked={twoFactor}
                onChange={setTwoFactor}
                label="Two-Factor Authentication"
                desc="Require 2FA for all admin accounts (recommended)"
              />
              <ToggleSwitch
                checked={loginAlerts}
                onChange={setLoginAlerts}
                label="Login Alert Emails"
                desc="Send email when new login is detected from unknown device"
              />
            </div>

            <div className="settings-group">
              <h4 className="settings-group-title">Session Policy</h4>
              <div className="settings-fields-grid">
                <div className="settings-field">
                  <label className="settings-field-label">Session Timeout</label>
                  <select
                    className="settings-input"
                    value={sessionTimeout}
                    onChange={e => setSessionTimeout(e.target.value)}
                  >
                    {['15 minutes', '30 minutes', '1 hour', '4 hours', '8 hours', 'Never'].map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <SettingsInput
                  label="IP Whitelist (comma separated)"
                  value={ipWhitelist}
                  onChange={setIpWhitelist}
                  placeholder="192.168.1.1, 10.0.0.0/24"
                />
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="settings-section-content">
            <div className="settings-coming-soon">
              <Settings size={48} className="text-muted" style={{ opacity: 0.3 }} />
              <h3 style={{ color: 'var(--text-primary)' }}>Coming Soon</h3>
              <p style={{ color: 'var(--text-muted)' }}>This settings section is being developed.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-layout">
        {/* Settings Sidebar Nav */}
        <div className="card settings-nav">
          <h3 className="settings-nav-title">Settings</h3>
          {settingsSections.map(sec => {
            const Icon = sec.icon;
            return (
              <button
                key={sec.id}
                className={`settings-nav-item ${activeSection === sec.id ? 'active' : ''}`}
                onClick={() => setActiveSection(sec.id)}
              >
                <Icon size={16} />
                <span>{sec.label}</span>
                <ChevronRight size={14} className="settings-nav-arrow" />
              </button>
            );
          })}
        </div>

        {/* Settings Content */}
        <div className="card settings-content-panel">
          {renderSection()}

          <div className="settings-footer-actions">
            <Button variant="ghost" icon={RefreshCw} onClick={() => addToast('info', 'Settings reset to defaults.')}>
              Reset Defaults
            </Button>
            <Button variant="primary" icon={saved ? Check : Save} onClick={handleSave}>
              {saved ? 'Saved!' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
