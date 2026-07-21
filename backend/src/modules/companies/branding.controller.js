import TenantBranding from './tenantBranding.model.js';
import Company from './company.model.js';
import { uploadToImageKit } from '../../utils/imagekit.js';
import { successResponse } from '../../utils/response.js';

export const getBranding = async (req, res, next) => {
  try {
    const tenantId = req.user.companyId;
    let branding = await TenantBranding.findOne({ tenantId }).lean();
    
    if (!branding) {
      // Fallback to Company settings
      const company = await Company.findOne({ id: tenantId }).lean();
      branding = {
        tenantId,
        companyName: company ? company.name : 'Gatecode OMS',
        logoUrl: company?.settings?.logoUrl || '',
        primaryColor: company?.settings?.primaryColor || '#0057FF',
        secondaryColor: company?.settings?.secondaryColor || '#0F172A',
      };
    }

    return successResponse(res, branding, 'Tenant branding retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const updateBranding = async (req, res, next) => {
  try {
    const tenantId = req.user.companyId;
    
    // Only company_admin or super_admin can update branding
    const isAdmin = req.user.role === 'company_admin' || req.user.role === 'super_admin';
    if (!isAdmin) {
      return res.status(403).json({
        status: 'fail',
        message: 'Access denied. Only administrators can update branding configuration.'
      });
    }

    const updateData = { ...req.body };
    delete updateData.tenantId; // Prevent changing tenantId

    // Find or create company
    const company = await Company.findOne({ id: tenantId });
    if (!company) {
      return res.status(404).json({
        status: 'fail',
        message: 'Tenant company not found'
      });
    }

    updateData.companyName = company.name;

    // Handle any base64 image uploads to ImageKit
    const imageFields = [
      'logoUrl', 'appLogoUrl', 'loginLogoUrl', 'loginBannerUrl', 
      'splashLogoUrl', 'splashBackgroundUrl', 'dashboardBannerUrl', 
      'emptyStateUrl', 'placeholderUrl', 'defaultAvatarUrl', 
      'watermarkUrl', 'pdfHeaderLogoUrl', 'pdfFooterLogoUrl', 
      'emailLogoUrl', 'notificationIconUrl', 'attendanceIllustrationUrl', 
      'leaveIllustrationUrl', 'chatPlaceholderUrl', 'errorIllustrationUrl', 
      'maintenanceBannerUrl', 'faviconUrl'
    ];

    for (const field of imageFields) {
      const val = updateData[field];
      if (val && typeof val === 'string' && val.startsWith('data:image/')) {
        // It's a base64 data string, upload to ImageKit
        const fileName = `${field}_${tenantId}_${Date.now()}`;
        const uploadedUrl = await uploadToImageKit(val, fileName);
        updateData[field] = uploadedUrl;
      }
    }

    const branding = await TenantBranding.findOneAndUpdate(
      { tenantId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    // Invalidate/Sync central Company model settings for backward compatibility
    company.settings = company.settings || {};
    if (updateData.logoUrl) company.settings.logoUrl = updateData.logoUrl;
    if (updateData.primaryColor) company.settings.primaryColor = updateData.primaryColor;
    if (updateData.secondaryColor) company.settings.secondaryColor = updateData.secondaryColor;
    await company.save();

    return successResponse(res, branding, 'Tenant branding updated successfully');
  } catch (err) {
    next(err);
  }
};
