import React, { useState } from 'react';
import './Profile.css';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';
import Badge from '../components/common/Badge';
import {
  User, Edit2, Save, Camera, Mail, Phone, MapPin, Calendar,
  Briefcase, Shield, Key, Clock, CheckCircle, Globe, Lock
} from 'lucide-react';

const Profile = () => {
  const { currentUser, updateEmployee, addToast } = useApp();
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [form, setForm] = useState({
    name: currentUser?.name || 'Aarav Sharma',
    email: currentUser?.email || 'aarav.sharma@saas.com',
    phone: currentUser?.phone || '+91 98765 43210',
    department: currentUser?.department || 'Operations',
    branch: currentUser?.branch || 'Jaipur',
    role: currentUser?.role || 'Super Admin',
    dob: currentUser?.dob || '1985-11-10',
    joinDate: currentUser?.joinDate || '2022-03-15',
    bio: 'Senior administrator overseeing enterprise operations, workforce management, and cross-branch strategic alignment. Certified PMP with 12+ years of leadership experience.',
    linkedin: 'linkedin.com/in/aaravsharma',
    location: 'Jaipur, India'
  });

  const [passwords, setPasswords] = useState({
    current: '',
    newPass: '',
    confirm: ''
  });

  const handleSave = () => {
    if (currentUser?.id) {
      updateEmployee(currentUser.id, { name: form.name, email: form.email, phone: form.phone });
    }
    setEditing(false);
    addToast('success', 'Profile updated successfully!');
  };

  const handlePasswordChange = () => {
    if (!passwords.current) return addToast('error', 'Current password is required.');
    if (passwords.newPass.length < 8) return addToast('error', 'New password must be at least 8 characters.');
    if (passwords.newPass !== passwords.confirm) return addToast('error', 'Passwords do not match.');
    setPasswords({ current: '', newPass: '', confirm: '' });
    addToast('success', 'Password changed successfully!');
  };

  const activityHistory = [
    { action: 'Approved leave request for Neha Verma', time: '5 min ago', icon: CheckCircle, color: '#10b981' },
    { action: 'Ran payroll for Engineering department', time: '2 hours ago', icon: Briefcase, color: '#3b82f6' },
    { action: 'Updated permissions for Branch Admin role', time: '1 day ago', icon: Shield, color: '#8b5cf6' },
    { action: 'Added new employee: Deepak Joshi', time: '3 days ago', icon: User, color: '#10b981' },
    { action: 'Modified system timezone settings', time: '1 week ago', icon: Globe, color: '#f59e0b' }
  ];

  return (
    <div className="profile-page">

      {/* Profile Hero Card */}
      <div className="card profile-hero-card">
        <div
          className="profile-hero-bg"
          style={{ background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)' }}
        />

        <div className="profile-hero-content">
          <div className="profile-avatar-section">
            <div className="profile-avatar-wrap">
              <Avatar name={form.name} size="2xl" />
              {editing && (
                <button className="profile-avatar-edit-btn" title="Change Photo">
                  <Camera size={14} />
                </button>
              )}
            </div>

            <div className="profile-hero-info">
              <h2 className="profile-hero-name">{form.name}</h2>
              <p className="profile-hero-role">{form.role}</p>
              <div className="profile-hero-meta">
                <span><MapPin size={13} /> {form.location}</span>
                <span><Briefcase size={13} /> {form.department}</span>
                <span><Calendar size={13} /> Joined {form.joinDate}</span>
              </div>
            </div>
          </div>

          <div className="profile-hero-actions">
            {editing ? (
              <>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button variant="primary" icon={Save} onClick={handleSave}>Save Changes</Button>
              </>
            ) : (
              <Button variant="secondary" icon={Edit2} onClick={() => setEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs-bar">
        {[
          { id: 'profile', label: 'Profile Info' },
          { id: 'security', label: 'Security' },
          { id: 'activity', label: 'Activity' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`profile-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (
        <div className="profile-content-grid">
          {/* Left: Edit Form */}
          <div className="card profile-form-card">
            <h3 className="card-title">Personal Information</h3>
            <span className="chart-subtitle">Update your profile details</span>

            <div className="profile-fields">
              <div className="profile-field-group">
                <label className="profile-field-label"><User size={12} /> Full Name</label>
                <input
                  className={`profile-field-input ${editing ? 'editable' : ''}`}
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  disabled={!editing}
                />
              </div>
              <div className="profile-field-group">
                <label className="profile-field-label"><Mail size={12} /> Email Address</label>
                <input
                  type="email"
                  className={`profile-field-input ${editing ? 'editable' : ''}`}
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  disabled={!editing}
                />
              </div>
              <div className="profile-field-group">
                <label className="profile-field-label"><Phone size={12} /> Phone Number</label>
                <input
                  className={`profile-field-input ${editing ? 'editable' : ''}`}
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  disabled={!editing}
                />
              </div>
              <div className="profile-field-group">
                <label className="profile-field-label"><Globe size={12} /> LinkedIn</label>
                <input
                  className={`profile-field-input ${editing ? 'editable' : ''}`}
                  value={form.linkedin}
                  onChange={e => setForm(p => ({ ...p, linkedin: e.target.value }))}
                  disabled={!editing}
                />
              </div>
              <div className="profile-field-group full-width">
                <label className="profile-field-label">Bio</label>
                <textarea
                  className={`profile-field-input profile-textarea ${editing ? 'editable' : ''}`}
                  value={form.bio}
                  onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  disabled={!editing}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Right: Role & Work Info */}
          <div className="profile-sidebar-col">
            <div className="card profile-info-card">
              <h3 className="card-title">Work Information</h3>
              <div className="profile-info-list">
                {[
                  { label: 'Role', value: form.role, icon: Shield },
                  { label: 'Department', value: form.department, icon: Briefcase },
                  { label: 'Branch', value: form.branch, icon: MapPin },
                  { label: 'Join Date', value: form.joinDate, icon: Calendar },
                  { label: 'Date of Birth', value: form.dob, icon: Calendar }
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="profile-info-item">
                      <Icon size={14} className="profile-info-icon" />
                      <div>
                        <span className="profile-info-label">{item.label}</span>
                        <span className="profile-info-val">{item.value}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card profile-stats-card">
              <h3 className="card-title">Quick Stats</h3>
              <div className="profile-stats-grid">
                {[
                  { label: 'Tasks Completed', value: 24, color: '#10b981' },
                  { label: 'Attendance Rate', value: '98%', color: '#3b82f6' },
                  { label: 'Leave Balance', value: '12 days', color: '#f59e0b' },
                  { label: 'Performance', value: '98/100', color: '#8b5cf6' }
                ].map((s, i) => (
                  <div key={i} className="profile-stat-tile">
                    <span className="profile-stat-num" style={{ color: s.color }}>{s.value}</span>
                    <span className="profile-stat-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card profile-security-card">
          <h3 className="card-title">Change Password</h3>
          <p className="chart-subtitle">Use a strong, unique password for your account</p>

          <div className="security-form">
            <div className="profile-field-group">
              <label className="profile-field-label"><Lock size={12} /> Current Password</label>
              <input
                type="password"
                className="profile-field-input editable"
                value={passwords.current}
                onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div className="profile-field-group">
              <label className="profile-field-label"><Key size={12} /> New Password</label>
              <input
                type="password"
                className="profile-field-input editable"
                value={passwords.newPass}
                onChange={e => setPasswords(p => ({ ...p, newPass: e.target.value }))}
                placeholder="Minimum 8 characters"
              />
            </div>
            <div className="profile-field-group">
              <label className="profile-field-label"><Key size={12} /> Confirm New Password</label>
              <input
                type="password"
                className="profile-field-input editable"
                value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                placeholder="Re-enter new password"
              />
            </div>
            <Button variant="primary" icon={Lock} onClick={handlePasswordChange}>
              Update Password
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="card profile-activity-card">
          <h3 className="card-title">Recent Activity</h3>
          <p className="chart-subtitle">Your last 5 actions on the platform</p>

          <div className="activity-timeline">
            {activityHistory.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="timeline-item">
                  <div className="timeline-icon" style={{ background: `${item.color}20`, color: item.color }}>
                    <Icon size={14} />
                  </div>
                  <div className="timeline-content">
                    <p className="timeline-action">{item.action}</p>
                    <span className="timeline-time"><Clock size={11} /> {item.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;
