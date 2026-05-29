import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

/**
 * Route protector checking if the user session token is present.
 * Redirects to `/login` if unauthenticated.
 */
export const AuthGuard = ({ children }) => {
  const token = sessionStorage.getItem('saas_token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children ? children : <Outlet />;
};

/**
 * Route protector checking if the active user role is permitted.
 * Redirects to `/unauthorized` if forbidden.
 */
export const RoleGuard = ({ allowedRoles = [], children }) => {
  const { currentUserRole } = useApp();

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUserRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
};
