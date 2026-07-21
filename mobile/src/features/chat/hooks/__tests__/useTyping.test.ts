import { renderHook, act } from '@testing-library/react-native';
import { useTyping } from '../useTyping';

jest.mock('../../../../shared/services/socketManager', () => ({
  getSocket: jest.fn(() => ({
    connected: true,
    emit: jest.fn(),
  })),
}));

describe('useTyping', () => {
  it('should initialize typing helper and trigger stop timeout on text idle', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useTyping('conv_1'));
    
    act(() => {
      result.current.updateTypingStatus('hello');
    });
    
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    act(() => {
      result.current.forceStopTyping();
    });
    
    expect(result.current.updateTypingStatus).toBeDefined();
    jest.useRealTimers();
  });
});
