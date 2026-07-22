/**
 * @file callAnalytics.ts
 * @description Enterprise telemetry & diagnostics for monitoring call setup latency,
 *              packet loss, RTT, bitrate, and ICE connection states.
 */

export interface CallTelemetryData {
  callId: string;
  durationSeconds: number;
  setupTimeMs?: number;
  iceState: string;
  rttMs?: number;
  packetLossPercent?: number;
  quality: string;
}

export const callAnalytics = {
  logCallStart(callId: string, callType: string) {
    if (__DEV__) {
      console.log(`[CallAnalytics] 🚀 Call Started: ${callId} (${callType})`);
    }
  },

  logCallConnected(callId: string, setupTimeMs: number) {
    if (__DEV__) {
      console.log(`[CallAnalytics] ✅ Call Connected: ${callId} in ${setupTimeMs}ms`);
    }
  },

  logCallQuality(callId: string, quality: string, rttMs?: number, packetLoss?: number) {
    if (__DEV__) {
      console.log(`[CallAnalytics] 📊 Call Quality [${quality}] RTT: ${rttMs ?? 'N/A'}ms Loss: ${packetLoss ?? 0}%`);
    }
  },

  logCallEnd(telemetry: CallTelemetryData) {
    if (__DEV__) {
      console.log(`[CallAnalytics] 🏁 Call Ended: ${telemetry.callId} Duration: ${telemetry.durationSeconds}s State: ${telemetry.iceState}`);
    }
  },
};

export default callAnalytics;
