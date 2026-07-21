import { useThemeStore, ThemeMode } from '../themeStore';
import secureStore from '../../services/secureStore';

jest.mock('../../services/secureStore', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  deleteItem: jest.fn(),
  setJson: jest.fn(() => Promise.resolve()),
  getJson: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

describe('themeStore', () => {
  beforeEach(async () => {
    useThemeStore.setState({
      themeMode: 'system',
      tenantBranding: null,
    });
    jest.clearAllMocks();
  });

  it('should initialize with default states', () => {
    const state = useThemeStore.getState();
    expect(state.themeMode).toBe('system');
    expect(state.tenantBranding).toBeNull();
  });

  it('should update theme mode and save to secureStore', async () => {
    const store = useThemeStore.getState();
    await store.setThemeMode('dark');

    expect(useThemeStore.getState().themeMode).toBe('dark');
    expect(secureStore.setItem).toHaveBeenCalledWith('theme_mode', 'dark');
  });

  it('should update tenant branding and save to secureStore', async () => {
    const store = useThemeStore.getState();
    const branding = { primary: '#FF0000', companyName: 'Custom Co' };
    await store.setTenantBranding(branding);

    expect(useThemeStore.getState().tenantBranding).toEqual(branding);
    expect(secureStore.setJson).toHaveBeenCalledWith('tenant_branding', branding);
  });

  it('should clear tenant branding when null passed', async () => {
    const store = useThemeStore.getState();
    await store.setTenantBranding(null);

    expect(useThemeStore.getState().tenantBranding).toBeNull();
    expect(secureStore.deleteItem).toHaveBeenCalledWith('tenant_branding');
  });

  it('should calculate colors based on theme and branding overrides', () => {
    const store = useThemeStore.getState();
    
    // Light system colors
    let colors = store.getColors(false);
    expect(colors.primary).toBeDefined();

    // With tenant branding primary override
    store.setTenantBranding({ primary: '#AA0000' });
    colors = store.getColors(false);
    expect(colors.primary).toBe('#AA0000');
  });

  it('should load settings from secureStore', async () => {
    (secureStore.getItem as jest.Mock).mockResolvedValue('dark');
    (secureStore.getJson as jest.Mock).mockResolvedValue({ primary: '#00FF00' });

    const store = useThemeStore.getState();
    await store.loadThemeSettings();

    expect(useThemeStore.getState().themeMode).toBe('dark');
    expect(useThemeStore.getState().tenantBranding).toEqual({ primary: '#00FF00' });
  });

  it('should fall back to defaults when no settings exist in secureStore', async () => {
    (secureStore.getItem as jest.Mock).mockResolvedValue(null);
    (secureStore.getJson as jest.Mock).mockResolvedValue(null);

    const store = useThemeStore.getState();
    await store.loadThemeSettings();

    expect(useThemeStore.getState().themeMode).toBe('system');
    expect(useThemeStore.getState().tenantBranding).toBeNull();
  });
});
