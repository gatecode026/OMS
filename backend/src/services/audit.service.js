/**
 * @file src/services/audit.service.js
 * @description Centralized audit logging service storing structured audit events in files and MongoDB tenant contexts.
 */

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import logger from '../config/logger.js';
import { runWithTenant, getTenantId } from '../utils/tenantContext.js';
import { generateCompanyUniqueId } from '../utils/idGenerator.js';

// Absolute path to logs directory in the workspace
const LOGS_DIR = path.resolve(process.cwd(), 'logs');
const AUDIT_LOG_FILE = path.join(LOGS_DIR, 'audit.json');

// Ensure the logs directory exists
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (err) {
  console.error(`[Audit] Failed to create logs directory: ${err.message}`);
}

/**
 * Log a structured audit event.
 * Writes to a local JSON log file and to Mongoose ActivityLog collection (if database is connected and companyId is provided).
 * @param {Object} eventDetails - Audit event data
 * @param {String} [eventDetails.userId] - The user initiating the action
 * @param {String} [eventDetails.companyId] - The company context
 * @param {String} [eventDetails.action] - Action description
 * @param {String} [eventDetails.status] - Status (success, fail, error)
 * @param {String} [eventDetails.ip] - IP address
 * @param {String} [eventDetails.correlationId] - Correlation/Request tracking ID
 * @param {Object} [eventDetails.metadata] - Extra context/fields changed
 */
export const logAuditEvent = async ({
  userId = 'system',
  companyId,
  action,
  status = 'success',
  ip = '127.0.0.1',
  correlationId,
  metadata = {}
}) => {
  const activeCompanyId = companyId || getTenantId() || 'COMP-SYSTEM';
  const timestamp = new Date().toISOString();
  
  // Format log record
  const logRecord = {
    timestamp,
    userId,
    companyId: activeCompanyId,
    action,
    status,
    ip,
    correlationId: correlationId || global._activeCorrelationId || 'n/a',
    metadata
  };

  // 1. Log to console using extended SECURITY/AUDIT logger formats
  const formattedMsg = `[AUDIT] action="${action}" status=${status} user=${userId} company=${activeCompanyId} ip=${ip} correlationId=${logRecord.correlationId}`;
  if (status === 'fail' || status === 'error') {
    logger.warn(formattedMsg, metadata);
  } else {
    logger.info(formattedMsg, metadata);
  }

  // 2. Append to local audit.json file
  try {
    fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(logRecord) + '\n', 'utf8');
  } catch (err) {
    logger.error(`[Audit] Failed to write to audit.json: ${err.message}`);
  }

  // 3. Write to MongoDB ActivityLog collection (tenant-scoped)
  if (mongoose.connection.readyState === 1 && activeCompanyId && !activeCompanyId.startsWith('COMP-SYSTEM')) {
    try {
      await runWithTenant(activeCompanyId, async () => {
        const ActivityLog = mongoose.model('ActivityLog');
        const logId = await generateCompanyUniqueId(activeCompanyId, 'activity_logs');
        
        await ActivityLog.create({
          id: logId,
          timestamp,
          actor: userId,
          actionType: action,
          fieldChanged: metadata.fieldChanged || '—',
          oldValue: metadata.oldValue ? JSON.stringify(metadata.oldValue) : '—',
          newValue: metadata.newValue ? JSON.stringify(metadata.newValue) : '—',
          ip
        });
      });
    } catch (dbErr) {
      // Log db logging failure, but do not throw (ensure resiliency)
      logger.warn(`[Audit] Failed to write audit log to MongoDB for tenant ${activeCompanyId}: ${dbErr.message}`);
    }
  }
};

export default {
  logAuditEvent
};
