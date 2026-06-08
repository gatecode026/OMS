import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getRequiredRoleForPath, hasRoleAccess, PATH_TO_MODULE } from '../../permissions/permissions';

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
  const { currentUserRole, currentUser, hasPermission } = useApp();
  const location = useLocation();

  let isAuthorized = false;

  if (allowedRoles.length > 0) {
    isAuthorized = allowedRoles.includes(currentUserRole);
  } else {
    // Dynamic resolution based on URL path
    const requiredRole = getRequiredRoleForPath(location.pathname);
    isAuthorized = hasRoleAccess(currentUserRole, requiredRole);

    // Apply real-time database matrix permission checks
    if (isAuthorized) {
      const pathParts = location.pathname.split('/').filter(Boolean);
      let moduleKey = null;

      if (PATH_TO_MODULE[location.pathname]) {
        moduleKey = PATH_TO_MODULE[location.pathname];
      } else {
        // Parametric path match
        for (const route of Object.keys(PATH_TO_MODULE)) {
          const routeParts = route.split('/').filter(Boolean);
          if (routeParts.length !== pathParts.length) continue;
          
          let match = true;
          for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) continue;
            if (routeParts[i] !== pathParts[i]) {
              match = false;
              break;
            }
          }
          if (match) {
            moduleKey = PATH_TO_MODULE[route];
            break;
          }
        }
      }

      if (moduleKey) {
        isAuthorized = hasPermission(moduleKey, 'read');
      }
    }

    // Dynamic checks for specific resource endpoints (e.g., self-service or team visibility)
    if (!isAuthorized && currentUser) {
      const pathParts = location.pathname.split('/').filter(Boolean);
      // Check if accessing '/employees/:id'
      if (pathParts.length === 2 && pathParts[0] === 'employees') {
        const targetEmployeeId = pathParts[1];
        
        // 1. Self-service exception: any user can view their own profile
        if (currentUser.id === targetEmployeeId) {
          isAuthorized = true;
        }
        // 2. Supervisor exceptions: managers and team leaders can view employee profiles
        else if (currentUserRole === 'manager' || currentUserRole === 'team_leader') {
          isAuthorized = true;
        }
      }
    }
  }

  if (!isAuthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
};


