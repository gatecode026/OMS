import assert from 'assert';
import database from '../src/config/database.js';
import Employee from '../src/modules/employees/employees.model.js';
import Document from '../src/modules/documents/document.model.js';
import Project from '../src/modules/projects/projects.model.js';
import Department from '../src/modules/departments/departments.model.js';
import { runWithTenant } from '../src/utils/tenantContext.js';
import documentsRepository from '../src/modules/documents/documents.repository.js';
import projectsRepository from '../src/modules/projects/projects.repository.js';
import { setQueryLogging, sanitizeQueryOperators, secureAggregationPipeline } from '../src/security/repositoryContract.js';
import { ProjectsQueryBuilder } from '../src/modules/projects/projects.queryBuilder.js';

const testDocumentsProjectsAuthorization = async () => {
  console.log('--- Starting Documents & Projects Security Authorization Tests ---');
  
  await database.connect();
  setQueryLogging(false); // Disable query debug logging to keep console clean

  try {
    // 1. Setup mock records in tenant database COMP-A
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Document.deleteMany({});
      await Project.deleteMany({});
      await Department.deleteMany({});

      // Seed Department
      await Department.create({
        companyId: 'COMP-A',
        name: 'Engineering',
        branch: 'Jaipur Branch',
        headId: 'EMP-A2',
        head: 'Developer Sarah'
      });

      // Seed Employees
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

      await Employee.create({
        id: 'EMP-A2',
        employeeCode: 'EMP-A2',
        name: 'Developer Sarah',
        email: 'sarah@test.com',
        phone: '2222222222',
        branch: 'Jaipur Branch',
        department: 'Engineering',
        roleId: 'employee',
        role: 'Employee',
        status: 'Active',
        accountStatus: 'Active'
      });

      // Seed Documents
      await Document.create({
        id: 'DOC-PUB',
        name: 'Public Handbook',
        type: 'pdf',
        size: '1.2MB',
        category: 'Policies',
        uploadedBy: 'System Admin',
        uploadDate: '2026-06-30',
        fileUrl: 'http://imagekit.io/handbook.pdf',
        branch: '' // Empty branch means company-wide public
      });

      await Document.create({
        id: 'DOC-BR-JAIPUR',
        name: 'Jaipur Guidelines',
        type: 'docx',
        size: '500KB',
        category: 'Guidelines',
        uploadedBy: 'System Admin',
        uploadDate: '2026-06-30',
        fileUrl: 'http://imagekit.io/jaipur_guidelines.docx',
        branch: 'Jaipur Branch'
      });

      await Document.create({
        id: 'DOC-OWN-JOE',
        name: 'Joe Notes',
        type: 'txt',
        size: '10KB',
        category: 'Personal',
        uploadedBy: 'Developer Joe',
        uploadDate: '2026-06-30',
        fileUrl: 'http://imagekit.io/joe_notes.txt',
        branch: 'PRIVATE'
      });

      // Seed Projects
      await Project.create({
        id: 'PRJ-ENG-JOE',
        name: 'Joe Project',
        department: 'Engineering',
        branch: 'Jaipur Branch',
        manager: 'Manager Mike',
        leader: 'Leader Lee',
        members: ['Developer Joe'],
        startDate: '2026-06-01',
        deadline: '2026-06-30',
        budget: 50000
      });

      await Project.create({
        id: 'PRJ-ENG-SARAH',
        name: 'Sarah Project',
        department: 'Engineering',
        branch: 'Jaipur Branch',
        manager: 'Manager Mike',
        leader: 'Leader Lee',
        members: ['Developer Sarah'],
        startDate: '2026-06-01',
        deadline: '2026-06-30',
        budget: 75000
      });

      console.log('🌱 Seeded COMP-A Employees, Documents, and Projects.');
    });

    // ----------------------------------------
    // DOCUMENTS SECURITY TESTS
    // ----------------------------------------
    console.log('\n--- Running Documents Security Tests ---');

    // TC-DOC-01: Employee can read company-wide and own branch documents
    await runWithTenant('COMP-A', async () => {
      const docs = await documentsRepository.find({});
      assert(docs.some(d => d.id === 'DOC-PUB'), 'Should see public document');
      assert(docs.some(d => d.id === 'DOC-BR-JAIPUR'), 'Should see branch document');
      console.log('✅ Employee can read company-wide and own branch documents.');
    }, false, { id: 'EMP-A1', name: 'Developer Joe', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-DOC-02: Employee can read own uploaded document
    await runWithTenant('COMP-A', async () => {
      const doc = await documentsRepository.findOne('DOC-OWN-JOE');
      assert.strictEqual(doc.name, 'Joe Notes', 'Should load own uploaded document');
      console.log('✅ Employee can read own uploaded document.');
    }, false, { id: 'EMP-A1', name: 'Developer Joe', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-DOC-03: Employee cannot read other employee's private document
    await runWithTenant('COMP-A', async () => {
      try {
        await documentsRepository.findOne('DOC-OWN-JOE');
        assert.fail('Should block other employee from reading Joe Notes');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should reject with 403 Forbidden');
        console.log('✅ Employee blocked from reading another user\'s private document.');
      }
    }, false, { id: 'EMP-A2', name: 'Developer Sarah', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-DOC-04: Unauthorized update of document restricted fields blocked
    await runWithTenant('COMP-A', async () => {
      try {
        await documentsRepository.update('DOC-OWN-JOE', { fileUrl: 'http://hacked.com' });
        assert.fail('Employee should not be authorized to update fileUrl');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should reject with 403');
        console.log('✅ Blocked unauthorized update of restricted fileUrl.');
      }
    }, false, { id: 'EMP-A1', name: 'Developer Joe', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-DOC-05: Unauthorized delete blocked
    await runWithTenant('COMP-A', async () => {
      try {
        await documentsRepository.remove('DOC-BR-JAIPUR');
        assert.fail('Employee should not be allowed to delete branch guidelines');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should return 403');
        console.log('✅ Standard Employee blocked from deleting branch document.');
      }
    }, false, { id: 'EMP-A1', name: 'Developer Joe', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // ----------------------------------------
    // PROJECTS SECURITY TESTS
    // ----------------------------------------
    console.log('\n--- Running Projects Security Tests ---');

    // TC-PRJ-01: Employee can only see projects they are a member of
    await runWithTenant('COMP-A', async () => {
      const prjs = await projectsRepository.find({});
      assert.strictEqual(prjs.length, 1, 'Should only see one project');
      assert.strictEqual(prjs[0].id, 'PRJ-ENG-JOE', 'Should see project where Joe is member');
      console.log('✅ Employee project visibility limited to membership.');
    }, false, { id: 'EMP-A1', name: 'Developer Joe', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-PRJ-02: Employee cannot read other projects by ID (IDOR prevention)
    await runWithTenant('COMP-A', async () => {
      try {
        await projectsRepository.findOne('PRJ-ENG-SARAH');
        assert.fail('Should block Joe from reading Sarah\'s project');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should return 403');
        console.log('✅ Blocked unauthorized single-project retrieval.');
      }
    }, false, { id: 'EMP-A1', name: 'Developer Joe', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-PRJ-03: Employee cannot update restricted fields (budget, members)
    await runWithTenant('COMP-A', async () => {
      try {
        await projectsRepository.update('PRJ-ENG-JOE', { budget: 1000000 });
        assert.fail('Employee should be blocked from updating budget');
      } catch (err) {
        assert.strictEqual(err.statusCode, 403, 'Should reject budget update with 403');
        console.log('✅ Blocked employee from updating project budget.');
      }
    }, false, { id: 'EMP-A1', name: 'Developer Joe', role: 'employee', branch: 'Jaipur Branch', department: 'Engineering' });

    // TC-PRJ-04: Background syncDeptProjectStats runs successfully without context
    await runWithTenant('COMP-A', async () => {
      await projectsRepository.syncDeptProjectStats('COMP-A', ['Engineering']);
      console.log('✅ Background department stats sync runs successfully without user context.');
    });

  } catch (error) {
    console.error('❌ Documents & Projects Security Tests failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await runWithTenant('COMP-A', async () => {
      await Employee.deleteMany({});
      await Document.deleteMany({});
      await Project.deleteMany({});
      await Department.deleteMany({});
    });
    await database.disconnect();
    console.log('\n🎉 ALL DOCUMENTS & PROJECTS AUTHORIZATION TESTS COMPLETED SUCCESSFULLY!');
    process.exit(0);
  }
};

testDocumentsProjectsAuthorization();
