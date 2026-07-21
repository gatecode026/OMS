import useOfflineStore, { QueuedRequest } from '../offlineStore';
import secureStore from '../../services/secureStore';

jest.mock('../../services/secureStore', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  deleteItem: jest.fn(),
  setJson: jest.fn(() => Promise.resolve()),
  getJson: jest.fn(() => Promise.resolve([])),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockRequest: Omit<QueuedRequest, 'id' | 'timestamp'> = {
  url: '/api/v1/attendance/clock-in',
  method: 'POST',
  data: { time: '2026-07-20T10:00:00Z' },
  headers: { 'x-action-description': 'Clocking In' },
  description: 'Clocking In',
};

describe('offlineStore', () => {
  beforeEach(async () => {
    useOfflineStore.setState({
      isConnected: true,
      isInternetReachable: true,
      queue: [],
    });
    jest.clearAllMocks();
  });

  it('should initialize with default states', () => {
    const state = useOfflineStore.getState();
    expect(state.isConnected).toBe(true);
    expect(state.isInternetReachable).toBe(true);
    expect(state.queue).toEqual([]);
  });

  it('should update connection status', () => {
    const store = useOfflineStore.getState();
    store.setConnectionStatus(false, false);

    const state = useOfflineStore.getState();
    expect(state.isConnected).toBe(false);
    expect(state.isInternetReachable).toBe(false);
  });

  it('should add requests to queue with unique ID and timestamp', async () => {
    const store = useOfflineStore.getState();
    await store.addToQueue(mockRequest);

    const state = useOfflineStore.getState();
    expect(state.queue.length).toBe(1);
    expect(state.queue[0].url).toBe('/api/v1/attendance/clock-in');
    expect(state.queue[0].id).toBeDefined();
    expect(state.queue[0].timestamp).toBeLessThanOrEqual(Date.now());
    expect(secureStore.setJson).toHaveBeenCalledWith('offline_sync_queue', state.queue);
  });

  it('should remove request from queue by ID', async () => {
    const store = useOfflineStore.getState();
    await store.addToQueue(mockRequest);
    const addedId = useOfflineStore.getState().queue[0].id;

    await store.removeFromQueue(addedId);
    expect(useOfflineStore.getState().queue.length).toBe(0);
    expect(secureStore.setJson).toHaveBeenCalledTimes(2);
  });

  it('should clear queue completely', async () => {
    const store = useOfflineStore.getState();
    await store.addToQueue(mockRequest);
    await store.clearQueue();

    expect(useOfflineStore.getState().queue.length).toBe(0);
    expect(secureStore.deleteItem).toHaveBeenCalledWith('offline_sync_queue');
  });

  it('should load queue from secure storage', async () => {
    const storedQueue: QueuedRequest[] = [
      {
        id: 'req_123',
        url: '/api/v1/leaves/apply',
        method: 'POST',
        data: {},
        timestamp: 123456789,
        description: 'Applying Leave',
      },
    ];
    (secureStore.getJson as jest.Mock).mockResolvedValue(storedQueue);

    const store = useOfflineStore.getState();
    await store.loadQueue();

    expect(useOfflineStore.getState().queue).toEqual(storedQueue);
    expect(secureStore.getJson).toHaveBeenCalledWith('offline_sync_queue');
  });

  it('should load an empty queue if nothing is in secure storage', async () => {
    (secureStore.getJson as jest.Mock).mockResolvedValue(null);

    const store = useOfflineStore.getState();
    await store.loadQueue();

    expect(useOfflineStore.getState().queue).toEqual([]);
  });
});
