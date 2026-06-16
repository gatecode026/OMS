/**
 * @file tests/managerLeaves.test.js
 * @description Integration unit test verifying role permission middleware allows manager leaves requests.
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
      name: 'Test Manager',
      role: role
    },
    path: path
  };
};

const runTest = () => {
  console.log('--- Starting Manager Leaves Permission Tests ---');

  // Test 1: Manager requests to leaves API should be allowed (i.e. checkRoleAccess should call next())
  const managerRoutes = [
    '/api/v1/leaves',
    '/api/v1/leaves/LR-123',
    '/api/v1/leaves/policies'
  ];

  for (const path of managerRoutes) {
    const req = mockRequest('manager', path);
    const res = mockResponse();
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    checkRoleAccess(req, res, next);

    assert.strictEqual(nextCalled, true, `next() should be called for manager path ${path}`);
    assert.strictEqual(res.statusCode, undefined, `res.status should not be called for path ${path}`);
  }
  console.log('✅ All Manager leaves routes successfully allowed.');

  console.log('🎉 All manager leaves tests passed successfully!');
};

runTest();
