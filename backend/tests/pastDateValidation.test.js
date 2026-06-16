/**
 * @file tests/pastDateValidation.test.js
 * @description Unit tests verifying past date validation on leave requests.
 */

import assert from 'assert';
import { createSchema } from '../src/modules/leaves/leaves.validation.js';
import Leave from '../src/modules/leaves/leaves.model.js';

const runTest = () => {
  console.log('--- Starting Past Date Validation Tests ---');

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Calculate a past date string (e.g. yesterday)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Calculate a future date string (e.g. tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  console.log(`Today: ${todayStr} | Yesterday: ${yesterdayStr} | Tomorrow: ${tomorrowStr}`);

  // 1. Test backend validation schema (createSchema)
  const pastPayload = { fromDate: yesterdayStr };
  const pastResult = createSchema(pastPayload);
  assert.strictEqual(pastResult.isValid, false, 'Payload with yesterday start date should be invalid');
  assert.ok(pastResult.errors.includes('Start date cannot be before today'), 'Error array should contain past date message');

  const todayPayload = { fromDate: todayStr };
  const todayResult = createSchema(todayPayload);
  assert.strictEqual(todayResult.isValid, true, 'Payload with today start date should be valid');

  const futurePayload = { fromDate: tomorrowStr };
  const futureResult = createSchema(futurePayload);
  assert.strictEqual(futureResult.isValid, true, 'Payload with tomorrow start date should be valid');

  console.log('✅ Validation schema (createSchema) checks passed.');

  // 2. Test Mongoose model schema validator
  const fromDatePath = Leave.schema.path('fromDate');
  const userValidator = fromDatePath.validators.find(v => v.type === 'user defined').validator;

  // Case A: New request with past date should fail
  const resPast = userValidator.call({ isPolicy: false, isNew: true }, yesterdayStr);
  assert.strictEqual(resPast, false, 'Mongoose validator should reject past date for a new request');

  // Case B: New request with today date should pass
  const resToday = userValidator.call({ isPolicy: false, isNew: true }, todayStr);
  assert.strictEqual(resToday, true, 'Mongoose validator should accept today date for a new request');

  // Case C: New request with future date should pass
  const resFuture = userValidator.call({ isPolicy: false, isNew: true }, tomorrowStr);
  assert.strictEqual(resFuture, true, 'Mongoose validator should accept future date for a new request');

  // Case D: Exists/Old request (isNew: false) with past date should pass (to allow legacy data updates)
  const resOldPast = userValidator.call({ isPolicy: false, isNew: false }, yesterdayStr);
  assert.strictEqual(resOldPast, true, 'Mongoose validator should allow past date for an existing request');

  // Case E: Policy (isPolicy: true) should pass regardless of date
  const resPolicyPast = userValidator.call({ isPolicy: true, isNew: true }, yesterdayStr);
  assert.strictEqual(resPolicyPast, true, 'Mongoose validator should allow past date for a policy');

  console.log('✅ Mongoose model validator checks passed.');
  console.log('🎉 All past date validation tests passed successfully!');
};

runTest();
