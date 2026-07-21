import useAuthStore, { UserProfile } from '../authStore';
import secureStore from '../../services/secureStore';

jest.mock('../../services/pushNotification', () => ({
  unregisterDeviceFromPushNotifications: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../services/socketManager', () => ({
  disconnectSocketOnLogout: jest.fn(),
}));

const mockUser: UserProfile = {
  id: 'EMP-123',
  name: 'Test Employee',
  email: 'test@company.com',
  role: 'employee',
  roleId: 'employee_role',
  companyId: 'COMP-ACME',
  status: 'Active',
};

describe('authStore', () => {
  beforeEach(async () => {
    // Reset state before each test
    const store = useAuthStore.getState();
    // Directly reset Zustand state to avoid secureStore interference in basic tests
    useAuthStore.setState({
      isAuthenticated: false,
      token: null,
      user: null,
      companyId: null,
      rememberMe: false,
      rememberedEmail: null,
      rememberedCompanyCode: null,
      loadingSession: false,
    });
    jest.clearAllMocks();
  });

  it('should initialize with default states', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.companyId).toBeNull();
  });

  it('should store credentials and set states on login', async () => {
    const store = useAuthStore.getState();
    await store.login('token-123', mockUser, true, 'acme');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('token-123');
    expect(state.user).toEqual(mockUser);
    expect(state.companyId).toBe('COMP-ACME');
    expect(state.rememberMe).toBe(true);
    expect(state.rememberedEmail).toBe(mockUser.email);
    expect(state.rememberedCompanyCode).toBe('acme');
  });

  it('should clear credentials on logout', async () => {
    const store = useAuthStore.getState();
    await store.login('token-123', mockUser, false);
    await store.logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.companyId).toBeNull();
  });

  it('should update user fields via updateUser', () => {
    const store = useAuthStore.getState();
    useAuthStore.setState({ user: mockUser });
    store.updateUser({ name: 'Updated Name' });

    const state = useAuthStore.getState();
    expect(state.user?.name).toBe('Updated Name');
    expect(state.user?.email).toBe(mockUser.email);
  });

  it('should load session from secure storage', async () => {
    jest.spyOn(secureStore, 'getItem').mockImplementation(async (key) => {
      if (key === 'auth_token') return 'token-stored';
      if (key === 'remember_me') return 'true';
      if (key === 'remembered_email') return 'test@company.com';
      return null;
    });
    jest.spyOn(secureStore, 'getJson').mockImplementation(async (key) => {
      if (key === 'user_profile') return mockUser;
      return null;
    });

    const store = useAuthStore.getState();
    await store.loadSession();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('token-stored');
    expect(state.user).toEqual(mockUser);
    expect(state.rememberMe).toBe(true);
  });
});
