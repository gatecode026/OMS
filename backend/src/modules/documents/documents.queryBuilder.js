import { getStore } from '../../utils/tenantContext.js';

export class DocumentsQueryBuilder {
  constructor(securityContext) {
    this.context = securityContext;
  }

  buildReadQuery(incomingQuery = {}) {
    const filters = { ...incomingQuery };

    if (!this.context) return filters;

    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    const store = getStore();
    const userName = store?.user?.name || '';

    // Branch Admin / Manager
    if (this.context.role === 'branch_admin' || this.context.role === 'branch_manager' || this.context.role === 'manager') {
      if (this.context.branch) {
        filters.$or = [
          { branch: this.context.branch },
          { branch: { $exists: false } },
          { branch: '' },
          { branch: null }
        ];
      }
      return filters;
    }

    // Department Manager
    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      if (this.context.branch) {
        filters.$or = [
          { branch: this.context.branch },
          { branch: { $exists: false } },
          { branch: '' },
          { branch: null }
        ];
      }
      return filters;
    }

    // Team Leader / Employee: company-wide public documents, branch documents, own uploads
    const orStages = [
      { uploadedBy: userName },
      { branch: { $exists: false } },
      { branch: '' },
      { branch: null }
    ];
    if (this.context.branch) {
      orStages.push({ branch: this.context.branch });
    }
    filters.$or = orStages;

    return filters;
  }

  buildWriteQuery(id) {
    const filters = { id };

    if (!this.context) return filters;

    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    const store = getStore();
    const userName = store?.user?.name || '';

    // Branch Admin / Manager
    if (this.context.role === 'branch_admin' || this.context.role === 'branch_manager' || this.context.role === 'manager') {
      if (this.context.branch) {
        filters.$or = [
          { branch: this.context.branch },
          { branch: { $exists: false } },
          { branch: '' },
          { branch: null }
        ];
      }
      return filters;
    }

    // Department Manager
    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      if (this.context.branch) {
        filters.$or = [
          { branch: this.context.branch },
          { branch: { $exists: false } },
          { branch: '' },
          { branch: null }
        ];
      }
      return filters;
    }

    // Team Leader / Employee: own uploads only
    filters.uploadedBy = userName;
    return filters;
  }
}

export default DocumentsQueryBuilder;
