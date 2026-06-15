import Company from './company.model.js';
import Employee from '../employees/employees.model.js';
import SystemSettings from '../settings/settings.model.js';
import logger from '../../config/logger.js';

export const createCompany = async (data) => {
  logger.info(`CompanyService::createCompany creating company: ${data.name}`);

  // Check if subdomain already exists
  const existingSubdomain = await Company.findOne({ subdomain: data.subdomain.toLowerCase().trim() });
  if (existingSubdomain) {
    if (existingSubdomain.tenantStatus === 'provisioning' || existingSubdomain.tenantStatus === 'failed') {
      logger.warn(`Orphaned or failed company found for subdomain "${data.subdomain}". Cleaning up...`);
      await Company.deleteOne({ id: existingSubdomain.id });
      const { TenantRegistry } = await import('../../utils/tenantRegistry.js');
      await TenantRegistry.deleteMany({ companyId: existingSubdomain.id });
    } else {
      const err = new Error('Subdomain already registered');
      err.statusCode = 400;
      throw err;
    }
  }

  // Generate Company Business ID robustly
  const lastCompany = await Company.findOne({ id: /^COMP-\d+$/ }).sort({ createdAt: -1, id: -1 });
  let nextNum = 1;
  if (lastCompany) {
    const match = lastCompany.id.match(/\d+/);
    if (match) {
      nextNum = parseInt(match[0], 10) + 1;
    }
  }

  let companyId = `COMP-${String(nextNum).padStart(3, '0')}`;
  let exists = await Company.findOne({ id: companyId });
  while (exists) {
    nextNum++;
    companyId = `COMP-${String(nextNum).padStart(3, '0')}`;
    exists = await Company.findOne({ id: companyId });
  }

  // Set Trial expiration (14 days from now)
  const trialDays = 14;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  // 1. Create Company document with 'provisioning' lock if dedicated
  const providedUri = data.settings?.dbUri || data.dbUri || data.mongoUri || '';
  const isDedicated = !!providedUri;

  const newCompanyData = {
    id: companyId,
    name: data.name,
    subdomain: data.subdomain.toLowerCase().trim(),
    companyCode: data.companyCode ? data.companyCode.toUpperCase().trim() : data.subdomain.toUpperCase().trim(),
    status: data.status || 'Active',
    plan: data.plan || 'Basic',
    trialEndsAt,
    subscriptionExpiresAt: data.subscriptionExpiresAt || null,
    email: data.adminEmail ? data.adminEmail.toLowerCase().trim() : '',
    password: data.adminPassword || '',
    databaseType: isDedicated ? 'dedicated' : 'shared',
    tenantStatus: isDedicated ? 'provisioning' : 'active',
    databaseClusterKey: data.databaseClusterKey || 'cluster_1',
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

  let originalEnvValue;
  const company = await Company.create(newCompanyData);
  logger.info(`CompanyService::createCompany company document created for ${company.name}`);

  try {
    const { registerTenantUser } = await import('../../utils/tenantRegistry.js');

    if (isDedicated) {
      const clusterKey = company.databaseClusterKey || 'cluster_1';
      const envKey = `${clusterKey.toUpperCase()}_URI`;
      originalEnvValue = process.env[envKey];

      // Validate URI starts with mongodb:// or mongodb+srv://
      if (!providedUri.startsWith('mongodb://') && !providedUri.startsWith('mongodb+srv://')) {
        const err = new Error('Invalid MongoDB connection string. Must start with mongodb:// or mongodb+srv://');
        err.statusCode = 400;
        throw err;
      }

      // Save/update the cluster URI in .env and process.env
      const fs = await import('fs');
      const path = await import('path');
      try {
        const envPath = path.resolve(process.cwd(), '.env');
        // Extract base URI (remove database name path if present)
        let baseUri = providedUri;
        const questionMarkIndex = providedUri.indexOf('?');
        const baseWithoutQuery = questionMarkIndex !== -1 ? providedUri.substring(0, questionMarkIndex) : providedUri;
        const protocolEndIndex = baseWithoutQuery.indexOf('://');
        if (protocolEndIndex !== -1) {
          const hostPartIndex = protocolEndIndex + 3;
          const lastSlashIndex = baseWithoutQuery.lastIndexOf('/');
          if (lastSlashIndex > hostPartIndex) {
            baseUri = baseWithoutQuery.substring(0, lastSlashIndex);
            if (questionMarkIndex !== -1) {
              baseUri += providedUri.substring(questionMarkIndex);
            }
          }
        }
        
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        const regex = new RegExp(`^${envKey}=.*`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${envKey}=${baseUri}`);
        } else {
          envContent += `\n${envKey}=${baseUri}`;
        }
        fs.writeFileSync(envPath, envContent, 'utf8');
        process.env[envKey] = baseUri;
        logger.info(`Saved/updated cluster URI to .env: ${envKey}`);
      } catch (envErr) {
        logger.error('Failed to write cluster URI to .env:', envErr);
      }

      // Provision dedicated DB
      const { provisionTenantDatabase, generateDbName } = await import('../../database/connectionManager.js');
      const dbName = generateDbName(company.name);

      const dbConfig = await provisionTenantDatabase(company, clusterKey, dbName, {
        adminName: data.adminName || 'Company Admin',
        adminEmail: company.email,
        adminPhone: company.settings.companyPhone,
        adminPassword: data.adminPassword,
        address: company.settings.address,
        logoUrl: company.settings.logoUrl,
        timezone: company.settings.timezone
      });

      // Update company document with final connection metadata
      company.databaseName = dbConfig.databaseName;
      company.settings.dbUri = 'dedicated';
      company.tenantStatus = 'active';
      await company.save();

      // Register company admin email in global lookup registry
      await registerTenantUser(company.email, company.id, 'company_admin');
      logger.info(`Dedicated database provisioning successfully completed for company: ${company.name}`);
    } else {
      // Register company admin email in global registry
      await registerTenantUser(company.email, company.id, 'company_admin');

      // Shared database flow: Create default settings in the shared database
      await SystemSettings.deleteMany({ companyId: company.id }).setOptions({ bypassTenantScoping: true });
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
      logger.info(`Shared database provisioning completed for company: ${company.name}`);
    }
  } catch (err) {
    // Rollback Company document creation if provisioning fails
    logger.error(`Rollback: Deleting company document ${company.id} due to provisioning failure:`, err);
    await Company.deleteOne({ id: company.id });

    if (isDedicated) {
      const clusterKey = company.databaseClusterKey || 'cluster_1';
      const envKey = `${clusterKey.toUpperCase()}_URI`;
      try {
        const fs = await import('fs');
        const path = await import('path');
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8');
          const regex = new RegExp(`^${envKey}=.*`, 'm');
          if (originalEnvValue !== undefined) {
            envContent = envContent.replace(regex, `${envKey}=${originalEnvValue}`);
            process.env[envKey] = originalEnvValue;
          } else {
            envContent = envContent.replace(new RegExp(`\\r?\\n?${envKey}=.*`, 'g'), '');
            delete process.env[envKey];
          }
          fs.writeFileSync(envPath, envContent, 'utf8');
          logger.info(`Rollback: Restored/removed ${envKey} in .env file`);
        }
      } catch (restoreErr) {
        logger.error(`Failed to restore env on rollback: ${restoreErr.message}\nStack: ${restoreErr.stack}`);
      }
    }

    throw err;
  }

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
