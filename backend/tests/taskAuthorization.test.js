import assert from 'assert';
import database from '../src/config/database.js';
import Employee from '../src/modules/employees/employees.model.js';
import Task from '../src/modules/tasks/tasks.model.js';
import Department from '../src/modules/departments/departments.model.js';
import { runWithTenant } from '../src/utils/tenantContext.js';
import tasksRepository from '../src/modules/tasks/tasks.repository.js';
import { setQueryLogging, sanitizeQueryOperators } from '../src/security/repositoryContract.js';

const testTaskAuthorization = async () => {
  console.log('--- Starting Tasks Security Authorization Tests ---');
  
  await database.connect();
  setQueryLogging(false); // Clean stdout

  try {
    // 1. Setup mock records in tenant database COMP-A
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Task.deleteMany({});
      await Department.deleteMany({});

      // Seed Departments
      await Department.create({
        companyId: 'COMP-A',
        name: 'Engineering',
        branch: 'Jaipur Branch',
        headId: 'EMP-MGR',
        head: 'Manager Mike'
      });

      await Department.create({
        companyId: 'COMP-A',
        name: 'Marketing',
        branch: 'Jaipur Branch',
        headId: 'EMP-MGR2',
        head: 'Manager Sarah'
      });

      // Seed Employees
      // Jaipur Engineering Developer, Team Leader, and Department Manager
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
        accountStatus: 'Active',
        team: 'Alpha Team'
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
        accountStatus: 'Active',
        team: 'Beta Team' // Different team!
      });

      await Employee.create({
        id: 'EMP-DEV-MKT',
        employeeCode: 'DEV-MKT',
        name: 'Marketing Joe',
        email: 'mkt@test.com',
        phone: '3333333333',
        branch: 'Jaipur Branch',
        department: 'Marketing', // Different department!
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      await Employee.create({
        id: 'EMP-DEV-HYD',
        employeeCode: 'DEV-HYD',
        name: 'Hyderabad Joe',
        email: 'hyd@test.com',
        phone: '4444444444',
        branch: 'Hyderabad Branch', // Different branch!
        department: 'Engineering',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      // Seed Tasks
      await Task.create({
        id: 'TSK-JOE',
        title: 'Joe Task',
        assigneeId: 'EMP-DEV-1',
        assigneeName: 'Developer Joe',
        status: 'To Do',
        priority: 'Medium'
      });

      await Task.create({
        id: 'TSK-PETE',
        title: 'Pete Task',
        assigneeId: 'EMP-DEV-2',
        assigneeName: 'Developer Pete',
        status: 'To Do',
        priority: 'Medium'
      });

      await Task.create({
        id: 'TSK-MKT',
        title: 'Marketing Task',
        assigneeId: 'EMP-DEV-MKT',
        assigneeName: 'Marketing Joe',
        status: 'To Do',
        priority: 'Medium'
      });

      await Task.create({
        id: 'TSK-HYD',
        title: 'Hyderabad Task',
        assigneeId: 'EMP-DEV-HYD',
        assigneeName: 'Hyderabad Joe',
        status: 'To Do',
        priority: 'Medium'
      });

      console.log('🌱 Seeded COMP-A Employees and Tasks.');
    });

    // ----------------------------------------
    // TASKS SECURITY TESTS
    // ----------------------------------------

    // TC-TSK-01: Employee sees only own assigned tasks
    console.log('\nTEST 1: Employee reads own assigned tasks...');
    await runWithTenant('COMP-A', async () => {
      const list = await tasksRepository.find({});
      assert.strictEqual(list.length, 1, 'Should load only 1 task');
      assert.strictEqual(list[0].id, 'TSK-JOE', 'Should match Joe Task');
      console.log('✅ Standard Employee reads strictly own tasks.');
    }, false, { id: 'EMP-DEV-1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-TSK-02: Team Leader sees only team member tasks
    console.log('\nTEST 2: Team Leader reads team tasks...');
    await runWithTenant('COMP-A', async () => {
      const list = await tasksRepository.find({});
      assert.strictEqual(list.length, 1, 'Should find only 1 task belonging to their team member');
      assert.strictEqual(list[0].id, 'TSK-JOE', 'Should load TSK-JOE (Alpha Team member)');
      console.log('✅ Team Leader reads strictly team member tasks.');
    }, false, { id: 'EMP-TL-1', role: 'team_leader', branch: 'Jaipur Branch', department: 'Engineering', teamEmployeeIds: ['EMP-DEV-1'] });

    // TC-TSK-03: Department Manager sees tasks inside assigned department
    console.log('\nTEST 3: Department Manager reads department tasks...');
    await runWithTenant('COMP-A', async () => {
      const list = await tasksRepository.find({});
      assert.strictEqual(list.length, 2, 'Should see both Engineering tasks in branch');
      assert(list.some(t => t.id === 'TSK-JOE'), 'Should include TSK-JOE');
      assert(list.some(t => t.id === 'TSK-PETE'), 'Should include TSK-PETE');
      console.log('✅ Department Manager scopes matching department.');
    }, false, { id: 'EMP-MGR', role: 'department_manager', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-TSK-04: Branch Manager sees tasks inside branch
    console.log('\nTEST 4: Branch Manager reads branch tasks...');
    await runWithTenant('COMP-A', async () => {
      const list = await tasksRepository.find({});
      assert.strictEqual(list.length, 3, 'Should see 3 tasks in Jaipur branch');
      assert(!list.some(t => t.id === 'TSK-HYD'), 'Should not load Hyderabad task');
      console.log('✅ Branch Manager scopes Jaipur branch.');
    }, false, { id: 'EMP-BM', role: 'branch_manager', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-TSK-05: Cross-branch read attempt blocked
    console.log('\nTEST 5: Cross-branch read attempt blocked...');
    await runWithTenant('COMP-A', async () => {
      try {
        await tasksRepository.findOne('TSK-HYD');
        assert.fail('Should have blocked Hyderabad task read');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should reject with 403');
        console.log('✅ Cross-branch access rejected.');
      }
    }, false, { id: 'EMP-DEV-1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-TSK-06: Employee field restrictions enforced (block priority change)
    console.log('\nTEST 6: Employee restricted field update blocked...');
    await runWithTenant('COMP-A', async () => {
      try {
        await tasksRepository.update('TSK-JOE', { priority: 'Urgent' });
        assert.fail('Employee should be blocked from updating priority');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should return 403');
        console.log('✅ Restricted field priority block verified.');
      }
    }, false, { id: 'EMP-DEV-1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-TSK-07: Employee status update allowed (allowed update check)
    console.log('\nTEST 7: Employee allowed fields update succeeded...');
    await runWithTenant('COMP-A', async () => {
      const updated = await tasksRepository.update('TSK-JOE', { status: 'In Progress' });
      assert.strictEqual(updated.status, 'In Progress', 'Should allow updating status');
      console.log('✅ Allowed status update succeeded.');
    }, false, { id: 'EMP-DEV-1', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

  } catch (error) {
    console.error('❌ Tasks Security Tests failed:', error);
    process.exit(1);
  } finally {
    // Cleanup records
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Task.deleteMany({});
      await Department.deleteMany({});
    });
    await database.disconnect();
    console.log('\n🎉 ALL TASKS SECURITY TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  }
};

testTaskAuthorization();
