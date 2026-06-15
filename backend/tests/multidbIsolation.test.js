/**
 * @file tests/multidbIsolation.test.js
 * @description Integration test to verify multi-database tenant isolation.
 * Ensures a tenant with a custom dbUri writes/reads strictly from their isolated database.
 */

import assert from 'assert';
import mongoose from 'mongoose';
import database from '../src/config/database.js';
import Company from '../src/modules/companies/company.model.js';
import Branch from '../src/modules/branches/branches.model.js';
import { runWithTenant } from '../src/utils/tenantContext.js';
import { getTenantConnection } from '../src/utils/multidbConnection.js';
import env from '../src/config/env.js';

const testMultidbIsolation = async () => {
  console.log('--- Starting Multi-Database Tenant Isolation Tests ---');
  
  // 1. Establish connection to main platform database
  await database.connect();

  const mainDbUri = env.dbUri;
  // Replace the database name part ('office-management') with a shorter test database name
  const tenantDbUri = mainDbUri.includes('office-management')
    ? mainDbUri.replace('/office-management', '/office-mgmt-test')
    : mainDbUri + '-test';

  const tenantId = 'COMP-TEST-DB-ISOLATION';

  try {
    // 2. Clear pre-existing test setup in main database
    await Company.deleteOne({ id: tenantId });
    await Branch.deleteMany({});
    console.log('🧹 Cleaned existing test resources.');

    // 3. Register a test company with the dynamic private database URI
    await Company.create({
      id: tenantId,
      name: 'Dynamic Isolated Corp',
      subdomain: 'isolated-test-subdomain',
      plan: 'Enterprise',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      settings: {
        dbUri: tenantDbUri,
        primaryColor: '#8b5cf6',
        secondaryColor: '#1d4ed8'
      }
    });
    console.log('🏢 Created test company with custom database URI.');

    // 4. Run inside the isolated tenant's context to create a Branch document
    await runWithTenant(tenantId, async () => {
      // Clear any data on the tenant's connection first
      await Branch.deleteMany({});

      // Create branch
      const branch = await Branch.create({
        id: 'BR-ISOLATED-1',
        name: 'Isolated Branch',
        code: 'BR-ISO1',
        manager: 'Jane Doe',
        managerId: 'EMP-999',
        established: '2026-06-13',
        address: '789 Isolated St',
        city: 'Isolated City',
        state: 'Isolated State'
      });
      
      assert.strictEqual(branch.companyId, tenantId, 'Branch companyId should automatically match');
      console.log('✅ Branch created inside isolated tenant context.');
    });

    // 5. Verify Isolation: Connect directly to the tenant's database and check if the Branch exists
    const tenantConnection = mongoose.createConnection(tenantDbUri);
    // Wait for connection to open
    await new Promise((resolve) => tenantConnection.once('open', resolve));

    const TenantBranchModel = tenantConnection.model('Branch', Branch.schema);
    const tenantBranches = await TenantBranchModel.find({});
    
    assert.strictEqual(tenantBranches.length, 1, 'Isolated database should contain exactly 1 branch');
    assert.strictEqual(tenantBranches[0].id, 'BR-ISOLATED-1', 'Isolated database should have the branch');
    console.log('✅ Verified: Data was correctly written to the tenant\'s isolated database!');
    
    await tenantConnection.close();

    // 6. Verify Isolation: Connect to the main database and check if the Branch exists
    // The main database branches collection should be completely empty
    const mainBranches = await Branch.find({});
    assert.strictEqual(mainBranches.length, 0, 'Main platform database should NOT contain the tenant\'s branch');
    console.log('✅ Verified: Main platform database remained clean and isolated!');

    // 7. Cleanup test data
    await Company.deleteOne({ id: tenantId });
    // Connect to tenant DB one last time to drop test collection/database
    const cleanupConn = mongoose.createConnection(tenantDbUri);
    await new Promise((resolve) => cleanupConn.once('open', resolve));
    await cleanupConn.db.dropDatabase();
    await cleanupConn.close();
    console.log('🧹 Cleanup successfully finished.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await database.disconnect();
    console.log('--- Finished Multi-Database Isolation Tests ---');
  }
};

testMultidbIsolation();
