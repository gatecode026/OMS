import apiClient from '../apiClient';
import useAuthStore from '../../store/authStore';
import useOfflineStore from '../../store/offlineStore';

jest.mock('../../store/authStore', () => ({
  getState: jest.fn(() => ({
    token: null,
    companyId: null,
    user: null,
    login: jest.fn(),
  })),
}));

jest.mock('../../store/offlineStore', () => ({
  getState: jest.fn(() => ({
    isConnected: true,
    addToQueue: jest.fn(() => Promise.resolve()),
  })),
}));

describe('apiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should inject Auth token and Tenant ID when they are available', async () => {
    (useAuthStore.getState as jest.Mock).mockReturnValue({
      token: 'test-jwt-token',
      companyId: 'COMP-ACME',
    });

    const mockConfig = {
      headers: {},
      url: '/test',
      method: 'get',
    };

    const requestInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    const config = await requestInterceptor(mockConfig);

    expect(config.headers['Authorization']).toBe('Bearer test-jwt-token');
    expect(config.headers['x-tenant-id']).toBe('COMP-ACME');
  });

  it('should queue mutating requests when the device is offline', async () => {
    const mockAddToQueue = jest.fn(() => Promise.resolve());
    (useOfflineStore.getState as jest.Mock).mockReturnValue({
      isConnected: false,
      addToQueue: mockAddToQueue,
    });

    const mockConfig = {
      headers: { 'x-action-description': 'Clocking In' },
      url: '/api/v1/attendance/clock-in',
      method: 'post',
      data: { status: 'in' },
    };

    const requestInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    
    await expect(requestInterceptor(mockConfig)).rejects.toEqual(
      expect.objectContaining({
        isOfflineQueued: true,
        message: 'Offline: Action queued for synchronization.',
      })
    );
    expect(mockAddToQueue).toHaveBeenCalled();
  });
});
