import { renderHook } from '@testing-library/react-native';
import { useTheme } from '../useTheme';
import { useThemeStore } from '../../store/themeStore';
import * as reactNative from 'react-native';

describe('useTheme hook', () => {
  let colorSchemeSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    colorSchemeSpy = jest.spyOn(reactNative, 'useColorScheme').mockReturnValue('light');
    useThemeStore.setState({
      themeMode: 'system',
      tenantBranding: null,
    });
  });

  afterEach(() => {
    colorSchemeSpy.mockRestore();
  });

  it('should return light theme defaults by default', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.themeMode).toBe('system');
    expect(result.current.isDark).toBe(false);
    expect(result.current.colors).toBeDefined();
    expect(result.current.spacing).toBeDefined();
  });

  it('should reflect isDark when themeMode is dark', () => {
    useThemeStore.setState({ themeMode: 'dark' });
    const { result } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(true);
  });

  it('should reflect system scheme changes when mode is system', () => {
    colorSchemeSpy.mockReturnValue('dark');
    const { result } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(true);
  });
});
