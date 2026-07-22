import crypto from 'crypto';
import RecordingAsset from './recording.model.js';
import { runWithTenant } from '../../database/tenantConnection.js';

export const recordingService = {
  /**
   * Start a new recording session
   */
  async startRecording(companyId, recordingData) {
    return await runWithTenant(companyId, async () => {
      const recording = await RecordingAsset.create({
        id: `rec-${Date.now()}`,
        companyId,
        startedAt: new Date(),
        status: 'recording',
        ...recordingData
      });
      return recording;
    });
  },

  /**
   * Stop and finalize recording session
   */
  async stopRecording(companyId, recordingId, extraStats = {}) {
    return await runWithTenant(companyId, async () => {
      const endedAt = new Date();
      const fileUrl = extraStats.fileUrl || `https://storage.company.oms/recordings/${recordingId}.mp4`;

      const recording = await RecordingAsset.findOneAndUpdate(
        { id: recordingId, companyId },
        {
          status: 'ready',
          endedAt,
          fileUrl,
          durationSeconds: extraStats.durationSeconds || 120,
          fileSizeBytes: extraStats.fileSizeBytes || 10485760
        },
        { new: true }
      );
      return recording;
    });
  },

  /**
   * Get all recordings for a tenant
   */
  async getRecordings(companyId) {
    return await runWithTenant(companyId, async () => {
      return await RecordingAsset.find({ companyId })
        .sort({ createdAt: -1 })
        .lean();
    });
  },

  /**
   * Generate temporary 1-hour signed playback URL
   */
  async generateSignedUrl(companyId, recordingId) {
    return await runWithTenant(companyId, async () => {
      const recording = await RecordingAsset.findOne({ id: recordingId, companyId }).lean();
      if (!recording || !recording.fileUrl) {
        throw new Error('Recording asset not found or not ready');
      }

      const expiresAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour token
      const tokenPayload = `${recordingId}:${companyId}:${expiresAt}`;
      const token = crypto
        .createHmac('sha256', process.env.JWT_SECRET || 'oms-secure-secret')
        .update(tokenPayload)
        .digest('hex');

      return {
        recordingId,
        playbackUrl: `${recording.fileUrl}?token=${token}&expires=${expiresAt}`,
        expiresAt: new Date(expiresAt * 1000).toISOString()
      };
    });
  }
};

export default recordingService;
