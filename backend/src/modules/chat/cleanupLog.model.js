import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const cleanupLogSchema = new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  runDate: { type: Date, default: Date.now, index: true },
  filesAnalyzed: { type: Number, default: 0 },
  orphanFilesFound: { type: Number, default: 0 },
  filesDeleted: { type: Number, default: 0 },
  spaceReclaimed: { type: Number, default: 0 }, // in bytes
  status: { type: String, enum: ['success', 'failed'], default: 'success' },
  error: { type: String, default: null }
}, {
  timestamps: true,
  collection: 'imagekit_cleanup_logs'
});

cleanupLogSchema.plugin(tenantPlugin);
const ImageKitCleanupLog = mongoose.model('ImageKitCleanupLog', cleanupLogSchema);
export default ImageKitCleanupLog;
