import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Building2, Globe, Shield, User, Lock, Palette, Upload, ArrowLeft, Loader2 } from 'lucide-react';
import Button from '../../components/common/Button';
import './SuperAdmin.css';

const CompanyCreate = () => {
  const { token, addToast } = useApp();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    plan: 'Basic',
    adminEmail: '',
    adminPassword: '',
    primaryColor: '#8b5cf6', // default purple
    logoUrl: '',
    dbUri: ''
  });

  const [logoPreview, setLogoPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle subdomain auto-slugification
  const handleNameChange = (e) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);
    setFormData(prev => ({
      ...prev,
      name,
      subdomain: prev.subdomain ? prev.subdomain : slug
    }));
  };

  // Convert uploaded logo to Base64
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      addToast('danger', 'Logo image size cannot exceed 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
      setFormData(prev => ({ ...prev, logoUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subdomain.trim() || !formData.adminEmail.trim() || !formData.adminPassword.trim()) {
      addToast('danger', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      // Map frontend fields to match backend expectations
      // Backend expects: name, subdomain, plan, adminEmail, adminPassword, settings: { logoUrl, primaryColor }
      const payload = {
        name: formData.name,
        subdomain: formData.subdomain.trim().toLowerCase(),
        plan: formData.plan,
        adminEmail: formData.adminEmail.trim().toLowerCase(),
        adminPassword: formData.adminPassword,
        settings: {
          logoUrl: formData.logoUrl,
          dbUri: formData.dbUri.trim(),
          primaryColor: formData.primaryColor,
          secondaryColor: '#1d4ed8', // fallback secondary
          timezone: 'Asia/Kolkata'
        }
      };

      const res = await fetch('http://localhost:5000/api/admin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok || result.status !== 'success') {
        throw new Error(result.message || 'Failed to create new tenant environment.');
      }

      addToast('success', `Company ${formData.name} registered successfully. Admin account provisioned.`);
      navigate('/superadmin/companies');
    } catch (err) {
      console.error(err);
      addToast('danger', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="superadmin-container">
      {/* Header */}
      <div className="superadmin-header flex-header-start">
        <button className="back-link-btn" onClick={() => navigate('/superadmin/companies')}>
          <ArrowLeft size={16} />
          <span>Back to Companies</span>
        </button>
        <h2 className="syne-heading mt-2">Provision New Tenant</h2>
        <p className="page-desc">
          Spin up a fully isolated logical environment with dedicated company administration credentials.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="company-create-grid">
        {/* Left Column: Details & Credentials */}
        <div className="create-column-main">
          {/* Card 1: Core Company Profile */}
          <div className="create-section-card">
            <div className="card-sec-header">
              <Building2 size={18} className="text-primary" />
              <h4>Company Information</h4>
            </div>
            <div className="card-sec-body">
              <div className="form-row">
                <div className="form-group-sa">
                  <label htmlFor="name">Company Name *</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="e.g. Acme Corporation"
                    value={formData.name}
                    onChange={handleNameChange}
                    required
                  />
                </div>

                <div className="form-group-sa">
                  <label htmlFor="subdomain">Target Subdomain *</label>
                  <div className="input-group-subdomain">
                    <span className="input-prefix"><Globe size={14} /></span>
                    <input
                      id="subdomain"
                      name="subdomain"
                      type="text"
                      placeholder="acme"
                      value={formData.subdomain}
                      onChange={handleInputChange}
                      required
                    />
                    <span className="input-suffix">.saas.com</span>
                  </div>
                  <span className="input-hint">No spaces or special characters. Unique lookup key.</span>
                </div>
              </div>

              <div className="form-group-sa mt-3">
                <label htmlFor="plan">Subscription Plan</label>
                <select
                  id="plan"
                  name="plan"
                  value={formData.plan}
                  onChange={handleInputChange}
                >
                  <option value="Basic">Basic Plan (Up to 25 Users)</option>
                  <option value="Premium">Premium Plan (Up to 100 Users)</option>
                  <option value="Enterprise">Enterprise Plan (Unlimited)</option>
                </select>
              </div>

              <div className="form-group-sa mt-3">
                <label htmlFor="dbUri">Dedicated Database Connection String (Optional)</label>
                <input
                  id="dbUri"
                  name="dbUri"
                  type="text"
                  placeholder="mongodb+srv://username:password@cluster.mongodb.net/dbname"
                  value={formData.dbUri}
                  onChange={handleInputChange}
                />
                <span className="input-hint">Leave blank to share the main default database.</span>
              </div>
            </div>
          </div>

          {/* Card 2: Admin Provision credentials */}
          <div className="create-section-card mt-4">
            <div className="card-sec-header">
              <Shield size={18} className="text-primary" />
              <h4>Primary Administrator Account</h4>
            </div>
            <div className="card-sec-body">
              <p className="text-xs text-muted mb-3">
                Provision a default CompanyAdmin user account to configure initial policies.
              </p>
              
              <div className="form-row">
                <div className="form-group-sa">
                  <label htmlFor="adminEmail">Administrator Email *</label>
                  <div className="input-with-icon">
                    <User size={14} className="input-icon-left" />
                    <input
                      id="adminEmail"
                      name="adminEmail"
                      type="email"
                      placeholder="admin@acme.com"
                      value={formData.adminEmail}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-sa">
                  <label htmlFor="adminPassword">Initial Temporary Password *</label>
                  <div className="input-with-icon">
                    <Lock size={14} className="input-icon-left" />
                    <input
                      id="adminPassword"
                      name="adminPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.adminPassword}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <span className="input-hint">Admin will change this password upon first login.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Branding & Controls */}
        <div className="create-column-side">
          {/* Card 3: Tenant Branding */}
          <div className="create-section-card">
            <div className="card-sec-header">
              <Palette size={18} className="text-primary" />
              <h4>Branding Configuration</h4>
            </div>
            <div className="card-sec-body">
              {/* Color Picker */}
              <div className="form-group-sa">
                <label>Primary Theme Color</label>
                <div className="color-picker-row">
                  <input
                    type="color"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={handleInputChange}
                    className="color-swatch-input"
                  />
                  <input
                    type="text"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={handleInputChange}
                    placeholder="#8b5cf6"
                    className="color-text-input"
                  />
                </div>
                <span className="input-hint">Controls primary navigation highlights in employee portal.</span>
              </div>

              {/* Logo Upload */}
              <div className="form-group-sa mt-4">
                <label>Organization Logo</label>
                <div className="logo-upload-zone">
                  {logoPreview ? (
                    <div className="logo-preview-box">
                      <img src={logoPreview} alt="Logo preview" className="logo-preview-img" />
                      <button
                        type="button"
                        className="btn-remove-logo"
                        onClick={() => { setLogoPreview(null); setFormData(prev => ({ ...prev, logoUrl: '' })); }}
                      >
                        Remove Logo
                      </button>
                    </div>
                  ) : (
                    <label className="upload-placeholder">
                      <Upload size={24} className="text-muted mb-2" />
                      <span className="upload-title">Choose image file</span>
                      <span className="upload-desc">PNG, JPG up to 2MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="file-hidden-input"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="create-actions-box mt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate('/superadmin/companies')}
              disabled={loading}
              className="w-full justify-center"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              loading={loading}
              disabled={loading}
              className="w-full justify-center mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Provisioning...
                </>
              ) : (
                'Create Environment'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CompanyCreate;
