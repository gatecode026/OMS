/**
 * @file src/scripts/test-tenant-provisioning.js
 * @description Integration test for multi-tenant database provisioning, connection management, seeder registry, and rollback handling.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import env from '../config/env.js';
import dns from 'dns';

dns.setServers(['1.1.1.1']);

// Import Models & Services
import Company from '../modules/companies/company.model.js';
import companyService from '../modules/companies/company.service.js';
import connectionManager from '../database/connectionManager.js';
import { TenantRegistry } from '../utils/tenantRegistry.js';

dotenv.config();

const runTest = async () => {
  // Use current DB_URI as template for CLUSTER_1_URI in offline/sandbox execution
  process.env.CLUSTER_1_URI = env.dbUri;

  const testSharedSubdomain = 'testshared';
  const testDedicatedSubdomain = 'testdedicated';
  const testFailSubdomain = 'testfail';

  let testDedicatedCompany = null;

  try {
    console.log('Connecting to master database...');
    await mongoose.connect(env.dbUri);
    console.log('Connected.');

    // Clean up any residual test data from previous runs
    console.log('Cleaning up previous test data...');
    const existingShared = await Company.findOne({ subdomain: testSharedSubdomain });
    if (existingShared) {
      await Company.deleteOne({ id: existingShared.id });
      await TenantRegistry.deleteOne({ companyId: existingShared.id });
    }
    const existingDedicated = await Company.findOne({ subdomain: testDedicatedSubdomain });
    if (existingDedicated) {
      // Connect to drop the db
      const dbName = connectionManager.generateDbName('Test Dedicated Company');
      const finalUri = connectionManager.injectDbNameIntoUri(env.dbUri, dbName);
      const conn = mongoose.createConnection(finalUri);
      await conn.asPromise();
      await conn.db.dropDatabase();
      await conn.close();

      await Company.deleteOne({ id: existingDedicated.id });
      await TenantRegistry.deleteOne({ companyId: existingDedicated.id });
    }

    // ==========================================
    // TEST CASE 1: Shared Database Registration
    // ==========================================
    console.log('\n--- [Test Case 1] Shared Database Tenant ---');
    const sharedCompany = await companyService.createCompany({
      name: 'Test Shared Company',
      subdomain: testSharedSubdomain,
      adminEmail: 'sharedadmin@test.com',
      adminPassword: 'password123'
    });

    console.log(`Company ID: ${sharedCompany.id}`);
    console.log(`Database Type: ${sharedCompany.databaseType}`);
    console.log(`Tenant Status: ${sharedCompany.tenantStatus}`);

    if (sharedCompany.databaseType !== 'shared') {
      throw new Error('FAIL: Shared company databaseType is not "shared"');
    }

    // Verify registry mapping in master DB
    const sharedRegistry = await TenantRegistry.findOne({ email: 'sharedadmin@test.com' });
    console.log(`Tenant Registry Mapping Resolved:`, sharedRegistry ? 'YES' : 'NO');
    if (!sharedRegistry || sharedRegistry.companyId !== sharedCompany.id) {
      throw new Error('FAIL: Shared company admin was not registered in the TenantRegistry');
    }
    console.log('[Test Case 1] PASS');


    // ==========================================
    // TEST CASE 2: Dedicated Database Registration
    // ==========================================
    console.log('\n--- [Test Case 2] Dedicated Database Tenant ---');
    
    // We pass CLUSTER_1_URI as the connection string to trigger dedicated database creation
    const dedicatedCompany = await companyService.createCompany({
      name: 'Test Dedicated Company',
      subdomain: testDedicatedSubdomain,
      adminEmail: 'dedicatedadmin@test.com',
      adminPassword: 'password123',
      mongoUri: env.dbUri, // Pass the master DB connection string as target cluster template
      databaseClusterKey: 'cluster_1'
    });
    testDedicatedCompany = dedicatedCompany;

    console.log(`Company ID: ${dedicatedCompany.id}`);
    console.log(`Database Type: ${dedicatedCompany.databaseType}`);
    console.log(`Database Name: ${dedicatedCompany.databaseName}`);
    console.log(`Tenant Status: ${dedicatedCompany.tenantStatus}`);

    if (dedicatedCompany.databaseType !== 'dedicated') {
      throw new Error('FAIL: Dedicated company databaseType is not "dedicated"');
    }
    if (dedicatedCompany.databaseName !== 'office_test_dedicated_company') {
      throw new Error(`FAIL: Dedicated databaseName was not generated correctly. Got: ${dedicatedCompany.databaseName}`);
    }

    // Verify registry mapping
    const dedicatedRegistry = await TenantRegistry.findOne({ email: 'dedicatedadmin@test.com' });
    console.log(`Tenant Registry Mapping Resolved:`, dedicatedRegistry ? 'YES' : 'NO');
    if (!dedicatedRegistry || dedicatedRegistry.companyId !== dedicatedCompany.id) {
      throw new Error('FAIL: Dedicated company admin not registered in TenantRegistry');
    }

    // Connect to the newly created dedicated database to verify collections & admin employee
    console.log('Connecting to provisioned dedicated database to inspect collections...');
    const finalUri = connectionManager.injectDbNameIntoUri(env.dbUri, dedicatedCompany.databaseName);
    const tenantConn = mongoose.createConnection(finalUri);
    await tenantConn.asPromise();

    const collections = await tenantConn.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`Created collections in dedicated DB:`, collectionNames);

    const essentialCollections = ['employees', 'rbac_roles', 'permission_modules', 'system_settings'];
    essentialCollections.forEach(col => {
      if (!collectionNames.includes(col)) {
        throw new Error(`FAIL: Essential collection "${col}" was not initialized in dedicated DB`);
      }
    });

    // Verify admin employee is created in dedicated DB
    const TenantEmployee = tenantConn.model('Employee', mongoose.model('Employee').schema);
    const adminEmp = await TenantEmployee.findOne({ roleId: 'company_admin' });
    console.log(`Admin Employee created in dedicated DB:`, adminEmp ? 'YES' : 'NO');
    if (!adminEmp || adminEmp.email !== 'dedicatedadmin@test.com') {
      throw new Error('FAIL: Default admin user was not initialized inside the dedicated DB Employees collection.');
    }
    console.log(`Admin Employee Code: ${adminEmp.employeeCode}`);

    await tenantConn.close();
    console.log('[Test Case 2] PASS');


    // ==========================================
    // TEST CASE 3: Provisioning Rollback Handling
    // ==========================================
    console.log('\n--- [Test Case 3] Provisioning Rollback on Failure ---');
    try {
      await companyService.createCompany({
        name: 'Test Rollback Company',
        subdomain: testFailSubdomain,
        adminEmail: 'failadmin@test.com',
        adminPassword: 'password123',
        mongoUri: 'mongodb://invalid-host-uri:27017', // Invalid host to force connection timeout/failure
        databaseClusterKey: 'cluster_1'
      });
      throw new Error('FAIL: Provisioning with invalid URI succeeded (expected to fail)');
    } catch (err) {
      console.log(`Provisioning failed as expected with message: "${err.message}"`);
      // Verify rollback: company document must be deleted from master DB
      const failedCompany = await Company.findOne({ subdomain: testFailSubdomain });
      console.log(`Company document cleaned up from master DB (Rollback):`, failedCompany ? 'NO' : 'YES');
      if (failedCompany) {
        throw new Error('FAIL: Company document was not rolled back (deleted) after provisioning failed');
      }
      console.log('[Test Case 3] PASS');
    }

    console.log('\n=============================================');
    console.log('ALL TENANT PROVISIONING INTEGRATION TESTS PASSED!');
    console.log('=============================================');

  } catch (error) {
    console.error('\nTEST ENCOUNTERED FAILURE:', error);
  } finally {
    // Cleanup created test databases and documents
    console.log('\nCleaning up created test resources...');
    if (testDedicatedCompany) {
      try {
        console.log(`Dropping test database: ${testDedicatedCompany.databaseName}...`);
        const finalUri = connectionManager.injectDbNameIntoUri(env.dbUri, testDedicatedCompany.databaseName);
        const conn = mongoose.createConnection(finalUri);
        await conn.asPromise();
        await conn.db.dropDatabase();
        await conn.close();
        console.log('Database dropped.');
      } catch (err) {
        console.error('Error dropping test database:', err);
      }
    }
    
    await Company.deleteMany({ subdomain: { $in: [testSharedSubdomain, testDedicatedSubdomain, testFailSubdomain] } });
    await TenantRegistry.deleteMany({ email: { $in: ['sharedadmin@test.com', 'dedicatedadmin@test.com', 'failadmin@test.com'] } });

    console.log('Disconnecting from master database...');
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
};

runTest();
