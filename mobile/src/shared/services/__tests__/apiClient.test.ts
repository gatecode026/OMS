import apiClient, { mapAxiosError, isPublicRoute } from '../apiClient';
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

  describe('isPublicRoute helper', () => {
    it('should identify authentication and public routes correctly', () => {
      expect(isPublicRoute('/api/v1/auth/login')).toBe(true);
      expect(isPublicRoute('/api/v1/auth/register')).toBe(true);
      expect(isPublicRoute('/api/v1/auth/refresh')).toBe(true);
      expect(isPublicRoute('/api/public/branding')).toBe(true);
      expect(isPublicRoute('/api/v1/employees')).toBe(false);
      expect(isPublicRoute(undefined)).toBe(false);
    });
  });

  describe('mapAxiosError idempotency', () => {
    it('should map standard Axios error to AppError with correct statusCode', () => {
      const axiosError = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
      };

      const mapped = mapAxiosError(axiosError);
      expect(mapped.statusCode).toBe(401);
      expect(mapped.message).toBe('Invalid credentials');
      expect(mapped.status).toBe('fail');
    });

    it('should return input immediately if it is already an AppError', () => {
      const existingAppError = {
        status: 'fail' as const,
        message: 'Invalid credentials',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      };

      const mapped = mapAxiosError(existingAppError);
      expect(mapped).toBe(existingAppError);
      expect(mapped.statusCode).toBe(401);
    });
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

  it('should queue mutating requests when the device is offline for protected routes', async () => {
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

  it('should NOT queue public auth requests even when the device is offline', async () => {
    const mockAddToQueue = jest.fn(() => Promise.resolve());
    (useOfflineStore.getState as jest.Mock).mockReturnValue({
      isConnected: false,
      addToQueue: mockAddToQueue,
    });

    const mockConfig = {
      headers: {},
      url: '/api/v1/auth/login',
      method: 'post',
      data: { email: 'user@company.com', password: 'password' },
    };

    const requestInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;
    const resultConfig = await requestInterceptor(mockConfig);

    expect(resultConfig).toBe(mockConfig);
    expect(mockAddToQueue).not.toHaveBeenCalled();
  });
});
