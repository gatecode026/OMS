/**
 * @file tests/branchesScoping.test.js
 * @description Integration test to verify tenant-scoping isolation of the Branch model and protection against companyId spoofing.
 */

import assert from 'assert';
import database from '../src/config/database.js';
import Branch from '../src/modules/branches/branches.model.js';
import { runWithTenant } from '../src/utils/tenantContext.js';

const testBranchesScoping = async () => {
  console.log('--- Starting Branches Multi-Tenant Scoping Tests ---');
  
  // Establish connection to database
  await database.connect();
  
  try {
    // 1. Clean existing test branches
    // Since we execute this without runWithTenant context, tenantPlugin will not inject companyId filter,
    // allowing us to clear everything unscoped.
    await Branch.deleteMany({});
    console.log('🧹 Cleaned existing branches.');

    // 2. Run under Company A Context
    await runWithTenant('COMP-A', async () => {
      // Create Branch 1
      const b1 = await Branch.create({
        id: 'BR-TEST-A1',
        name: 'Company A Branch 1',
        code: 'BR-A1',
        manager: 'John Doe',
        managerId: 'EMP-001',
        established: '2026-01-01',
        address: '123 A Street',
        city: 'City A',
        state: 'State A'
      });
      assert.strictEqual(b1.companyId, 'COMP-A', 'Branch companyId should automatically be COMP-A');

      // Create Branch 2
      const b2 = await Branch.create({
        id: 'BR-TEST-A2',
        name: 'Company A Branch 2',
        code: 'BR-A2',
        manager: 'Jane Doe',
        managerId: 'EMP-002',
        established: '2026-01-01',
        address: '456 A Street',
        city: 'City A',
        state: 'State A'
      });
      assert.strictEqual(b2.companyId, 'COMP-A', 'Branch companyId should automatically be COMP-A');

      // Attempt to spoof companyId by passing COMP-B explicitly in the creation body
      const b3Spoof = await Branch.create({
        id: 'BR-TEST-A3-SPOOF',
        name: 'Company A Spoof Branch',
        code: 'BR-A3',
        manager: 'Jane Doe',
        managerId: 'EMP-002',
        established: '2026-01-01',
        address: '456 A Street',
        city: 'City A',
        state: 'State A',
        companyId: 'COMP-B' // Spoofed companyId
      });
      assert.strictEqual(b3Spoof.companyId, 'COMP-A', 'Pre-save hook must override spoofed companyId to COMP-A');

      // Find branches for Company A
      const companyABranches = await Branch.find({});
      assert.strictEqual(companyABranches.length, 3, 'Company A should see exactly 3 branches');
      assert(companyABranches.every(b => b.companyId === 'COMP-A'), 'All Company A branches must have companyId as COMP-A');
      
      // Attempt to update and spoof companyId on findOneAndUpdate
      const updatedBranch = await Branch.findOneAndUpdate(
        { id: 'BR-TEST-A1' },
        { companyId: 'COMP-B', name: 'Updated Branch Name' },
        { new: true }
      );
      assert.strictEqual(updatedBranch.companyId, 'COMP-A', 'findOneAndUpdate should block updating companyId');
      assert.strictEqual(updatedBranch.name, 'Updated Branch Name', 'findOneAndUpdate should still update name');
      
      console.log('✅ Company A branches created, spoof protection, and query hooks verified successfully.');
    });

    // 3. Run under Company B Context
    await runWithTenant('COMP-B', async () => {
      // Company B shouldn't see Company A's branches
      const initialB = await Branch.find({});
      assert.strictEqual(initialB.length, 0, 'Company B should not see Company A branches');

      // Create Branch under Company B
      const b1 = await Branch.create({
        id: 'BR-TEST-B1',
        name: 'Company B Branch 1',
        code: 'BR-B1',
        manager: 'Alice',
        managerId: 'EMP-003',
        established: '2026-01-01',
        address: '123 B Street',
        city: 'City B',
        state: 'State B'
      });
      assert.strictEqual(b1.companyId, 'COMP-B', 'Company B branch should automatically be COMP-B');

      // Query again
      const companyBBranches = await Branch.find({});
      assert.strictEqual(companyBBranches.length, 1, 'Company B should see exactly 1 branch');
      assert.strictEqual(companyBBranches[0].id, 'BR-TEST-B1', 'Company B should see its own branch');
      console.log('✅ Company B branches isolation verified successfully.');
    });

    // 4. Verify Company A again to be absolutely sure
    await runWithTenant('COMP-A', async () => {
      const companyABranches = await Branch.find({});
      assert.strictEqual(companyABranches.length, 3, 'Company A should still see only its own 3 branches');
      console.log('✅ Double verification of Company A isolation passed.');
    });

  } catch (error) {
    console.error('❌ Tests failed:', error);
    process.exit(1);
  } finally {
    await database.disconnect();
    console.log('--- Finished Branches Scoping Tests ---');
  }
};

testBranchesScoping();
