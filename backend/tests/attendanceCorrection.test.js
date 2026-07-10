/**
 * @file tests/attendanceCorrection.test.js
 * @description Integration and unit tests for the Attendance Correction & Approval Management System.
 */

import assert from 'assert';
import mongoose from 'mongoose';
import database from '../src/config/database.js';
import { createSchema } from '../src/modules/attendance-corrections/attendance-correction.validation.js';
import service from '../src/modules/attendance-corrections/attendance-correction.service.js';
import AttendanceCorrection from '../src/modules/attendance-corrections/attendance-correction.model.js';

const runTests = async () => {
  console.log('--- Starting Attendance Correction Validation & Unit Tests ---');

  // Test 1: Validation schema checks
  const invalidPayload = { date: '' };
  const resInvalid = createSchema(invalidPayload);
  assert.strictEqual(resInvalid.isValid, false, 'Validation should fail for empty date');
  assert.ok(resInvalid.errors.includes('Date is required'), 'Date is required error should be present');

  const validPayload = {
    date: '2026-07-09',
    correctionType: 'Missing Punch Out',
    requestedPunchIn: '09:30',
    requestedPunchOut: '18:00',
    requestedStatus: 'Present',
    reason: 'Forgot to punch out'
  };
  const resValid = createSchema(validPayload);
  assert.strictEqual(resValid.isValid, true, 'Validation should succeed for valid request details');
  console.log('✅ Validation schema checks passed.');

  // Test 2: Database and Service checks
  try {
    await database.connect();
    console.log('🔌 Connected to MongoDB.');

    // Cleanup any lingering mock tests
    await AttendanceCorrection.deleteMany({ employeeId: 'TEST-EMP-999' });

    // Mock User Context
    const mockUser = {
      id: 'TEST-EMP-999',
      name: 'Test Employee',
      role: 'employee',
      companyId: 'COMP-OMS-TEST',
      department: 'Engineering',
      branch: 'Head Office'
    };

    // Try future date validation
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const futureStr = futureDate.toISOString().split('T')[0];

    try {
      await service.createRequest({ ...validPayload, date: futureStr }, mockUser);
      assert.fail('Should fail on future date request');
    } catch (err) {
      assert.strictEqual(err.message, 'Cannot request attendance correction for future dates.', 'Error message must match');
      console.log('✅ Future date restriction check passed.');
    }

    // Try a valid request
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const req = await service.createRequest({
      ...validPayload,
      date: yesterdayStr
    }, mockUser);

    assert.ok(req, 'Record creation should return saved request');
    assert.strictEqual(req.employeeId, 'TEST-EMP-999', 'Employee ID should match the mock context');
    assert.strictEqual(req.status, 'Pending', 'Initial request state must be Pending');
    console.log('✅ Creating pending request passed.');

    // Try duplicate request validation
    try {
      await service.createRequest({
        ...validPayload,
        date: yesterdayStr
      }, mockUser);
      assert.fail('Should fail on duplicate request');
    } catch (err) {
      assert.strictEqual(err.message, 'A pending correction request already exists for this date.');
      console.log('✅ Duplicate pending request check passed.');
    }

    // Mock Approver and Approve
    const mockApprover = {
      id: 'TEST-APPROVER-111',
      name: 'HR Approver',
      role: 'company_admin',
      companyId: 'COMP-OMS-TEST'
    };

    const approvedReq = await service.approveRequest(req.id, 'Approved by test script', mockApprover);
    assert.strictEqual(approvedReq.status, 'Approved', 'Status must be updated to Approved');
    assert.strictEqual(approvedReq.approvedBy, 'HR Approver', 'Approver name should match actor');
    console.log('✅ Processing approval and recalculations passed.');

    // Clean up
    await AttendanceCorrection.deleteMany({ employeeId: 'TEST-EMP-999' });

  } catch (err) {
    console.error('❌ Test execution failed:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 DB connection closed.');
  }

  console.log('🎉 All Attendance Correction tests passed successfully!');
};

runTests();
