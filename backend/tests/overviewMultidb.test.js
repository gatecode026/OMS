/**
 * @file tests/overviewMultidb.test.js
 * @description Integration test to verify multi-database aware getOverview controller.
 */

import assert from 'assert';
import mongoose from 'mongoose';
import database from '../src/config/database.js';
import Company from '../src/modules/companies/company.model.js';
import Employee from '../src/modules/employees/employees.model.js';
import Project from '../src/modules/projects/projects.model.js';
import ActivityLog from '../src/modules/activity-logs/activity-log.model.js';
import { getOverview } from '../src/modules/admin/admin.controller.js';
import env from '../src/config/env.js';

const testOverviewMultidb = async () => {
  console.log('--- Starting Multi-Database Overview Aggregation Tests ---');

  // 1. Establish connection to main platform database
  await database.connect();

  const mainDbUri = env.dbUri;
  const customDbUri = mainDbUri.includes('office-management')
    ? mainDbUri.replace('/office-management', '/office-mgmt-custom-test')
    : mainDbUri + '-custom-test';

  const invalidDbUri = 'mongodb://127.0.0.1:9999/dummy-db-fail?serverSelectionTimeoutMS=1000';

  const normalId = 'COMP-TEST-OVERVIEW-NORMAL';
  const customOkId = 'COMP-TEST-OVERVIEW-CUSTOM-OK';
  const customFailId = 'COMP-TEST-OVERVIEW-CUSTOM-FAIL';

  try {
    // 2. Clear pre-existing test data
    await Company.deleteMany({ id: { $in: [normalId, customOkId, customFailId] } });
    await Employee.deleteMany({ companyId: normalId });
    await Project.deleteMany({ companyId: normalId });
    await ActivityLog.deleteMany({ companyId: normalId });
    console.log('🧹 Cleaned existing platform test companies.');

    // 3. Register test companies on platform database
    await Company.create([
      {
        id: normalId,
        name: 'Overview Normal Tenant',
        subdomain: 'normal-overview-sub',
        plan: 'Basic',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        settings: { dbUri: '', primaryColor: '#8b5cf6' }
      },
      {
        id: customOkId,
        name: 'Overview Custom OK Tenant',
        subdomain: 'custom-ok-overview-sub',
        plan: 'Premium',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        settings: { dbUri: customDbUri, primaryColor: '#ec4899' }
      },
      {
        id: customFailId,
        name: 'Overview Custom Fail Tenant',
        subdomain: 'custom-fail-overview-sub',
        plan: 'Enterprise',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        settings: { dbUri: invalidDbUri, primaryColor: '#3b82f6' }
      }
    ]);
    console.log('🏢 Registered 3 test companies (Shared, Custom, Custom Invalid).');

    // 4. Seed normal company metrics in shared main database
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 3);

    // Using mongoose bypass to seed directly
    await Employee.collection.insertMany([
      {
        id: 'EMP-N1',
        name: 'Normal Emp 1',
        email: 'emp1@normal.com',
        status: 'Active',
        companyId: normalId,
        lastLoginAt: new Date() // logged in today
      },
      {
        id: 'EMP-N2',
        name: 'Normal Emp 2',
        email: 'emp2@normal.com',
        status: 'Inactive',
        companyId: normalId,
        lastLoginAt: sevenDaysAgo // logged in 3 days ago
      }
    ]);

    await Project.collection.insertOne({
      id: 'PROJ-N1',
      name: 'Normal Project',
      companyId: normalId,
      tasks: [
        { id: 'T-N1', name: 'Task 1', completed: true, status: 'Completed' },
        { id: 'T-N2', name: 'Task 2', completed: false, status: 'In Progress' }
      ]
    });

    await ActivityLog.collection.insertOne({
      id: 'ACT-N1',
      action: 'Test action',
      companyId: normalId,
      createdAt: new Date()
    });
    console.log('✅ Seeded Normal Tenant metrics in main platform database.');

    // 5. Seed Custom OK Tenant metrics in its isolated database
    const customConn = mongoose.createConnection(customDbUri);
    await new Promise((resolve) => customConn.once('open', resolve));

    const CustomEmployeeModel = customConn.model('Employee', Employee.schema);
    const CustomProjectModel = customConn.model('Project', Project.schema);
    const CustomActivityLogModel = customConn.model('ActivityLog', ActivityLog.schema);

    await CustomEmployeeModel.deleteMany({});
    await CustomProjectModel.deleteMany({});
    await CustomActivityLogModel.deleteMany({});

    await CustomEmployeeModel.collection.insertMany([
      { id: 'EMP-C1', name: 'Custom Emp 1', email: 'emp1@custom.com', status: 'Active', companyId: customOkId, lastLoginAt: new Date() },
      { id: 'EMP-C2', name: 'Custom Emp 2', email: 'emp2@custom.com', status: 'Active', companyId: customOkId, lastLoginAt: new Date() },
      { id: 'EMP-C3', name: 'Custom Emp 3', email: 'emp3@custom.com', status: 'Active', companyId: customOkId, lastLoginAt: sevenDaysAgo }
    ]);

    await CustomProjectModel.collection.insertOne({
      id: 'PROJ-C1',
      name: 'Custom Project',
      companyId: customOkId,
      tasks: [
        { id: 'T-C1', name: 'Task 1', completed: true, status: 'Completed' },
        { id: 'T-C2', name: 'Task 2', completed: true, status: 'Completed' },
        { id: 'T-C3', name: 'Task 3', completed: true, status: 'Completed' }
      ]
    });

    await CustomActivityLogModel.collection.insertOne({
      id: 'ACT-C1',
      action: 'Custom test action',
      companyId: customOkId,
      createdAt: new Date(Date.now() - 3600 * 1000) // 1 hr ago
    });

    await customConn.close();
    console.log('✅ Seeded Custom OK Tenant metrics in its isolated database.');

    // 6. Execute getOverview controller directly
    console.log('🔄 Executing getOverview controller...');
    
    let responseData = null;
    const mockReq = {};
    
    await new Promise((resolve, reject) => {
      const mockRes = {
        status(code) {
          return this;
        },
        json(data) {
          responseData = data;
          resolve();
          return this;
        }
      };
      const next = (err) => {
        if (err) reject(err);
        else resolve();
      };
      getOverview(mockReq, mockRes, next);
    });

    assert.ok(responseData, 'Response data should be defined');
    assert.strictEqual(responseData.status, 'success', 'Response status should be success');
    const statsList = responseData.data;

    // Filter results for our test companies
    const normalStats = statsList.find(s => s.companyId === normalId);
    const customOkStats = statsList.find(s => s.companyId === customOkId);
    const customFailStats = statsList.find(s => s.companyId === customFailId);

    assert.ok(normalStats, 'Normal stats should exist');
    assert.ok(customOkStats, 'Custom OK stats should exist');
    assert.ok(customFailStats, 'Custom Fail stats should exist');

    // Assert Normal Tenant stats
    console.log('📊 Asserting Normal Tenant statistics...');
    assert.strictEqual(normalStats.isCustomDb, false, 'Should be flagged as shared database');
    assert.strictEqual(normalStats.error, null, 'Error should be null');
    assert.strictEqual(normalStats.totalEmployees, 2, 'Total employees should be 2');
    assert.strictEqual(normalStats.activeEmployeesCount, 1, 'Active employees count should be 1');
    assert.strictEqual(normalStats.totalTasks, 2, 'Total tasks should be 2');
    assert.strictEqual(normalStats.completedTasksCount, 1, 'Completed tasks should be 1');
    assert.strictEqual(normalStats.pendingTasksCount, 1, 'Pending tasks should be 1');
    assert.strictEqual(normalStats.last7DaysLoginCount, 2, 'Last 7 days logins should be 2');
    assert.ok(normalStats.lastActivityTimestamp, 'Activity timestamp should exist');
    console.log('✅ Normal Tenant assertions passed.');

    // Assert Custom OK Tenant stats
    console.log('📊 Asserting Custom OK Tenant statistics...');
    assert.strictEqual(customOkStats.isCustomDb, true, 'Should be flagged as custom database');
    assert.strictEqual(customOkStats.error, null, 'Error should be null');
    assert.strictEqual(customOkStats.totalEmployees, 3, 'Total employees should be 3');
    assert.strictEqual(customOkStats.activeEmployeesCount, 3, 'Active employees count should be 3');
    assert.strictEqual(customOkStats.totalTasks, 3, 'Total tasks should be 3');
    assert.strictEqual(customOkStats.completedTasksCount, 3, 'Completed tasks should be 3');
    assert.strictEqual(customOkStats.pendingTasksCount, 0, 'Pending tasks should be 0');
    assert.strictEqual(customOkStats.last7DaysLoginCount, 3, 'Last 7 days logins should be 3');
    assert.ok(customOkStats.lastActivityTimestamp, 'Activity timestamp should exist');
    console.log('✅ Custom OK Tenant assertions passed.');

    // Assert Custom Fail Tenant stats (unreachable database connection)
    console.log('📊 Asserting Custom Fail Tenant statistics...');
    assert.strictEqual(customFailStats.isCustomDb, true, 'Should be flagged as custom database');
    assert.strictEqual(customFailStats.error, 'unreachable', 'Error should be unreachable');
    assert.strictEqual(customFailStats.totalEmployees, null, 'Unreachable metrics should be null');
    assert.strictEqual(customFailStats.activeEmployeesCount, null, 'Unreachable metrics should be null');
    assert.strictEqual(customFailStats.totalTasks, null, 'Unreachable metrics should be null');
    assert.strictEqual(customFailStats.lastActivityTimestamp, null, 'Unreachable metrics should be null');
    console.log('✅ Custom Fail Tenant graceful unreachable mapping passed.');

    // 7. Cleanup
    console.log('🧹 Cleaning up test databases...');
    await Company.deleteMany({ id: { $in: [normalId, customOkId, customFailId] } });
    await Employee.deleteMany({ companyId: normalId });
    await Project.deleteMany({ companyId: normalId });
    await ActivityLog.deleteMany({ companyId: normalId });

    const cleanupConn = mongoose.createConnection(customDbUri);
    await new Promise((resolve) => cleanupConn.once('open', resolve));
    await cleanupConn.db.dropDatabase();
    await cleanupConn.close();
    console.log('🧹 Cleanup successfully finished.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await database.disconnect();
    console.log('--- Finished Multi-Database Overview Aggregation Tests ---');
  }
};

testOverviewMultidb();
