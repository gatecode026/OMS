import assert from 'assert';
import database from '../src/config/database.js';
import Employee from '../src/modules/employees/employees.model.js';
import Attendance from '../src/modules/attendance/attendance.model.js';
import Leave from '../src/modules/leaves/leaves.model.js';
import { runWithTenant } from '../src/utils/tenantContext.js';
import employeesRepository from '../src/modules/employees/employees.repository.js';
import attendanceRepository from '../src/modules/attendance/attendance.repository.js';
import leavesRepository from '../src/modules/leaves/leaves.repository.js';
import { setQueryLogging, sanitizeQueryOperators } from '../src/security/repositoryContract.js';
import { registerRetentionProvider } from '../src/security/auditLogger.js';

const testAuthorizationFramework = async () => {
  console.log('--- Starting Enterprise Authorization Framework Tests ---');
  
  await database.connect();
  setQueryLogging(false); // Clean stdout
  
  // Track SIEM audit logs sent during test
  const shippedLogs = [];
  registerRetentionProvider('TEST_PROVIDER', async (log) => {
    shippedLogs.push(log);
  });

  try {
    // 1. Seed records
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Attendance.deleteMany({});
      await Leave.deleteMany({});

      await Employee.create({
        id: 'EMP-A1',
        employeeCode: 'EMP-A1',
        name: 'Developer Joe',
        email: 'joe@test.com',
        phone: '1111111111',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      await Attendance.create({
        id: 'ATT-A1',
        employeeId: 'EMP-A1',
        employeeName: 'Developer Joe',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        date: '2026-06-30',
        status: 'Present'
      });

      console.log('🌱 Seeded mock employee and attendance.');
    });

    // TEST 1: Allowed Field Update
    console.log('\nTEST 1: Allowed Field Update via Permission Matrix...');
    await runWithTenant('COMP-A', async () => {
      const updated = await employeesRepository.update('EMP-A1', { phone: '9999999999' });
      assert.strictEqual(updated.phone, '9999999999', 'Should allow updating allowed profile field');
      console.log('✅ Allowed update succeeded.');
    }, false, { id: 'EMP-A1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering', companyId: 'COMP-A' });

    // TEST 2: Denied Field Update (Salary Modification rejection)
    console.log('\nTEST 2: Denied Field Update via Permission Matrix...');
    await runWithTenant('COMP-A', async () => {
      try {
        await employeesRepository.update('EMP-A1', { salary: 90000 });
        assert.fail('Should have rejected salary modification');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should return 403 status code');
        console.log('✅ Blocked restricted salary update successfully.');
      }
    }, false, { id: 'EMP-A1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering', companyId: 'COMP-A' });

    // TEST 3: Privilege Escalation Attempt (Role update block)
    console.log('\nTEST 3: Privilege Escalation Block...');
    await runWithTenant('COMP-A', async () => {
      try {
        await employeesRepository.update('EMP-A1', { roleId: 'super_admin' });
        assert.fail('Should have rejected roleId modification');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should return 403 status code');
        console.log('✅ Blocked role escalation update successfully.');
      }
    }, false, { id: 'EMP-A1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering', companyId: 'COMP-A' });

    // TEST 4: Query Operator Injection Block
    console.log('\nTEST 4: Query Operator Sanitization...');
    try {
      sanitizeQueryOperators({ name: 'Joe', '$where': 'function() { return true; }' });
      assert.fail('Should have thrown 400 bad request error for operator injection');
    } catch (err) {
      assert.strictEqual(err.statusCode, 400, 'Should return 400 status code');
      console.log('✅ Prevented operator injection successfully.');
    }

    // TEST 5: Verify SIEM Audit Shipping
    console.log('\nTEST 5: SIEM Audit Shipping...');
    assert(shippedLogs.length > 0, 'Should have shipped at least one log to SIEM provider');
    const deniedLog = shippedLogs.find(log => log.decision === 'DENIED');
    assert(deniedLog, 'Should have shipped a DENIED audit log');
    assert.strictEqual(deniedLog.companyId, 'COMP-A', 'Audit log must record active companyId');
    assert.strictEqual(deniedLog.userId, 'EMP-A1', 'Audit log must record active userId');
    console.log(`✅ Audit shipping verified: Shipped ${shippedLogs.length} events successfully.`);

    // TEST 6: Regression verification against Employees, Attendance, and Leave
    console.log('\nTEST 6: Regression verification against Attendance...');
    await runWithTenant('COMP-A', async () => {
      const records = await attendanceRepository.find({});
      assert.strictEqual(records.length, 1, 'Should find 1 attendance log');
      console.log('✅ Regression query verified successfully.');
    }, false, { id: 'EMP-A1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering', companyId: 'COMP-A' });

  } catch (error) {
    console.error('❌ Framework Tests failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Attendance.deleteMany({});
    });
    await database.disconnect();
    console.log('\n🎉 ALL ENTERPRISE FRAMEWORK ENHANCEMENT TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  }
};

testAuthorizationFramework();
