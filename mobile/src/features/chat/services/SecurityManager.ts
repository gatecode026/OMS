/**
 * @file SecurityManager.ts
 * @description Master Security Facade enforcing Multi-Tenant Isolation (`x-tenant-id`),
 *              Role-Based Access Control (RBAC), Session Protection, and Threat Detection.
 */

import SessionManager from './SessionManager';
import EncryptionManager from './EncryptionManager';
import AuditManager from './AuditManager';

export class SecurityManagerClass {
  /**
   * Enforce Multi-Tenant Isolation — throws exception if companyId mismatches user company
   */
  validateTenantIsolation(targetCompanyId: string, currentCompanyId: string): void {
    if (!targetCompanyId || !currentCompanyId || targetCompanyId !== currentCompanyId) {
      AuditManager.logEvent('PERMISSION_DENIED', 'unknown', currentCompanyId, {
        reason: 'Cross-Tenant Violation Attempt',
        targetCompanyId,
      });
      throw new Error('Security Exception: Cross-tenant data access is strictly prohibited.');
    }
  }

  /**
   * Enforce Role-Based Access Control (RBAC)
   */
  validateRBAC(userRole: string, requiredPermission: 'delete_any' | 'edit_own' | 'manage_group' | 'export_audit'): boolean {
    const isSuperAdmin = userRole === 'Super Admin';
    const isCompanyAdmin = userRole === 'Company Admin';
    const isManager = userRole === 'Manager';

    switch (requiredPermission) {
      case 'delete_any':
        return isSuperAdmin || isCompanyAdmin;
      case 'manage_group':
        return isSuperAdmin || isCompanyAdmin || isManager;
      case 'export_audit':
        return isSuperAdmin || isCompanyAdmin;
      case 'edit_own':
      default:
        return true;
    }
  }
}

export const SecurityManager = new SecurityManagerClass();
export default SecurityManager;
