/**
 * @file tests/roleMatrix.test.js
 * @description Unit tests for Role Guard middleware using node assert.
 */

import assert from 'assert';
import { checkRoleAccess } from '../src/middlewares/roleGuard.middleware.js';

// Mock response object helper
const mockResponse = () => {
  const res = {};
  res.status = (statusCode) => {
    res.statusCode = statusCode;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

// Mock request helper
const mockRequest = (role, path) => {
  return {
    user: {
      name: 'Test User',
      role: role
    },
    path: path
  };
};

const runTest = () => {
  console.log('--- Starting Role Matrix Middleware Tests ---');

  // Test 1: SuperAdmin blocked routes should return 403
  const superAdminBlocked = [
    '/api/employees/EMP-001',
    '/api/v1/tasks/TASK-123',
    '/api/attendance',
    '/api/leaves/apply',
    '/api/v1/payroll/generate',
    '/api/v1/projects',
    '/api/v1/performance/pips',
    '/api/v1/security/alerts',
    '/api/v1/settings',
    '/api/branches/list',
    '/api/teams',
    '/api/departments',
    '/api/workflows/run',
    '/api/announcements/all',
    '/api/events/calendar'
  ];

  for (const path of superAdminBlocked) {
    const req = mockRequest('super_admin', path);
    const res = mockResponse();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    checkRoleAccess(req, res, next);

    assert.strictEqual(res.statusCode, 403, `Path ${path} should be blocked for super_admin`);
    assert.strictEqual(nextCalled, false, `next() should not be called for blocked path ${path}`);
    assert.strictEqual(res.body.status, 'fail');
    assert.match(res.body.message, /Access denied/, `Error message should contain "Access denied"`);
  }
  console.log('✅ All SuperAdmin blocked routes successfully blocked with 403.');

  // Test 2: SuperAdmin allowed routes should call next()
  const superAdminAllowed = [
    '/api/admin/overview',
    '/api/auth/login',
    '/api/v1/companies',
    '/api/v1/admin/dashboard',
    '/api/v1/auth/me'
  ];

  for (const path of superAdminAllowed) {
    const req = mockRequest('super_admin', path);
    const res = mockResponse();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    checkRoleAccess(req, res, next);

    assert.strictEqual(nextCalled, true, `next() should be called for allowed path ${path}`);
    assert.strictEqual(res.statusCode, undefined, `res.status should not be called for allowed path ${path}`);
  }
  console.log('✅ All SuperAdmin allowed routes successfully allowed to pass.');

  // Test 3: CompanyAdmin allowed routes should call next()
  const companyAdminAllowed = [
    '/api/employees/EMP-001',
    '/api/v1/projects',
    '/api/attendance',
    '/api/leaves/apply'
  ];

  for (const path of companyAdminAllowed) {
    const req = mockRequest('company_admin', path);
    const res = mockResponse();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    checkRoleAccess(req, res, next);

    assert.strictEqual(nextCalled, true, `next() should be called for company_admin allowed path ${path}`);
  }
  console.log('✅ All CompanyAdmin allowed routes successfully allowed to pass.');

  // Test 4: CompanyAdmin blocked routes should return 403
  const companyAdminBlocked = [
    '/api/admin/overview',
    '/api/v1/admin/dashboard'
  ];

  for (const path of companyAdminBlocked) {
    const req = mockRequest('company_admin', path);
    const res = mockResponse();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    checkRoleAccess(req, res, next);

    assert.strictEqual(res.statusCode, 403, `Path ${path} should be blocked for company_admin`);
    assert.strictEqual(nextCalled, false, `next() should not be called for blocked path ${path}`);
  }
  console.log('✅ All CompanyAdmin blocked routes successfully blocked with 403.');

  console.log('🎉 All role matrix middleware tests passed successfully!');
};

runTest();
