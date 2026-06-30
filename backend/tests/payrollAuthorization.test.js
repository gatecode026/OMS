import assert from 'assert';
import database from '../src/config/database.js';
import Employee from '../src/modules/employees/employees.model.js';
import Department from '../src/modules/departments/departments.model.js';
import {
  PayrollGrade,
  PayrollReimbursement,
  PayrollLoanAdvance,
  PayrollBonus,
  PayrollPayment,
  PayrollConfig
} from '../src/modules/payroll/payroll.model.js';
import { runWithTenant } from '../src/utils/tenantContext.js';
import payrollRepository from '../src/modules/payroll/payroll.repository.js';
import { setQueryLogging, sanitizeQueryOperators } from '../src/security/repositoryContract.js';

const testPayrollAuthorization = async () => {
  console.log('--- Starting Payroll Security Authorization Tests ---');
  
  await database.connect();
  setQueryLogging(false); // Clean stdout

  try {
    // 1. Setup mock records in tenant database COMP-A
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Department.deleteMany({});
      await PayrollGrade.deleteMany({});
      await PayrollReimbursement.deleteMany({});
      await PayrollLoanAdvance.deleteMany({});
      await PayrollBonus.deleteMany({});
      await PayrollPayment.deleteMany({});
      await PayrollConfig.deleteMany({});

      // Seed Employees
      await Employee.create({
        id: 'EMP-DEV-1',
        employeeCode: 'DEV-1',
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

      await Employee.create({
        id: 'EMP-DEV-2',
        employeeCode: 'DEV-2',
        name: 'Developer Pete',
        email: 'pete@test.com',
        phone: '2222222222',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      // Seed Reimbursement for Joe
      await PayrollReimbursement.create({
        id: 'REI-JOE',
        employeeId: 'EMP-DEV-1',
        employeeName: 'Developer Joe',
        category: 'Travel',
        amount: 2500,
        requestDate: '2026-06-30',
        status: 'Pending'
      });

      // Seed Reimbursement for Pete
      await PayrollReimbursement.create({
        id: 'REI-PETE',
        employeeId: 'EMP-DEV-2',
        employeeName: 'Developer Pete',
        category: 'Medical',
        amount: 5000,
        requestDate: '2026-06-30',
        status: 'Pending'
      });

      // Seed Monthly Payment for Joe
      await PayrollPayment.create({
        id: 'EMP-DEV-1-06-2026',
        employeeId: 'EMP-DEV-1',
        employeeName: 'Developer Joe',
        department: 'Engineering',
        designation: 'Developer',
        branch: 'Jaipur Branch',
        month: '06',
        year: '2026',
        status: 'Hold',
        basicSalary: 40000,
        grossSalary: 55000,
        totalDeductions: 5000,
        netSalary: 50000,
        statutoryDeductions: 3000
      });

      console.log('🌱 Seeded COMP-A Employees and Payroll data.');
    });

    // ----------------------------------------
    // PAYROLL SECURITY TESTS
    // ----------------------------------------

    // TC-PAY-01: Employee sees only own payroll details in getMasterPayrollData
    console.log('\nTEST 1: Employee reads own payroll history...');
    await runWithTenant('COMP-A', async () => {
      const data = await payrollRepository.getMasterPayrollData();
      assert.strictEqual(data.reimbursements.length, 1, 'Should find only 1 reimbursement');
      assert.strictEqual(data.reimbursements[0].id, 'REI-JOE', 'Should load REI-JOE');
      assert.strictEqual(data.payments.length, 1, 'Should see only 1 payment slip');
      assert.strictEqual(data.grades.length, 0, 'Grades must be blocked/hidden from standard employee');
      assert.strictEqual(data.config, null, 'Global configuration must be hidden from standard employee');
      console.log('✅ Standard Employee reads strictly own payroll data.');
    }, false, { id: 'EMP-DEV-1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-PAY-02: Employee cannot read another employee's reimbursement
    console.log('\nTEST 2: Employee cannot access other employee payroll...');
    await runWithTenant('COMP-A', async () => {
      const data = await payrollRepository.getMasterPayrollData();
      assert(!data.reimbursements.some(r => r.id === 'REI-PETE'), 'Should not load Pete\'s reimbursement');
      console.log('✅ Employee blocked from reading another user\'s payroll data.');
    }, false, { id: 'EMP-DEV-1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-PAY-03: Employee cannot update salary record (restricted field block)
    console.log('\nTEST 3: Employee restricted field update blocked...');
    await runWithTenant('COMP-A', async () => {
      try {
        await payrollRepository.updatePaymentStatus('EMP-DEV-1', '06', '2026', 'Released');
        assert.fail('Employee should be blocked from updating status');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should reject with 403');
        console.log('✅ Restricted field status update blocked.');
      }
    }, false, { id: 'EMP-DEV-1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-PAY-04: HR Manager can read all branch payroll details
    console.log('\nTEST 4: HR Manager reads company payroll...');
    await runWithTenant('COMP-A', async () => {
      const data = await payrollRepository.getMasterPayrollData();
      assert.strictEqual(data.reimbursements.length, 2, 'HR should read all reimbursements');
      console.log('✅ HR Manager reads entire payroll database.');
    }, false, { id: 'EMP-HR', role: 'hr_manager', branch: 'Jaipur Branch', department: 'HR' });

    // TC-PAY-05: Finance Manager can update payment status
    console.log('\nTEST 5: Finance Manager updates payment status...');
    await runWithTenant('COMP-A', async () => {
      const updated = await payrollRepository.updatePaymentStatus('EMP-DEV-1', '06', '2026', 'Released');
      assert.strictEqual(updated.status, 'Released', 'Should update status successfully');
      console.log('✅ Finance Manager updatePaymentStatus approved.');
    }, false, { id: 'EMP-FIN', role: 'finance_manager', branch: 'Jaipur Branch', department: 'Finance' });

  } catch (error) {
    console.error('❌ Payroll Security Tests failed:', error);
    process.exit(1);
  } finally {
    // Cleanup records
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await PayrollReimbursement.deleteMany({});
      await PayrollPayment.deleteMany({});
    });
    await database.disconnect();
    console.log('\n🎉 ALL PAYROLL SECURITY TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  }
};

testPayrollAuthorization();
