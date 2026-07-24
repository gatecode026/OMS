import express from 'express';
import Company from './company.model.js';
import TenantBranding from './tenantBranding.model.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = express.Router();

// GET /api/public/branding?subdomain=xyz
router.get('/branding', asyncHandler(async (req, res) => {
  const subdomain = req.query.subdomain;
  const companyId = req.query.companyId;

  let company = null;

  if (companyId) {
    company = await Company.findOne({ id: companyId }).lean();
  } else if (subdomain) {
    company = await Company.findOne({ subdomain: subdomain.toLowerCase().trim() }).lean();
  }

  // Platform defaults fallback
  const defaultBranding = {
    companyName: 'Gatecode OMS',
    logoUrl: '',
    primaryColor: '#d946ef',
    secondaryColor: '#1d4ed8',
    faviconUrl: '',
    timezone: 'Asia/Kolkata'
  };

  if (!company) {
    return res.status(200).json({
      status: 'success',
      data: defaultBranding,
      message: 'Default branding returned'
    });
  }

  // Fetch the branding config from TenantBranding
  let tenantBranding = await TenantBranding.findOne({ tenantId: company.id }).lean();

  if (!tenantBranding) {
    // If not found, compile from company settings
    tenantBranding = {
      tenantId: company.id,
      companyName: company.name,
      logoUrl: company.settings?.logoUrl || '',
      primaryColor: company.settings?.primaryColor || '#3b82f6',
      secondaryColor: company.settings?.secondaryColor || '#1d4ed8',
      faviconUrl: company.settings?.faviconUrl || '',
      timezone: company.settings?.timezone || 'Asia/Kolkata'
    };
  }

  return res.status(200).json({
    status: 'success',
    data: tenantBranding,
    message: 'Company branding fetched successfully'
  });
}));

// GET /api/public/branding/:companyId
router.get('/branding/:companyId', asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  const company = await Company.findOne({ id: companyId }).lean();

  const defaultBranding = {
    companyName: 'Gatecode OMS',
    logoUrl: '',
    primaryColor: '#d946ef',
    secondaryColor: '#1d4ed8',
    faviconUrl: '',
    timezone: 'Asia/Kolkata'
  };

  if (!company) {
    return res.status(200).json({
      status: 'success',
      data: defaultBranding,
      message: 'Default branding returned'
    });
  }

  let tenantBranding = await TenantBranding.findOne({ tenantId: company.id }).lean();

  if (!tenantBranding) {
    tenantBranding = {
      tenantId: company.id,
      companyName: company.name,
      logoUrl: company.settings?.logoUrl || '',
      primaryColor: company.settings?.primaryColor || '#3b82f6',
      secondaryColor: company.settings?.secondaryColor || '#1d4ed8',
      faviconUrl: company.settings?.faviconUrl || '',
      timezone: company.settings?.timezone || 'Asia/Kolkata'
    };
  }

  return res.status(200).json({
    status: 'success',
    data: tenantBranding,
    message: 'Company branding fetched successfully'
  });
}));

export default router;
