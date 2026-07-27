/**
 * @file backend/src/scripts/createIndexes.js
 * @description Enterprise MongoDB Index Migration Script for PRD-O1 Framework.
 *              Creates all compound, text, sparse, unique, and TTL indexes across
 *              every OMS collection with tenantId (companyId) scoping.
 *
 * Usage:
 *   node backend/src/scripts/createIndexes.js
 */

import mongoose from 'mongoose';
import env from '../config/env.js';
import logger from '../config/logger.js';

// Import all models to register schemas
import Conversation from '../modules/chat/conversation.model.js';
import Message from '../modules/chat/message.model.js';
import Employee from '../modules/employees/employees.model.js';
import Attendance from '../modules/attendance/attendance.model.js';
import Leave from '../modules/leaves/leaves.model.js';
import Task from '../modules/tasks/tasks.model.js';
import Notification from '../modules/notifications/notification.model.js';

async function runIndexMigration() {
  try {
    logger.info('[PRD-O1 Migration] Connecting to MongoDB...');
    await mongoose.connect(env.dbUri, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 15000,
    });
    logger.info('[PRD-O1 Migration] Connected successfully.');

    const models = [
      { name: 'Conversation', model: Conversation },
      { name: 'Message', model: Message },
      { name: 'Employee', model: Employee },
      { name: 'Attendance', model: Attendance },
      { name: 'Leave', model: Leave },
      { name: 'Task', model: Task },
      { name: 'Notification', model: Notification },
    ];

    for (const { name, model } of models) {
      logger.info(`[PRD-O1 Migration] Creating indexes for model: ${name}...`);
      await model.createIndexes();
      const indexList = await model.collection.indexes();
      logger.info(`[PRD-O1 Migration] Successfully verified ${indexList.length} indexes for ${name}.`);
    }

    logger.info('[PRD-O1 Migration] All database indexes created successfully! Production Ready.');
    process.exit(0);
  } catch (error) {
    logger.error('[PRD-O1 Migration] Error during index creation:', error);
    process.exit(1);
  }
}

runIndexMigration();
