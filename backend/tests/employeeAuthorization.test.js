import assert from 'assert';
import database from '../src/config/database.js';
import Employee from '../src/modules/employees/employees.model.js';
import { runWithTenant } from '../src/utils/tenantContext.js';
import employeesRepository from '../src/modules/employees/employees.repository.js';
import { setQueryLogging } from '../src/security/repositoryContract.js';

const testEmployeeAuthorization = async () => {
  console.log('--- Starting Employee Security Authorization Tests ---');
  
  // Establish connection to database
  await database.connect();
  setQueryLogging(false); // Disable query debug logging during tests to keep stdout clean
  
  try {
    // 1. Setup mock records in tenant database COMP-A
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      
      // Seed super admin / company admin
      // Seed different branch employees: Jaipur Branch vs Hyderabad
      await Employee.create({
        id: 'EMP-JAIPUR-TL',
        employeeCode: 'JAIPUR-TL',
        name: 'Jaipur Leader',
        email: 'jaipur-tl@test.com',
        phone: '1111111111',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        roleId: 'team_leader',
        role: 'Team Leader',
        status: 'Active',
        accountStatus: 'Active'
      });

      await Employee.create({
        id: 'EMP-JAIPUR-DEV',
        employeeCode: 'JAIPUR-DEV',
        name: 'Jaipur Dev',
        email: 'jaipur-dev@test.com',
        phone: '2222222222',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      await Employee.create({
        id: 'EMP-HYD-DEV',
        employeeCode: 'HYD-DEV',
        name: 'Hyderabad Dev',
        email: 'hyd-dev@test.com',
        phone: '3333333333',
        branch: 'Hyderabad',
        department: 'Marketing',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      await Employee.create({
        id: 'EMP-JAIPUR-HR',
        employeeCode: 'JAIPUR-HR',
        name: 'Jaipur Manager',
        email: 'jaipur-mgr@test.com',
        phone: '4444444444',
        branch: 'Jaipur Branch',
        department: 'HR',
        roleId: 'manager',
        role: 'Manager',
        status: 'Active',
        accountStatus: 'Active'
      });
      
      console.log('🌱 Seeded 4 test employees under COMP-A.');
    });

    // 2. Setup mock records in tenant database COMP-B
    await runWithTenant('COMP-B', async () => {
      await Employee.deleteMany({});
      await Employee.create({
        id: 'EMP-COMPB-DEV',
        employeeCode: 'COMPB-DEV',
        name: 'Comp B Dev',
        email: 'compb-dev@test.com',
        phone: '5555555555',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });
      console.log('🌱 Seeded 1 test employee under COMP-B.');
    });

    // TEST 1: Company Isolation
    console.log('\nTEST 1: Company Tenant Isolation...');
    await runWithTenant('COMP-A', async () => {
      const emps = await employeesRepository.find({});
      assert.strictEqual(emps.length, 4, 'Company A should see exactly 4 employees');
      assert(emps.every(e => e.id !== 'EMP-COMPB-DEV'), 'Company A must not see Company B employees');
    }, false, { id: 'ADMIN-A', role: 'company_admin', companyId: 'COMP-A' });

    await runWithTenant('COMP-B', async () => {
      const emps = await employeesRepository.find({});
      assert.strictEqual(emps.length, 1, 'Company B should see exactly 1 employee');
      assert.strictEqual(emps[0].id, 'EMP-COMPB-DEV', 'Company B should see its own employee');
    }, false, { id: 'ADMIN-B', role: 'company_admin', companyId: 'COMP-B' });
    console.log('✅ TEST 1 PASSED.');

    // TEST 2: Team Leader sees only own branch
    console.log('\nTEST 2: Team Leader Branch Scoping...');
    await runWithTenant('COMP-A', async () => {
      const list = await employeesRepository.find({});
      assert.strictEqual(list.length, 3, 'Jaipur TL should only see Jaipur employees (3 of them)');
      assert(list.every(e => e.branch === 'Jaipur Branch'), 'All returned records must belong to Jaipur Branch');
      console.log('✅ Team Leader read list is correctly branch-scoped.');
    }, false, { id: 'EMP-JAIPUR-TL', role: 'team_leader', branch: 'Jaipur Branch', department: 'Engineering', companyId: 'COMP-A' });
    console.log('✅ TEST 2 PASSED.');

    // TEST 3: Team Leader cannot view another branch employee directly (Read Single Bypass protection)
    console.log('\nTEST 3: Team Leader Cross-Branch Single Read Block...');
    await runWithTenant('COMP-A', async () => {
      // Trying to query Hyderabad Dev directly
      try {
        await employeesRepository.findOne('EMP-HYD-DEV');
        assert.fail('Should have thrown 403 error for cross-branch read');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error status code must be 403');
        assert(err.message.includes('Access denied'), 'Error message must contain access denied');
        console.log('✅ Rejected Team Leader single-read attempt on Hyderabad employee.');
      }
    }, false, { id: 'EMP-JAIPUR-TL', role: 'team_leader', branch: 'Jaipur Branch', department: 'Engineering', companyId: 'COMP-A' });
    console.log('✅ TEST 3 PASSED.');

    // TEST 4: Team Leader cannot update another branch employee
    console.log('\nTEST 4: Team Leader Cross-Branch Update Block...');
    await runWithTenant('COMP-A', async () => {
      try {
        await employeesRepository.update('EMP-HYD-DEV', { name: 'Hacked Name' });
        assert.fail('Should have thrown 403 error for cross-branch update');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error status code must be 403');
        assert(err.message.includes('outside your scoped branch'), 'Error message must specify branch scope mismatch');
        console.log('✅ Rejected Team Leader update attempt on Hyderabad employee.');
      }
    }, false, { id: 'EMP-JAIPUR-TL', role: 'team_leader', branch: 'Jaipur Branch', department: 'Engineering', companyId: 'COMP-A' });
    console.log('✅ TEST 4 PASSED.');

    // TEST 5: Manager sees only allowed employees (Branch-scoped)
    console.log('\nTEST 5: Branch Manager Scoping...');
    await runWithTenant('COMP-A', async () => {
      const list = await employeesRepository.find({});
      assert.strictEqual(list.length, 3, 'Jaipur Manager should only see Jaipur employees');
      assert(list.every(e => e.branch === 'Jaipur Branch'), 'All returned records must belong to Jaipur Branch');
      console.log('✅ Manager read list is correctly branch-scoped.');
    }, false, { id: 'EMP-JAIPUR-HR', role: 'manager', branch: 'Jaipur Branch', department: 'HR', companyId: 'COMP-A' });
    console.log('✅ TEST 5 PASSED.');

    // TEST 6: Company Admin sees all company employees
    console.log('\nTEST 6: Company Admin Unscoped Scoping...');
    await runWithTenant('COMP-A', async () => {
      const list = await employeesRepository.find({});
      assert.strictEqual(list.length, 4, 'Company Admin should see all 4 employees in Company A');
      console.log('✅ Company Admin has unscoped access within company.');
    }, false, { id: 'ADMIN-A', role: 'company_admin', companyId: 'COMP-A' });
    console.log('✅ TEST 6 PASSED.');

    // TEST 7: Super Admin sees everything
    console.log('\nTEST 7: Super Admin Unscoped Scoping...');
    // We execute Super Admin on COMP-A and verify
    await runWithTenant('COMP-A', async () => {
      const list = await employeesRepository.find({});
      assert.strictEqual(list.length, 4, 'Super Admin should see all employees on COMP-A');
      console.log('✅ Super Admin has unscoped access.');
    }, true, { id: 'SA-01', role: 'super_admin', companyId: 'COMP-A' });
    console.log('✅ TEST 7 PASSED.');

    // TEST 8: Employee Ownership Enforced on Updates/Deletes
    console.log('\nTEST 8: Employee Ownership Enforcement...');
    await runWithTenant('COMP-A', async () => {
      // 1. Reading another employee in same department is allowed
      const devProfile = await employeesRepository.findOne('EMP-JAIPUR-TL');
      assert.strictEqual(devProfile.id, 'EMP-JAIPUR-TL', 'Employee should be able to view another employee in same department/branch');

      // 2. Updating another employee in same department is rejected
      try {
        await employeesRepository.update('EMP-JAIPUR-TL', { name: 'Defaced Leader' });
        assert.fail('Should have rejected update on another employee');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error status code must be 403');
        assert(err.message.includes('authorized to update or delete another employee'), 'Error message must reflect ownership violation');
        console.log('✅ Rejected standard employee update on another employee.');
      }

      // 3. Deleting another employee in same department is rejected
      try {
        await employeesRepository.remove('EMP-JAIPUR-TL');
        assert.fail('Should have rejected delete on another employee');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error status code must be 403');
        console.log('✅ Rejected standard employee delete on another employee.');
      }

      // 4. Updating self is allowed
      const updatedSelf = await employeesRepository.update('EMP-JAIPUR-DEV', { name: 'Jaipur Dev Updated' });
      assert.strictEqual(updatedSelf.name, 'Jaipur Dev Updated', 'Employee must be allowed to update their own profile');
      console.log('✅ Standard employee ownership update allowed.');
    }, false, { id: 'EMP-JAIPUR-DEV', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering', companyId: 'COMP-A' });
    console.log('✅ TEST 8 PASSED.');

  } catch (error) {
    console.error('❌ Security Tests failed:', error);
    process.exit(1);
  } finally {
    // Cleanup databases
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
    });
    await runWithTenant('COMP-B', async () => {
      await Employee.deleteMany({});
    });
    await database.disconnect();
    console.log('\n🎉 ALL EMPLOYEE AUTHORIZATION TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  }
};

testEmployeeAuthorization();
