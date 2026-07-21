import { renderHook } from '@testing-library/react-native';
import { useUserPermissions } from '../useUserPermissions';
import useAuthStore from '../../store/authStore';
import { useQuery } from '@tanstack/react-query';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../services/apiClient', () => ({
  get: jest.fn(),
}));

describe('useUserPermissions hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: 'EMP-1',
        name: 'Rahul',
        email: 'rahul@company.com',
        role: 'employee',
        roleId: 'employee',
        companyId: 'COMP-ACME',
        status: 'Active',
      },
    });

    (useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('should allow everything for company_admin', () => {
    useAuthStore.setState({
      user: {
        id: 'EMP-1',
        name: 'Admin User',
        email: 'admin@company.com',
        role: 'company_admin',
        roleId: 'company_admin',
        companyId: 'COMP-ACME',
        status: 'Active',
      },
    });

    const { result } = renderHook(() => useUserPermissions());
    expect(result.current.hasPermission('leaves', 'approve')).toBe(true);
    expect(result.current.hasPermission('payroll', 'export')).toBe(true);
  });

  it('should fall back to role configuration if no overrides exist', () => {
    const mockRoles = [
      {
        id: 'employee',
        name: 'Employee',
        permissions: {
          leaves: {
            create: true,
            read: true,
            update: false,
            delete: false,
            approve: false,
            export: false,
          },
        },
      },
    ];

    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'roles' && queryKey[1] === 'list') {
        return { data: mockRoles, isLoading: false };
      }
      return { data: [], isLoading: false };
    });

    const { result } = renderHook(() => useUserPermissions());
    expect(result.current.hasPermission('leaves', 'read')).toBe(true);
    expect(result.current.hasPermission('leaves', 'create')).toBe(true);
    expect(result.current.hasPermission('leaves', 'approve')).toBe(false);
  });

  it('should apply deny override to override role permissions', () => {
    const mockRoles = [
      {
        id: 'employee',
        name: 'Employee',
        permissions: {
          leaves: {
            create: true,
            read: true,
            update: false,
            delete: false,
            approve: false,
            export: false,
          },
        },
      },
    ];
    
    // Explicit Deny override for Rahul on leaves module
    const mockOverrides = [
      {
        id: 'ov_1',
        userId: 'EMP-1',
        module: 'leave_management',
        type: 'deny',
        scope: 'restricted',
      },
    ];

    (useQuery as jest.Mock).mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'roles' && queryKey[1] === 'list') {
        return { data: mockRoles, isLoading: false };
      }
      if (queryKey[0] === 'roles' && queryKey[1] === 'overrides') {
        return { data: mockOverrides, isLoading: false };
      }
      return { data: [], isLoading: false };
    });

    const { result } = renderHook(() => useUserPermissions());
    // Rahul's leaves access is denied due to override
    expect(result.current.hasPermission('leaves', 'read')).toBe(false);
  });
});
