import mongoose from 'mongoose';
import dotenv from 'dotenv';
import env from '../config/env.js';
import Company from '../modules/companies/company.model.js';

dotenv.config();

const collectionsToMigrate = [
  { name: 'employees', modelName: 'Employee' },
  { name: 'departments', modelName: 'Department' },
  { name: 'branches', modelName: 'Branch' },
  { name: 'projects', modelName: 'Project' },
  { name: 'leaves', modelName: 'Leave' },
  { name: 'payroll_payments', modelName: 'PayrollPayment' },
  { name: 'teams', modelName: 'Team' },
  { name: 'tasks', modelName: 'Task' },
  { name: 'notifications', modelName: 'Notification' },
  { name: 'documents', modelName: 'Document' },
  { name: 'workflows', modelName: 'Workflow' },
  { name: 'holidays', modelName: 'Holiday' },
  { name: 'appraisal_reviews', modelName: 'AppraisalReview' },
  { name: 'payroll_grades', modelName: 'PayrollGrade' },
  { name: 'payroll_reimbursements', modelName: 'PayrollReimbursement' },
  { name: 'payroll_loan_advances', modelName: 'PayrollLoanAdvance' },
  { name: 'payroll_bonuses', modelName: 'PayrollBonus' }
];

/**
 * Seed default roles and permission modules for a shared company.
 * Idempotent – skips if already seeded.
 */
const seedSharedCompanyData = async (company) => {
  const db = mongoose.connection.db;

  // ── Permission Modules ─────────────────────────────────────────────────
  const modulesToSeed = [
    { key: 'employees',     label: 'Employees Management' },
    { key: 'attendance',    label: 'Attendance Tracking' },
    { key: 'leaves',        label: 'Leaves Management' },
    { key: 'payroll',       label: 'Payroll Management' },
    { key: 'departments',   label: 'Departments Management' },
    { key: 'branches',      label: 'Branches Management' },
    { key: 'projects',      label: 'Projects Management' },
    { key: 'tasks',         label: 'Tasks Management' },
    { key: 'teams',         label: 'Teams Management' },
    { key: 'settings',      label: 'System Settings' },
    { key: 'notifications', label: 'Notifications Management' },
    { key: 'documents',     label: 'Documents Management' }
  ];

  const pmCollection   = db.collection('permission_modules');
  const existingModules = await pmCollection.countDocuments({ companyId: company.id });

  if (existingModules === 0) {
    const now = new Date();
    await pmCollection.insertMany(
      modulesToSeed.map(m => ({ ...m, companyId: company.id, createdAt: now, updatedAt: now }))
    );
    console.log(`  ✅ Seeded ${modulesToSeed.length} permission modules for ${company.id} (${company.name})`);
  } else {
    console.log(`  ℹ️  Permission modules already exist for ${company.id}. Skipping.`);
  }

  // ── Roles ──────────────────────────────────────────────────────────────
  const rolesCollection = db.collection('rbac_roles');
  const existingRoles   = await rolesCollection.countDocuments({ companyId: company.id });

  if (existingRoles === 0) {
    const getPerms = (create, read, update, del, approve, exp) => ({
      create, read, update, delete: del, approve, export: exp
    });

    const now = new Date();
    const rolesToSeed = [
      {
        id: `${company.id}_company_admin`,
        name: 'Company Admin',
        description: 'Administrator with full scoped privileges',
        accentColor: '#ef4444',
        companyId: company.id,
        permissions: Object.fromEntries(
          modulesToSeed.map(m => [m.key, getPerms(true, true, true, true, true, true)])
        ),
        userCount: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `${company.id}_hr`,
        name: 'HR Manager',
        description: 'Human Resources manager scoped permissions',
        accentColor: '#3b82f6',
        companyId: company.id,
        permissions: Object.fromEntries(
          modulesToSeed.map(m => {
            const s = ['employees', 'attendance', 'leaves', 'payroll'].includes(m.key);
            return [m.key, getPerms(s, true, s, s, s, s)];
          })
        ),
        userCount: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `${company.id}_manager`,
        name: 'Team Manager',
        description: 'Team leader and project manager permissions',
        accentColor: '#10b981',
        companyId: company.id,
        permissions: Object.fromEntries(
          modulesToSeed.map(m => {
            const s = ['attendance', 'leaves', 'tasks', 'projects', 'teams'].includes(m.key);
            return [m.key, getPerms(s, true, s, false, s, s)];
          })
        ),
        userCount: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        id: `${company.id}_employee`,
        name: 'Employee',
        description: 'Standard employee scoped access',
        accentColor: '#64748b',
        companyId: company.id,
        permissions: Object.fromEntries(
          modulesToSeed.map(m => [m.key, getPerms(false, m.key !== 'settings', false, false, false, false)])
        ),
        userCount: 0,
        createdAt: now,
        updatedAt: now
      }
    ];

    await rolesCollection.insertMany(rolesToSeed);
    console.log(`  ✅ Seeded ${rolesToSeed.length} default roles for ${company.id} (${company.name})`);
  } else {
    console.log(`  ℹ️  Roles already exist for ${company.id}. Skipping.`);
  }
};

