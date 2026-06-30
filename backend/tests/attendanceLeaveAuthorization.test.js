import assert from 'assert';
import database from '../src/config/database.js';
import Employee from '../src/modules/employees/employees.model.js';
import Attendance from '../src/modules/attendance/attendance.model.js';
import Leave from '../src/modules/leaves/leaves.model.js';
import { runWithTenant } from '../src/utils/tenantContext.js';
import attendanceRepository from '../src/modules/attendance/attendance.repository.js';
import leavesRepository from '../src/modules/leaves/leaves.repository.js';
import { setQueryLogging, secureAggregationPipeline } from '../src/security/repositoryContract.js';
import { AttendanceQueryBuilder } from '../src/modules/attendance/attendance.queryBuilder.js';
import { LeaveQueryBuilder } from '../src/modules/leaves/leaves.queryBuilder.js';
import { resolveSecurityContext } from '../src/security/scopeEngine.js';

const testAttendanceLeaveAuthorization = async () => {
  console.log('--- Starting Attendance & Leave Security Authorization Tests ---');
  
  await database.connect();
  setQueryLogging(false); // Disable debugging logger to keep console output clean
  
  try {
    // 1. Setup mock records in tenant database COMP-A
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Attendance.deleteMany({});
      await Leave.deleteMany({});
      
      // Seed employees
      // Jaipur branch Engineering team leader and developer
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
        accountStatus: 'Active',
        team: 'Alpha Team'
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
        accountStatus: 'Active',
        team: 'Alpha Team',
        teamLeader: 'EMP-JAIPUR-TL'
      });

      // Hyderabad Marketing developer
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
        accountStatus: 'Active',
        team: 'Marketing Team'
      });

      // Attendance records
      await Attendance.create({
        id: 'ATT-JAIPUR-DEV',
        employeeId: 'EMP-JAIPUR-DEV',
        employeeName: 'Jaipur Dev',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        date: '2026-06-29',
        status: 'Present'
      });

      await Attendance.create({
        id: 'ATT-HYD-DEV',
        employeeId: 'EMP-HYD-DEV',
        employeeName: 'Hyderabad Dev',
        branch: 'Hyderabad',
        department: 'Marketing',
        date: '2026-06-29',
        status: 'Present'
      });

      // Leave records
      await Leave.create({
        id: 'LEAVE-JAIPUR-DEV',
        employeeId: 'EMP-JAIPUR-DEV',
        employeeName: 'Jaipur Dev',
        department: 'Engineering',
        type: 'Sick Leave',
        fromDate: '2026-07-01',
        toDate: '2026-07-02',
        days: 2,
        reason: 'Fever',
        status: 'Pending',
        appliedDate: '2026-06-29'
      });

      await Leave.create({
        id: 'LEAVE-HYD-DEV',
        employeeId: 'EMP-HYD-DEV',
        employeeName: 'Hyderabad Dev',
        department: 'Marketing',
        type: 'Casual Leave',
        fromDate: '2026-07-01',
        toDate: '2026-07-01',
        days: 1,
        reason: 'Personal',
        status: 'Approved',
        appliedDate: '2026-06-29'
      });

      console.log('🌱 Seeded COMP-A Employees, Attendance, and Leave Requests.');
    });

    // ----------------------------------------
    // ATTENDANCE SECURITY TESTS
    // ----------------------------------------
    console.log('\n--- Running Attendance Security Tests ---');

    // TC-ATT-01: Employee sees only own attendance
    await runWithTenant('COMP-A', async () => {
      const records = await attendanceRepository.find({});
      assert.strictEqual(records.length, 1, 'Employee should see exactly 1 attendance log');
      assert.strictEqual(records[0].employeeId, 'EMP-JAIPUR-DEV', 'Employee should see only their own attendance log');
      console.log('✅ Employee sees only own attendance.');
    }, false, { id: 'EMP-JAIPUR-DEV', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-ATT-02: Team Leader sees only assigned team
    await runWithTenant('COMP-A', async () => {
      const records = await attendanceRepository.find({});
      assert.strictEqual(records.length, 1, 'TL should see exactly 1 attendance log (for their team member)');
      assert.strictEqual(records[0].employeeId, 'EMP-JAIPUR-DEV', 'TL should see team member attendance');
      console.log('✅ Team Leader sees only assigned team attendance.');
    }, false, { 
      id: 'EMP-JAIPUR-TL', 
      role: 'team_leader', 
      branch: 'Jaipur Branch', 
      department: 'Engineering',
      teamEmployeeIds: ['EMP-JAIPUR-TL', 'EMP-JAIPUR-DEV'] 
    });

    // TC-ATT-03: Department Manager sees only assigned department
    await runWithTenant('COMP-A', async () => {
      const records = await attendanceRepository.find({});
      assert.strictEqual(records.length, 1, 'Dept Manager should see 1 log in department');
      assert.strictEqual(records[0].department, 'Engineering', 'Dept Manager should see Engineering logs only');
      console.log('✅ Department Manager sees only assigned department.');
    }, false, { id: 'MGR-DEPT', role: 'dept_admin', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-ATT-04: Branch Manager sees only assigned branch
    await runWithTenant('COMP-A', async () => {
      const records = await attendanceRepository.find({});
      assert.strictEqual(records.length, 1, 'Branch Manager should see Jaipur logs only');
      assert.strictEqual(records[0].branch, 'Jaipur Branch', 'Branch Manager should see Jaipur logs only');
      console.log('✅ Branch Manager sees only assigned branch.');
    }, false, { id: 'MGR-BRANCH', role: 'manager', branch: 'Jaipur Branch', department: 'HR' });

    // TC-ATT-05: Cross-branch access blocked
    await runWithTenant('COMP-A', async () => {
      try {
        await attendanceRepository.findOne('ATT-HYD-DEV');
        assert.fail('Should have rejected cross-branch read');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error must be 403');
        console.log('✅ Cross-branch single-read access blocked.');
      }
    }, false, { id: 'EMP-JAIPUR-TL', role: 'team_leader', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-ATT-06: Unauthorized update blocked
    await runWithTenant('COMP-A', async () => {
      try {
        await attendanceRepository.update('ATT-HYD-DEV', { status: 'Absent' });
        assert.fail('Should have rejected cross-branch update');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error must be 403');
        console.log('✅ Cross-branch update blocked.');
      }
    }, false, { id: 'EMP-JAIPUR-TL', role: 'team_leader', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-ATT-07: Field Level Security validation
    await runWithTenant('COMP-A', async () => {
      try {
        await attendanceRepository.update('ATT-JAIPUR-DEV', { branch: 'Hyderabad' });
        assert.fail('Should have blocked modifying restricted branch field');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error must be 403');
        assert(err.message.includes('not authorized to modify the "branch" field'), 'Error message must reflect field restriction');
        console.log('✅ Employee modification of restricted branch field blocked.');
      }
    }, false, { id: 'EMP-JAIPUR-DEV', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-ATT-08: Aggregation respects scope
    await runWithTenant('COMP-A', async () => {
      const context = resolveSecurityContext();
      const builder = new AttendanceQueryBuilder(context);
      const pipeline = [{ $group: { _id: '$status', count: { $sum: 1 } } }];
      const secured = await secureAggregationPipeline(pipeline, context, builder);
      assert.strictEqual(secured[0].$match.employeeId, 'EMP-JAIPUR-DEV', 'Match stage must contain scoped employeeId');
      console.log('✅ Attendance aggregation pipeline security matches.');
    }, false, { id: 'EMP-JAIPUR-DEV', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // ----------------------------------------
    // LEAVE REQUEST SECURITY TESTS
    // ----------------------------------------
    console.log('\n--- Running Leave Security Tests ---');

    // TC-LEAVE-01: Employee sees only own leave
    await runWithTenant('COMP-A', async () => {
      const records = await leavesRepository.find({});
      assert.strictEqual(records.length, 1, 'Employee should see exactly 1 leave record');
      assert.strictEqual(records[0].employeeId, 'EMP-JAIPUR-DEV', 'Employee should see only own leaves');
      console.log('✅ Employee sees only own leave requests.');
    }, false, { id: 'EMP-JAIPUR-DEV', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-LEAVE-02: Team Leader sees only assigned team leaves
    await runWithTenant('COMP-A', async () => {
      const records = await leavesRepository.find({});
      assert.strictEqual(records.length, 1, 'TL should see exactly 1 leave record from team member');
      assert.strictEqual(records[0].employeeId, 'EMP-JAIPUR-DEV', 'TL should see team member leaves');
      console.log('✅ Team Leader sees only team member leaves.');
    }, false, { 
      id: 'EMP-JAIPUR-TL', 
      role: 'team_leader', 
      branch: 'Jaipur Branch', 
      department: 'Engineering',
      teamEmployeeIds: ['EMP-JAIPUR-TL', 'EMP-JAIPUR-DEV'] 
    });

    // TC-LEAVE-03: Branch Manager scope verified (via dynamic Employee resolution)
    await runWithTenant('COMP-A', async () => {
      const records = await leavesRepository.find({});
      assert.strictEqual(records.length, 1, 'Branch Manager should see Jaipur leaves only');
      assert.strictEqual(records[0].employeeId, 'EMP-JAIPUR-DEV', 'Should only see employee of Jaipur branch');
      console.log('✅ Branch Manager leaves list is branch-scoped via Employee resolution.');
    }, false, { id: 'MGR-BRANCH', role: 'manager', branch: 'Jaipur Branch', department: 'HR' });

    // TC-LEAVE-04: Cross-branch access blocked
    await runWithTenant('COMP-A', async () => {
      try {
        await leavesRepository.findOne('LEAVE-HYD-DEV');
        assert.fail('Should have rejected cross-branch leave read');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error must be 403');
        console.log('✅ Cross-branch leave single-read access blocked.');
      }
    }, false, { id: 'EMP-JAIPUR-TL', role: 'team_leader', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-LEAVE-05: Standard Employee cannot approve leave (restricted status field modification)
    await runWithTenant('COMP-A', async () => {
      try {
        await leavesRepository.update('LEAVE-JAIPUR-DEV', { status: 'Approved' });
        assert.fail('Should have blocked modifying status field');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error must be 403');
        assert(err.message.includes('not authorized to modify the "status" field'), 'Error message must reflect status field block');
        console.log('✅ Standard employee cannot modify status field.');
      }
    }, false, { id: 'EMP-JAIPUR-DEV', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-LEAVE-06: Employee cannot update processed leaves
    await runWithTenant('COMP-A', async () => {
      try {
        await leavesRepository.update('LEAVE-HYD-DEV', { reason: 'Updated reason' });
        assert.fail('Should have blocked updating processed leave');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error must be 403');
        assert(err.message.includes('cannot update a leave request that has already been processed'), 'Error message must reflect processed status block');
        console.log('✅ Employee cannot modify processed leaves.');
      }
    }, false, { id: 'EMP-HYD-DEV', role: 'employee', branch: 'Hyderabad', department: 'Marketing' });

    // TC-LEAVE-07: Aggregation respects scope
    await runWithTenant('COMP-A', async () => {
      const context = resolveSecurityContext();
      const builder = new LeaveQueryBuilder(context);
      const pipeline = [{ $group: { _id: '$status', count: { $sum: 1 } } }];
      const secured = await secureAggregationPipeline(pipeline, context, builder);
      assert.strictEqual(secured[0].$match.employeeId, 'EMP-JAIPUR-DEV', 'Match stage must contain scoped employeeId');
      console.log('✅ Leave aggregation pipeline security matches.');
    }, false, { id: 'EMP-JAIPUR-DEV', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // ----------------------------------------
    // LEAVE POLICY SECURITY TESTS
    // ----------------------------------------
    console.log('\n--- Running Leave Policy Security Tests ---');

    // TC-POLICY-01: Employee can read Leave Policies (scoping bypassed for policies)
    await runWithTenant('COMP-A', async () => {
      await leavesRepository.resetPolicies();
    }, false, { id: 'ADMIN-A', role: 'company_admin', companyId: 'COMP-A' });

    await runWithTenant('COMP-A', async () => {
      const policies = await leavesRepository.findPolicies();
      assert.strictEqual(policies.length, 4, 'Should read default 4 policies');
      console.log('✅ Standard Employee can read policies.');
    }, false, { id: 'EMP-JAIPUR-DEV', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-POLICY-02: Employee cannot write/update Leave Policies
    await runWithTenant('COMP-A', async () => {
      try {
        await leavesRepository.savePolicy({ id: 'POL-HACK', leaveCode: 'HL', leaveName: 'Hacked Leave', defaultDays: 10, maxCarryForward: 0 });
        assert.fail('Employee should be blocked from creating policy');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Error must be 403');
        assert(err.message.includes('Only Administrators are authorized'), 'Error message must reflect policy restriction');
        console.log('✅ Standard Employee rejected from creating policy.');
      }
    }, false, { id: 'EMP-JAIPUR-DEV', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

  } catch (error) {
    console.error('❌ Attendance & Leave Security Tests failed:', error);
    process.exit(1);
  } finally {
    // Cleanup records
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Attendance.deleteMany({});
      await Leave.deleteMany({});
    });
    await database.disconnect();
    console.log('\n🎉 ALL ATTENDANCE & LEAVE AUTHORIZATION TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  }
};

testAttendanceLeaveAuthorization();
