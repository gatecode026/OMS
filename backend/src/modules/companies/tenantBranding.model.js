import mongoose from 'mongoose';

const tenantBrandingSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyName: {
    type: String,
    required: true
  },
  logoUrl: { type: String, default: '' },
  appLogoUrl: { type: String, default: '' },
  loginLogoUrl: { type: String, default: '' },
  loginBannerUrl: { type: String, default: '' },
  splashLogoUrl: { type: String, default: '' },
  splashBackgroundUrl: { type: String, default: '' },
  dashboardBannerUrl: { type: String, default: '' },
  emptyStateUrl: { type: String, default: '' },
  placeholderUrl: { type: String, default: '' },
  defaultAvatarUrl: { type: String, default: '' },
  watermarkUrl: { type: String, default: '' },
  pdfHeaderLogoUrl: { type: String, default: '' },
  pdfFooterLogoUrl: { type: String, default: '' },
  emailLogoUrl: { type: String, default: '' },
  notificationIconUrl: { type: String, default: '' },
  attendanceIllustrationUrl: { type: String, default: '' },
  leaveIllustrationUrl: { type: String, default: '' },
  chatPlaceholderUrl: { type: String, default: '' },
  errorIllustrationUrl: { type: String, default: '' },
  maintenanceBannerUrl: { type: String, default: '' },
  faviconUrl: { type: String, default: '' },
  primaryColor: { type: String, default: '#0057FF' },
  secondaryColor: { type: String, default: '#0F172A' }
}, {
  timestamps: true,
  collection: 'tenant_branding'
});

const TenantBranding = mongoose.model('TenantBranding', tenantBrandingSchema);
export default TenantBranding;
