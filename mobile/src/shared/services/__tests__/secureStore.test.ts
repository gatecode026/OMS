import secureStore from '../secureStore';
import * as SecureStore from 'expo-secure-store';

describe('secureStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should save and get item with environment prefix', async () => {
    await secureStore.setItem('test_key', 'test_val');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.stringContaining('test_key'), 'test_val');

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('test_val');
    const val = await secureStore.getItem('test_key');
    expect(val).toBe('test_val');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(expect.stringContaining('test_key'));
  });

  it('should remove item', async () => {
    await secureStore.deleteItem('test_key');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(expect.stringContaining('test_key'));
  });

  it('should save and get JSON objects correctly', async () => {
    const data = { token: '123', active: true };
    await secureStore.setJson('test_json', data);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringContaining('test_json'),
      JSON.stringify(data)
    );

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(JSON.stringify(data));
    const val = await secureStore.getJson('test_json');
    expect(val).toEqual(data);
  });
});
