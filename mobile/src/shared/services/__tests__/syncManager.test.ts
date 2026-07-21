import syncManager from '../syncManager';
import apiClient from '../apiClient';
import { useOfflineStore } from '../../store/offlineStore';
import { queryClient } from '../../api/queryClient';

jest.mock('../apiClient', () => jest.fn());

jest.mock('../../store/offlineStore', () => ({
  useOfflineStore: {
    getState: jest.fn(() => ({
      isConnected: true,
      queue: [],
      removeFromQueue: jest.fn(() => Promise.resolve()),
    })),
  },
}));

jest.mock('../../api/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));

describe('syncManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process queue requests sequentially and remove them on success', async () => {
    const mockRemoveFromQueue = jest.fn(() => Promise.resolve());
    const mockQueue = [
      { id: '1', url: '/api/v1/attendance/clock-in', method: 'POST', data: {}, timestamp: 100 },
      { id: '2', url: '/api/v1/profile', method: 'PATCH', data: {}, timestamp: 200 },
    ];

    (useOfflineStore.getState as jest.Mock).mockReturnValue({
      isConnected: true,
      queue: mockQueue,
      removeFromQueue: mockRemoveFromQueue,
    });

    (apiClient as jest.Mock).mockResolvedValue({ status: 200 });

    await syncManager.sync();

    expect(apiClient).toHaveBeenCalledTimes(2);
    expect(mockRemoveFromQueue).toHaveBeenCalledWith('1');
    expect(mockRemoveFromQueue).toHaveBeenCalledWith('2');
    expect(queryClient.invalidateQueries).toHaveBeenCalled();
  });

  it('should discard client errors (400) and continue, but stop on server errors (500)', async () => {
    const mockRemoveFromQueue = jest.fn(() => Promise.resolve());
    const mockQueue = [
      { id: '1', url: '/api/v1/attendance/clock-in', method: 'POST', data: {}, timestamp: 100 },
      { id: '2', url: '/api/v1/profile', method: 'PATCH', data: {}, timestamp: 200 },
    ];

    (useOfflineStore.getState as jest.Mock).mockReturnValue({
      isConnected: true,
      queue: mockQueue,
      removeFromQueue: mockRemoveFromQueue,
    });

    (apiClient as jest.Mock)
      .mockRejectedValueOnce({ statusCode: 400 }) // Client error -> discard
      .mockRejectedValueOnce({ statusCode: 500 }); // Server error -> halt

    await syncManager.sync();

    expect(apiClient).toHaveBeenCalledTimes(2);
    expect(mockRemoveFromQueue).toHaveBeenCalledWith('1');
    expect(mockRemoveFromQueue).not.toHaveBeenCalledWith('2'); // Server error remains in queue
  });
});
