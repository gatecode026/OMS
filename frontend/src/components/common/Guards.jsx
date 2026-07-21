import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { getRequiredRoleForPath, hasRoleAccess, PATH_TO_MODULE } from '../../permissions/permissions';
import { decodeEmployeeId } from '../../utils/hashId';

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
  const { currentUserRole, currentUser, hasPermission, initialized } = useApp();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="page-loading-wrapper">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  let isAuthorized = false;
  let moduleKey = null;

  if (allowedRoles.length > 0) {
    isAuthorized = allowedRoles.includes(currentUserRole);
  } else {
    const pathParts = location.pathname.split('/').filter(Boolean);

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
      // If granular matrix maps to this path, the database permissions matrix takes precedence.
      isAuthorized = hasPermission(moduleKey, 'read', 'self') || hasPermission(moduleKey, 'read', 'company');
      // Fallback if permission matrix lacks config: check standard role hierarchies
      if (!isAuthorized) {
        const requiredRole = getRequiredRoleForPath(location.pathname);
        isAuthorized = hasRoleAccess(currentUserRole, requiredRole);
      }
    } else {
      // Fallback: Resolve required role and use hierarchy check if no granular module maps to this route
      const requiredRole = getRequiredRoleForPath(location.pathname);
      isAuthorized = hasRoleAccess(currentUserRole, requiredRole);
    }

    // Dynamic checks for specific resource endpoints (e.g., self-service or team visibility)
    if (!isAuthorized && currentUser) {
      // Check if accessing '/employees/:id' or '/employee-profile/:id'
      if (pathParts.length === 2 && (pathParts[0] === 'employees' || pathParts[0] === 'employee-profile')) {
        const targetEmployeeId = decodeEmployeeId(pathParts[1]);
        
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

  console.log('RoleGuard resolution:', { path: location.pathname, moduleKey, currentUserRole, isAuthorized });

  if (!isAuthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
};


