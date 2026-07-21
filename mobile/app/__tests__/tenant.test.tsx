import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TenantScreen from '../(auth)/tenant';
import authApi from '../../src/features/auth/api/authApi';
import { useRouter } from 'expo-router';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

jest.mock('../../src/features/auth/api/authApi', () => ({
  fetchBranding: jest.fn(),
  fetchBrandingBySubdomain: jest.fn(),
}));

describe('TenantScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate empty company code input', async () => {
    const { getByText } = render(<TenantScreen />);
    
    // Press resolve button
    fireEvent.press(getByText('Continue to Login'));
    
    expect(getByText('Please enter your Company Code.')).toBeTruthy();
  });

  it('should fetch branding and navigate to login on success', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (authApi.fetchBranding as jest.Mock).mockResolvedValue({
      id: 'COMP-ACME',
      name: 'Acme Corp',
      settings: {
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
      },
    });

    const { getByPlaceholderText, getByText } = render(<TenantScreen />);
    
    // Type company code
    fireEvent.changeText(getByPlaceholderText('e.g. COMP-DEFAULT or acme'), 'acme');
    fireEvent.press(getByText('Continue to Login'));

    await waitFor(() => {
      expect(authApi.fetchBranding).toHaveBeenCalledWith('acme');
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(auth)/login',
        params: { companyCode: 'COMP-ACME', companyName: 'Acme Corp' },
      });
    });
  });
});
