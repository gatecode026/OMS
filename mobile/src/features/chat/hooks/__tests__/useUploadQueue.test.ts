import { renderHook, act } from '@testing-library/react-native';
import { useUploadQueue } from '../useUploadQueue';

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => ({
    setQueryData: jest.fn(),
  })),
}));

describe('useUploadQueue', () => {
  it('should initialize and provide upload queue tracking states', () => {
    const setLocalMessages = jest.fn();
    const { result } = renderHook(() =>
      useUploadQueue({
        conversationId: 'conv_1',
        authUser: { id: 'user_1', name: 'Rahul' },
        setLocalMessages,
      })
    );

    expect(result.current.uploadsProgress).toEqual({});
    expect(result.current.uploadStates).toEqual({});
    expect(result.current.uploadFileDirect).toBeDefined();
    expect(result.current.cancelUpload).toBeDefined();
  });
});
