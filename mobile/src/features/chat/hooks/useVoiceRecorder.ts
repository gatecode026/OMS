import { useState, useRef, useEffect } from 'react';
import { useAudioRecorder, requestRecordingPermissionsAsync, setAudioModeAsync, RecordingPresets } from 'expo-audio';
import { getSocket } from '../../../shared/services/socketManager';
import { toast } from '../../../shared/components/Toast';

export const useVoiceRecorder = (conversationId: string, onSendAudio: (uri: string, name: string, duration: number) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingLocked, setRecordingLocked] = useState(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const startRecording = async () => {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        toast.error('Microphone access is required.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingLocked(false);

      const socket = getSocket();
      socket.emit('typing:start', { conversationId, isRecording: true });

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.log('Start recording error:', err);
      toast.error('Failed to initialize microphone');
    }
  };

  const stopAndSendRecording = async () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
    setRecordingLocked(false);

    const socket = getSocket();
    socket.emit('typing:stop', { conversationId });

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        const fileName = `voice_${Date.now()}.m4a`;
        onSendAudio(uri, fileName, recordingDuration);
      }
    } catch (err) {
      console.log('Stop recording error:', err);
    }
  };

  const cancelRecording = async () => {
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
    setRecordingLocked(false);
    
    const socket = getSocket();
    socket.emit('typing:stop', { conversationId });

    try {
      await audioRecorder.stop();
    } catch (e) {}
    toast.info('Recording discarded');
  };

  const lockRecording = () => {
    setRecordingLocked(true);
  };

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, []);

  return {
    isRecording,
    recordingDuration,
    recordingLocked,
    startRecording,
    stopAndSendRecording,
    cancelRecording,
    lockRecording,
  };
};

export default useVoiceRecorder;
