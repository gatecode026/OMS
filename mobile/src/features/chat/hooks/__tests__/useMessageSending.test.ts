import { renderHook, act } from '@testing-library/react-native';
import { useMessageSending } from '../useMessageSending';

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => ({
    setQueryData: jest.fn(),
  })),
}));

jest.mock('../useChat', () => ({
  useEditMessage: jest.fn(() => ({ mutate: jest.fn() })),
  useDeleteMessage: jest.fn(() => ({ mutate: jest.fn() })),
}));

describe('useMessageSending', () => {
  it('should initialize and provide send action handlers', () => {
    const setLocalMessages = jest.fn();
    const { result } = renderHook(() =>
      useMessageSending({
        conversationId: 'conv_1',
        authUser: { id: 'user_1', name: 'Rahul' },
        setLocalMessages,
      })
    );

    expect(result.current.handleSend).toBeDefined();
    expect(result.current.handleRetrySend).toBeDefined();
    expect(result.current.handleDeleteMessage).toBeDefined();
  });
});
