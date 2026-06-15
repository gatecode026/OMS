import Company from './company.model.js';
import Employee from '../employees/employees.model.js';
import SystemSettings from '../settings/settings.model.js';
import logger from '../../config/logger.js';

export const createCompany = async (data) => {
  logger.info(`CompanyService::createCompany creating company: ${data.name}`);

  // Check if subdomain already exists
  const existingSubdomain = await Company.findOne({ subdomain: data.subdomain.toLowerCase().trim() });
  if (existingSubdomain) {
    const err = new Error('Subdomain already registered');
    err.statusCode = 400;
    throw err;
  }

  // Generate Company Business ID
  const companyCount = await Company.countDocuments({});
  const companyId = `COMP-${String(companyCount + 1).padStart(3, '0')}`;

  // Set Trial expiration (14 days from now)
  const trialDays = 14;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  const newCompanyData = {
    id: companyId,
    name: data.name,
    subdomain: data.subdomain.toLowerCase().trim(),
    status: data.status || 'Active',
    plan: data.plan || 'Basic',
    trialEndsAt,
    subscriptionExpiresAt: data.subscriptionExpiresAt || null,
    settings: {
      logoUrl: data.settings?.logoUrl || '',
      primaryColor: data.settings?.primaryColor || '#3b82f6',
      secondaryColor: data.settings?.secondaryColor || '#1d4ed8',
      timezone: data.settings?.timezone || 'Asia/Kolkata',
      companyEmail: data.settings?.companyEmail || data.companyEmail || '',
      companyPhone: data.settings?.companyPhone || data.companyPhone || '',
      address: data.settings?.address || data.address || ''
    }
  };

  // 1. Create Company
  const company = await Company.create(newCompanyData);
  logger.info(`CompanyService::createCompany company document created for ${company.name}`);

  // Create default system_settings document for this new company
  await SystemSettings.create({
    key: 'global',
    companyId: company.id,
    companyProfile: {
      companyName: company.name,
      officialEmail: data.adminEmail || `admin@${company.subdomain}.com`,
      officialPhone: company.settings.companyPhone || '',
      address: company.settings.address || '',
      logoUrl: company.settings.logoUrl || ''
    },
    generalSettings: {
      companyName: company.name,
      timezone: company.settings.timezone || 'Asia/Kolkata',
      language: 'English (IN)',
      dateFormat: 'DD-MM-YYYY',
      currency: 'INR (₹)',
      fiscalYear: 'January'
    }
  });

  // 2. Auto-Provision default CompanyAdmin user
  const adminEmail = (data.adminEmail || `admin@${company.subdomain}.com`).toLowerCase().trim();
  const plainPassword = data.adminPassword || 'Admin@123';
  const adminName = data.adminName || `${company.name} Admin`;

  // Check if employee email exists globally
  const existingEmp = await Employee.findOne({ email: adminEmail });
  if (existingEmp) {
    logger.warn(`CompanyService::createCompany default admin email "${adminEmail}" already exists. Skipping user creation.`);
    return company;
  }

  // Generate unique Employee ID
  const empCount = await Employee.countDocuments({});
  const employeeId = `EMP-2026-${String(empCount + 1).padStart(3, '0')}`;

  const defaultAdmin = {
    id: employeeId,
    name: adminName,
    email: adminEmail,
    username: `${company.subdomain}_admin`,
    password: plainPassword, // Mongoose pre-save hook will hash this
    phone: data.adminPhone || company.settings.companyPhone || '+91 00000 00000',
    role: 'CompanyAdmin',
    roleId: 'company_admin',
    companyId: company.id,
    designation: 'Company Administrator',
    department: 'Administration',
    branch: 'Head Office',
    status: 'Active',
    accountStatus: 'Active',
    joinDate: new Date().toISOString().split('T')[0]
  };

  // We temporarily run this unscoped so that the employee is successfully created with the correct companyId
  // even if the active request context is not set to this new company yet.
  const employee = await Employee.create(defaultAdmin);
  logger.info(`CompanyService::createCompany default admin user auto-created: ${employee.name} (${employee.email})`);

  return company;
};

export const findAll = async (query = {}) => {
  logger.info('CompanyService::findAll querying companies');
  return Company.find(query).lean();
};

export const findById = async (id) => {
  logger.info(`CompanyService::findById querying company ID: ${id}`);
  const company = await Company.findOne({ id });
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }
  return company;
};

export const updateCompany = async (id, data) => {
  logger.info(`CompanyService::updateCompany updating company ID: ${id}`);
  
  // Clean fields to prevent overwriting system generated properties directly
  const cleanData = { ...data };
  delete cleanData.id;
  delete cleanData.subdomain;

  // Flatten nested settings fields to avoid overwriting the entire object
  const updatePayload = {};
  if (cleanData.settings) {
    Object.keys(cleanData.settings).forEach(key => {
      updatePayload[`settings.${key}`] = cleanData.settings[key];
    });
    delete cleanData.settings;
  }

  // Set top-level fields
  Object.keys(cleanData).forEach(key => {
    updatePayload[key] = cleanData[key];
  });

  const company = await Company.findOneAndUpdate(
    { id },
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }
  return company;
};

export const setStatus = async (id, status) => {
  logger.info(`CompanyService::setStatus setting status of company ${id} to ${status}`);
  if (!['Active', 'Suspended', 'Pending'].includes(status)) {
    const err = new Error('Invalid status value');
    err.statusCode = 400;
    throw err;
  }

  const company = await Company.findOneAndUpdate(
    { id },
    { $set: { status } },
    { new: true }
  );

  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }

  // If company is suspended, suspend all company employees too
  if (status === 'Suspended') {
    await Employee.updateMany(
      { companyId: id },
      { $set: { accountStatus: 'Suspended', status: 'Inactive' } }
    );
    logger.info(`CompanyService::setStatus suspended all employees of company: ${id}`);
  } else if (status === 'Active') {
    await Employee.updateMany(
      { companyId: id },
      { $set: { accountStatus: 'Active', status: 'Active' } }
    );
    logger.info(`CompanyService::setStatus activated all employees of company: ${id}`);
  }

  return company;
};

export default {
  createCompany,
  findAll,
  findById,
  updateCompany,
  setStatus
};
