import logger from '../config/logger.js';

// Configuration for SIEM / external audit retention providers
const retentionProviders = new Map();

/**
 * Registers an external logging provider (e.g. Splunk, ELK) for audit retention.
 * @param {String} name - Provider identifier
 * @param {Function} providerFn - Async callback invoked with structured log payload
 */
export const registerRetentionProvider = (name, providerFn) => {
  retentionProviders.set(name, providerFn);
};

/**
 * Structured Enterprise Audit Logger.
 * Formats, outputs, and ships security-relevant authorization events.
 */
export const logSecurityEvent = (context, repository, operation, eventType, decision, reason, targetId = 'n/a', additional = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    companyId: context?.companyId || 'n/a',
    userId: context?.userId || 'n/a',
    role: context?.role || 'n/a',
    branch: context?.branch || 'n/a',
    department: context?.department || 'n/a',
    repository,
    operation,
    eventType,
    decision,
    reason,
    targetResourceId: targetId,
    correlationId: additional.correlationId || 'n/a'
  };

  // Safely stringify details without logging sensitive fields
  const message = `[AUDIT] decision=${decision} event=${eventType} repo=${repository} op=${operation} user=${payload.userId} role=${payload.role} target=${targetId} reason="${reason}"`;

  // Output to standard logging infrastructure
  if (decision === 'ALLOWED') {
    logger.audit(message, JSON.stringify(payload));
  } else {
    logger.security(message, JSON.stringify(payload));
  }

  // Ship log to registered SIEM/retention providers asynchronously
  for (const [name, shipFn] of retentionProviders.entries()) {
    shipFn(payload).catch(err => {
      logger.error(`AuditLogger::SIEM shipping failed for provider "${name}":`, err.message);
    });
  }

  return payload;
};

export default {
  logSecurityEvent,
  registerRetentionProvider
};
