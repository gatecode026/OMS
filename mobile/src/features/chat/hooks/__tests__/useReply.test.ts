import { renderHook, act } from '@testing-library/react-native';
import { useReply } from '../useReply';

describe('useReply', () => {
  it('should initialize with null reply state and editing mode false', () => {
    const { result } = renderHook(() => useReply());
    expect(result.current.replyTo).toBeNull();
    expect(result.current.isEditingMode).toBe(false);
  });

  it('should toggle reply message state', () => {
    const { result } = renderHook(() => useReply());
    const mockMsg: any = { id: 'msg_1', senderName: 'Rahul', content: 'Hello' };

    act(() => {
      result.current.startReply(mockMsg);
    });

    expect(result.current.replyTo).toEqual(mockMsg);
    expect(result.current.isEditingMode).toBe(false);

    act(() => {
      result.current.clearReply();
    });

    expect(result.current.replyTo).toBeNull();
  });
});
