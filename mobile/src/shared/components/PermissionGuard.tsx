/**
 * @file PermissionGuard.tsx
 * @description Component to conditionally render UI elements based on user roles and modular permissions.
 */

import React from 'react';
import useAuthStore from '../store/authStore';

interface PermissionGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  forbiddenRoles?: string[];
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  children,
  allowedRoles,
  forbiddenRoles,
  fallback = null,
}) => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <>{fallback}</>;
  }

  const userRole = user.roleId || user.role;

  // 1. If user role is in forbidden list, block access
  if (forbiddenRoles && forbiddenRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  // 2. If allowed roles is defined, check if user's role is permitted
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <>{fallback}</>;
  }

  // 3. Permitted -> render children
  return <>{children}</>;
};

export default PermissionGuard;
