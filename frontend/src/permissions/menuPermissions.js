import { hasRoleAccess } from './roles';
import { getRequiredRoleForPath } from './routePermissions';

/**
 * Validates if a user's role has access to a specific sidebar menu item or any of its sub-items.
 * 
 * @param {Object} item - The menu item from the sidebar structure.
 * @param {string} userRole - The active user's role.
 * @returns {boolean} True if the item is accessible, false otherwise.
 */
export const isMenuItemAccessible = (item, userRole) => {
  // If it's a danger/logout or has no path/subItems, check general access
  if (!item.path && (!item.subItems || item.subItems.length === 0)) {
    return true;
  }

  // If item has sub-items, check if the user has access to at least one of them
  if (item.subItems && item.subItems.length > 0) {
    return item.subItems.some(subItem => {
      const requiredRole = getRequiredRoleForPath(subItem.path);
      return hasRoleAccess(userRole, requiredRole);
    });
  }

  // Otherwise check the item's direct path
  if (item.path) {
    // Treat logout specially or allow it
    if (item.path === '/logout') return true;
    
    const requiredRole = getRequiredRoleForPath(item.path);
    return hasRoleAccess(userRole, requiredRole);
  }

  return true;
};

/**
 * Filters the sidebar menu structure dynamically based on user role.
 * Any empty sections resulting from filtering are completely hidden.
 */
export const filterMenuByRole = (menuStructure, userRole) => {
  return menuStructure
    .map(section => {
      const filteredItems = [];

      for (const item of section.items) {
        if (item.subItems && item.subItems.length > 0) {
          const accessibleSubItems = item.subItems.filter(sub => {
            const reqRole = getRequiredRoleForPath(sub.path);
            return hasRoleAccess(userRole, reqRole);
          });
          
          if (accessibleSubItems.length > 0) {
            filteredItems.push({
              ...item,
              subItems: accessibleSubItems
            });
          }
        } else if (isMenuItemAccessible(item, userRole)) {
          filteredItems.push({ ...item });
        }
      }

      return {
        ...section,
        items: filteredItems
      };
    })
    .filter(section => section.items.length > 0);
};
