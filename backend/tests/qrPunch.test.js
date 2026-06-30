import assert from 'assert';
import database from '../src/config/database.js';
import Employee from '../src/modules/employees/employees.model.js';
import Attendance from '../src/modules/attendance/attendance.model.js';
import { runWithTenant } from '../src/utils/tenantContext.js';
import service from '../src/modules/attendance/attendance.service.js';

const testQrPunch = async () => {
  console.log('--- Starting QR Code Attendance Punch Security Tests ---');
  await database.connect();

  try {
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Attendance.deleteMany({});

      // Seed Employee
      const emp = await Employee.create({
        id: 'EMP-SCANNER-TEST',
        employeeCode: 'SCANNER-1',
        name: 'Scanner Test User',
        email: 'scanner@test.com',
        phone: '9999999999',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      console.log('🌱 Seeded COMP-A Scanner Employee.');

      // 1. Initial Punch In
      console.log('\nTEST 1: Initial punch in...');
      const resIn = await service.qrPunch('EMP-SCANNER-TEST', 'COMP-A');
      assert.strictEqual(resIn.success, true, 'Punch in should succeed');
      assert.strictEqual(resIn.type, 'in', 'Should be a punch-in action');
      console.log('✅ Initial punch-in succeeded:', resIn.message);

      // 2. Scan again immediately (within 1 hour)
      console.log('\nTEST 2: Scan again within 1 hour (should be blocked)...');
      const resBlock = await service.qrPunch('EMP-SCANNER-TEST', 'COMP-A');
      assert.strictEqual(resBlock.success, false, 'Should be blocked');
      assert.ok(resBlock.message.includes('Already punched in'), 'Should warn about duplicate');
      console.log('✅ Duplicate scan blocked successfully:', resBlock.message);

      // 3. Simulate 1 hour having passed by manually shifting the createdAt timestamp of the attendance record in Mongo!
      console.log('\nTEST 3: Simulating 1.5 hours elapsed and punching out...');
      const d = new Date();
      // Backdate by 90 minutes
      d.setMinutes(d.getMinutes() - 90);
      const updateResult = await Attendance.collection.updateOne({ employeeId: 'EMP-SCANNER-TEST' }, { $set: { createdAt: d } });
      console.log('Update result:', updateResult);
      
      const checkRecord = await Attendance.findOne({ employeeId: 'EMP-SCANNER-TEST' });
      console.log('Check record createdAt:', checkRecord.createdAt, 'Compared to now:', new Date());

      const resOut = await service.qrPunch('EMP-SCANNER-TEST', 'COMP-A');
      assert.strictEqual(resOut.success, true, 'Punch out should succeed');
      assert.strictEqual(resOut.type, 'out', 'Should be a punch-out action');
      assert.ok(resOut.totalHours >= 1.5, 'Should record total hours');
      console.log('✅ Punch-out after 1 hour succeeded:', resOut.message);

      // 4. Scan again after punch out
      console.log('\nTEST 4: Scan again after punching out...');
      const resOutAgain = await service.qrPunch('EMP-SCANNER-TEST', 'COMP-A');
      assert.strictEqual(resOutAgain.success, false, 'Should be blocked after punch-out');
      assert.ok(resOutAgain.message.includes('Already punched out'), 'Should warn already punched out');
      console.log('✅ Scan after punch-out blocked successfully:', resOutAgain.message);
    });
  } catch (error) {
    console.error('❌ QR Punch Tests failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Attendance.deleteMany({});
    });
    await database.disconnect();
    console.log('\n🎉 ALL QR PUNCH SECURITY TESTS PASSED COMPLETED SUCCESSFULLY!');
    process.exit(0);
  }
};

testQrPunch();
