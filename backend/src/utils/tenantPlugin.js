import { getTenantId } from './tenantContext.js';

export const tenantPlugin = (schema) => {
  // Add companyId field if it doesn't already exist on the schema
  if (!schema.paths.companyId) {
    schema.add({
      companyId: {
        type: String,
        required: true,
        index: true
      }
    });
  }

  // Pre-save hook to automatically inject the companyId from context
  schema.pre('save', function (next) {
    const tenantId = getTenantId();
    if (tenantId && !this.companyId) {
      this.companyId = tenantId;
    }
    next();
  });

  // Query hooks to automatically filter queries by the companyId
  const autoFilter = function (next) {
    const tenantId = getTenantId();
    // Only apply filter if tenantId exists in context and is not bypassed
    const options = this.getOptions();
    if (tenantId && !options.bypassTenantScoping) {
      this.where({ companyId: tenantId });
    }
    next();
  };

  schema.pre('find', autoFilter);
  schema.pre('findOne', autoFilter);
  schema.pre('countDocuments', autoFilter);
  schema.pre('estimatedDocumentCount', autoFilter);
  schema.pre('updateOne', autoFilter);
  schema.pre('updateMany', autoFilter);
  schema.pre('deleteOne', autoFilter);
  schema.pre('deleteMany', autoFilter);
  schema.pre('findOneAndUpdate', autoFilter);
  schema.pre('findOneAndDelete', autoFilter);
  schema.pre('findOneAndRemove', autoFilter);
};
