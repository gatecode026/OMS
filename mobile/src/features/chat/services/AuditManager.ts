/**
 * @file AuditManager.ts
 * @description Security Audit Trail Logger for tracking sensitive operations:
 *              Logins, Logouts, Message Deletions, Media Uploads/Downloads,
 *              Permission Violations, and Call Actions.
 */

export interface SecurityAuditEvent {
  id: string;
  eventType: 'LOGIN' | 'LOGOUT' | 'MESSAGE_DELETE' | 'MEDIA_UPLOAD' | 'MEDIA_DOWNLOAD' | 'PERMISSION_DENIED' | 'CALL_ACTION';
  userId: string;
  companyId: string;
  timestamp: string;
  details: Record<string, any>;
}

export class AuditManagerClass {
  private auditLogs: SecurityAuditEvent[] = [];

  /**
   * Log a security event to local audit store
   */
  logEvent(
    eventType: SecurityAuditEvent['eventType'],
    userId: string,
    companyId: string,
    details: Record<string, any> = {}
  ): void {
    const event: SecurityAuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      eventType,
      userId,
      companyId,
      timestamp: new Date().toISOString(),
      details,
    };

    this.auditLogs.push(event);
    console.log(`[AuditManager] Security Event [${eventType}]:`, event);
  }

  /**
   * Get audit log history
   */
  getAuditLogs(): SecurityAuditEvent[] {
    return [...this.auditLogs];
  }
}

export const AuditManager = new AuditManagerClass();
export default AuditManager;
