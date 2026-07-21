import { useRef } from 'react';

export const useChatAnalytics = () => {
  const uploadStartTimesRef = useRef<Record<string, number>>({});

  const trackEvent = (eventName: string, params?: Record<string, any>) => {
    console.log(`[Analytics] ${eventName}:`, params || {});
  };

  const trackMessageSent = (type: string, size?: number) => {
    trackEvent('message_sent', { type, size });
  };

  const trackMessageFailed = (reason: string) => {
    trackEvent('message_failed', { reason });
  };

  const startMediaUpload = (tempId: string) => {
    uploadStartTimesRef.current[tempId] = Date.now();
  };

  const finishMediaUpload = (tempId: string, success: boolean) => {
    const start = uploadStartTimesRef.current[tempId];
    if (start) {
      const durationMs = Date.now() - start;
      trackEvent('media_upload', { success, durationMs });
      delete uploadStartTimesRef.current[tempId];
    }
  };

  const trackCallStarted = (callType: 'audio' | 'video', conversationId: string) => {
    trackEvent('call_started', { callType, conversationId });
  };

  const trackCallEnded = (conversationId: string, durationSecs: number) => {
    trackEvent('call_ended', { conversationId, durationSecs });
  };

  const trackSearchUsage = (queryLength: number) => {
    trackEvent('search_usage', { queryLength });
  };

  return {
    trackMessageSent,
    trackMessageFailed,
    startMediaUpload,
    finishMediaUpload,
    trackCallStarted,
    trackCallEnded,
    trackSearchUsage,
  };
};

export default useChatAnalytics;
