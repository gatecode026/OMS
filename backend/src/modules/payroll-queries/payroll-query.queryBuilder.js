import Employee from '../employees/employees.model.js';

export class PayrollQueryBuilder {
  constructor(securityContext) {
    this.context = securityContext;
  }

  async buildQuery(incomingQuery = {}) {
    const filters = { ...incomingQuery };

    if (!this.context) return filters;

    // Super Admin / Company Admin see everything
    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    // Standard employee: strictly own records
    if (this.context.role === 'employee' || this.context.isEmployee) {
      filters.employeeId = this.context.userId;
      return filters;
    }

    // HR Manager / Finance Manager: company-wide calculations (unscoped)
    const roleLower = (this.context.role || '').toLowerCase();
    if (
      roleLower === 'hr_manager' || 
      roleLower === 'finance_manager' || 
      roleLower.includes('hr') || 
      roleLower.includes('finance')
    ) {
      return filters;
    }

    // Branch Manager / Branch Admin
    if (roleLower === 'branch_manager' || roleLower === 'manager' || roleLower === 'branch_admin') {
      if (this.context.branch) {
        const emps = await Employee.find({ branch: this.context.branch }).select('id').lean();
        const empIds = emps.map(e => e.id);
        filters.employeeId = { $in: empIds };
      }
      return filters;
    }

    // Department Manager
    if (this.context.role === 'department_manager' || this.context.role === 'dept_admin') {
      const criteria = {};
      if (this.context.branch) criteria.branch = this.context.branch;
      if (this.context.department) criteria.department = this.context.department;
      
      const emps = await Employee.find(criteria).select('id').lean();
      const empIds = emps.map(e => e.id);
      filters.employeeId = { $in: empIds };
      return filters;
    }

    // Default fallback (block)
    filters.employeeId = 'NONE';
    return filters;
  }
}

export default PayrollQueryBuilder;