const runMigration = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(env.dbUri);
    console.log('Connected to database successfully.');

    // 1. Load all companies
    let companies = await Company.find({}).lean();
    console.log(`\nFound ${companies.length} company/companies.`);

    if (companies.length === 0) {
      console.log('No companies found. Creating a default company...');
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 14);
      const defaultCompany = await Company.create({
        id: 'COMP-001',
        name: 'Default Company',
        subdomain: 'default',
        status: 'Active',
        plan: 'Basic',
        trialEndsAt,
        email: 'admin@default.com',
        password: 'password123',
        databaseType: 'shared',
        tenantStatus: 'active',
        settings: { primaryColor: '#3b82f6', secondaryColor: '#1d4ed8' }
      });
      companies = [defaultCompany.toObject()];
      console.log(`Default company created: COMP-001`);
    }

    // 2. Sort by creation date to find the oldest (legacy default for orphaned records)
    const sorted = [...companies].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const defaultCompanyId = sorted[0].id;
    console.log(`Using default company for orphaned records: ${defaultCompanyId} (${sorted[0].name})`);

    // 3. Backfill companyId on all tenant collections
    console.log('\n--- Commencing Multi-Tenant Backfill Migration ---');
    for (const item of collectionsToMigrate) {
      const db = mongoose.connection.db;
      const collection = db.collection(item.name);

      const list = await db.listCollections({ name: item.name }).toArray();
      if (list.length === 0) {
        console.log(`Collection "${item.name}" does not exist, skipping.`);
        continue;
      }

      const missingCount = await collection.countDocuments({
        $or: [
          { companyId: { $exists: false } },
          { companyId: null },
          { companyId: '' }
        ]
      });

      if (missingCount > 0) {
        console.log(`Collection "${item.name}": ${missingCount} documents missing companyId. Backfilling...`);
        const result = await collection.updateMany(
          { $or: [{ companyId: { $exists: false } }, { companyId: null }, { companyId: '' }] },
          { $set: { companyId: defaultCompanyId } }
        );
        console.log(`Collection "${item.name}": Updated ${result.modifiedCount} documents.`);
      } else {
        console.log(`Collection "${item.name}": All documents already have companyId. ✅`);
      }
    }

    // 4. Seed default roles & permission modules for ALL shared companies
    console.log('\n--- Seeding Default Roles & Permission Modules for Shared Companies ---');
    const sharedCompanies = companies.filter(c => c.databaseType === 'shared' || !c.databaseType);
    console.log(`Found ${sharedCompanies.length} shared company/companies to process.\n`);

    for (const company of sharedCompanies) {
      console.log(`Processing: ${company.id} (${company.name})`);
      await seedSharedCompanyData(company);
    }

    // 5. Rebuild indexes on all models
    console.log('\n--- Building Tenant-Scoped Indexes ---');
    const { ensureAllModelsRegistered } = await import('../database/connectionManager.js');
    await ensureAllModelsRegistered();

    for (const item of collectionsToMigrate) {
      try {
        const model = mongoose.model(item.modelName);
        if (model) {
          console.log(`Building indexes for model ${item.modelName}...`);
          await model.ensureIndexes();
          console.log(`  Indexes built for ${item.modelName}. ✅`);
        }
      } catch (indexErr) {
        console.warn(`  ⚠️  Warning: Could not build indexes for ${item.modelName}: ${indexErr.message}`);
      }
    }

    console.log('\n=============================================');
    console.log('MULTI-TENANT BACKFILL MIGRATION COMPLETED SUCCESSFULLY!');
    console.log('=============================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed with error:', err);
    process.exit(1);
  }
};

runMigration();
