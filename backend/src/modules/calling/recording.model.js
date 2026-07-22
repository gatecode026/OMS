import mongoose from 'mongoose';
import { tenantPlugin } from '../../utils/tenantPlugin.js';

const recordingAssetSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyId: { type: String, required: true, index: true },
  meetingId: { type: String, required: true, index: true },
  callerId: { type: String, required: true, index: true },
  callerName: { type: String, required: true },

  recordingType: {
    type: String,
    enum: ['audio', 'video', 'screen', 'full_package'],
    default: 'video'
  },
  status: {
    type: String,
    enum: ['recording', 'processing', 'ready', 'failed'],
    default: 'recording'
  },

  fileUrl: { type: String, default: null },
  storageProvider: {
    type: String,
    enum: ['s3', 'gcs', 'azure', 'minio', 'local'],
    default: 's3'
  },
  durationSeconds: { type: Number, default: 0 },
  fileSizeBytes: { type: Number, default: 0 },

  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null }
}, {
  timestamps: true,
  collection: 'media_recordings'
});

recordingAssetSchema.plugin(tenantPlugin);
const RecordingAsset = mongoose.model('RecordingAsset', recordingAssetSchema);
export default RecordingAsset;
