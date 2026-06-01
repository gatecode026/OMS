import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getRequiredRoleForPath, hasRoleAccess } from '../../permissions/permissions';

/**
 * Route protector checking if the user session token is present.
 * Redirects to `/login` if unauthenticated.
 */
export const AuthGuard = ({ children }) => {
  const token = localStorage.getItem('saas_token') || sessionStorage.getItem('saas_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

// Export alias as requested
export const ProtectedRoute = AuthGuard;

/**
 * Route protector checking if the active user role is permitted.
 * If allowedRoles is provided, it performs a static check.
 * Otherwise, it dynamically resolves the required role for the current path.
 * Redirects to `/unauthorized` if forbidden.
 */
export const RoleGuard = ({ allowedRoles = [], children }) => {
  const { currentUserRole } = useApp();
  const location = useLocation();

  let isAuthorized = false;

  if (allowedRoles.length > 0) {
    isAuthorized = allowedRoles.includes(currentUserRole);
  } else {
    // Dynamic resolution based on URL path
    const requiredRole = getRequiredRoleForPath(location.pathname);
    isAuthorized = hasRoleAccess(currentUserRole, requiredRole);
  }

  if (!isAuthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
};

