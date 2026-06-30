export class ConversationQueryBuilder {
  constructor(securityContext) {
    this.context = securityContext;
  }

  buildReadQuery(incomingQuery = {}) {
    const filters = { ...incomingQuery };

    if (!this.context) return filters;

    // Super Admin & Company Admin are unscoped
    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    // Branch Admin & Branch Manager: see branch group chats OR chats they participate in
    if (this.context.role === 'branch_admin' || this.context.role === 'branch_manager' || this.context.role === 'manager') {
      const orConditions = [
        { 'participants.employeeId': this.context.userId }
      ];
      if (this.context.branch) {
        orConditions.push({ branch: this.context.branch });
      }
      filters.$or = orConditions;
      return filters;
    }

    // Standard employee / Team Leader: must be a participant
    filters['participants.employeeId'] = this.context.userId;

    return filters;
  }

  buildWriteQuery(id) {
    const filters = { id };

    if (!this.context) return filters;

    // Super Admin & Company Admin are unscoped
    if (this.context.isSuperAdmin || this.context.isCompanyAdmin) {
      return filters;
    }

    // Others: must be a participant to write/update/delete
    filters['participants.employeeId'] = this.context.userId;

    return filters;
  }
}

export default ConversationQueryBuilder;
