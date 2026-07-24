import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../(auth)/login';
import { useLogin } from '../../src/features/auth/hooks/useLogin';

jest.mock('../../src/features/auth/hooks/useLogin', () => ({
  useLogin: jest.fn(() => ({
    form: { identifier: '', password: '' },
    errors: {},
    loginError: null,
    loading: false,
    setField: jest.fn(),
    submit: jest.fn(),
  })),
}));

jest.mock('../../src/shared/hooks/useBranding', () => jest.fn(() => ({
  companyName: 'Acme Corp',
  logoUrl: null,
})));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render brand elements, inputs, and button correctly', () => {
    const { getByPlaceholderText, getAllByText, getByText } = render(<LoginScreen />);
    
    expect(getAllByText('Acme Corp').length).toBeGreaterThan(0);
    expect(getByPlaceholderText('Enter employee ID or email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('should call setField when inputs are changed', () => {
    const mockSetField = jest.fn();
    (useLogin as jest.Mock).mockReturnValue({
      form: { identifier: '', password: '' },
      errors: {},
      loginError: null,
      loading: false,
      setField: mockSetField,
      submit: jest.fn(),
    });

    const { getByPlaceholderText } = render(<LoginScreen />);
    
    fireEvent.changeText(getByPlaceholderText('Enter employee ID or email'), 'employee@acme.com');
    expect(mockSetField).toHaveBeenCalledWith('identifier', 'employee@acme.com');
  });

  it('should call submit when the Sign In button is pressed', async () => {
    const mockSubmit = jest.fn();
    (useLogin as jest.Mock).mockReturnValue({
      form: { identifier: 'employee@acme.com', password: 'password123' },
      errors: {},
      loginError: null,
      loading: false,
      setField: jest.fn(),
      submit: mockSubmit,
    });

    const { getByRole } = render(<LoginScreen />);

    // Press Sign In button
    fireEvent.press(getByRole('button', { name: 'Sign In' }));
    expect(mockSubmit).toHaveBeenCalled();
  });

  it('should display error message when loginError exists', () => {
    (useLogin as jest.Mock).mockReturnValue({
      form: { identifier: '', password: '' },
      errors: {},
      loginError: { message: 'Invalid credentials' },
      loading: false,
      setField: jest.fn(),
      submit: jest.fn(),
    });

    const { getByText } = render(<LoginScreen />);
    expect(getByText('Invalid credentials')).toBeTruthy();
  });
});
