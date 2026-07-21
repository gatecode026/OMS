import { renderHook, act } from '@testing-library/react-native';
import { useVoiceRecorder } from '../useVoiceRecorder';

describe('useVoiceRecorder', () => {
  it('should initialize and provide recording action controls', () => {
    const onSendAudio = jest.fn();
    const { result } = renderHook(() =>
      useVoiceRecorder('conv_1', onSendAudio)
    );

    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordingDuration).toBe(0);
    expect(result.current.recordingLocked).toBe(false);
    expect(result.current.startRecording).toBeDefined();
    expect(result.current.stopAndSendRecording).toBeDefined();
    expect(result.current.cancelRecording).toBeDefined();
  });
});
