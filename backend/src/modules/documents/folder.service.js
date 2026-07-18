/**
 * @file src/modules/documents/folder.service.js
 * @description Folder structure builder service for Project and General scopes.
 */

import logger from '../../config/logger.js';
import Project from '../projects/projects.model.js';
import * as projectsService from '../projects/projects.service.js';

const GENERAL_FOLDERS = [
  'HR',
  'Finance',
  'Legal',
  'Company Policies',
  'Training Materials',
  'Templates',
  'Others'
];

const PROJECT_CATEGORIES = [
  'Design Files',
  'API Documentation',
  'Technical Documents',
  'Requirement Documents',
  'Contracts',
  'Project Reports',
  'Architecture Diagrams'
];

/**
 * Returns the dynamic folder hierarchy for documents based on user permissions.
 * @param {object} currentUser - The logged-in user.
 * @returns {Promise<object>} `{ projectFolders: [], generalFolders: [] }`
 */
export const getFolderStructure = async (currentUser) => {
  logger.info(`FolderService::getFolderStructure building layout for user: ${currentUser?.id}`);

  // 1. Fetch projects the user has access to read
  const allUserProjects = await projectsService.findAll({}, currentUser);

  const activeProjects = [];
  const archivedProjects = [];

  allUserProjects.forEach(p => {
    // Project status 'Archived' (or Completed, depending on preference. The prompt explicitly says: "When a project is archived -> Move its folder into Archived Projects").
    if (p.status === 'Archived') {
      archivedProjects.push({
        id: p.id,
        name: p.name,
        code: p.projectCode || p.id,
        categories: PROJECT_CATEGORIES
      });
    } else {
      activeProjects.push({
        id: p.id,
        name: p.name,
        code: p.projectCode || p.id,
        categories: PROJECT_CATEGORIES
      });
    }
  });

  // 2. Map static General Documents categories
  const generalFolders = GENERAL_FOLDERS.map(folder => ({
    key: folder.toLowerCase().replace(/\s+/g, '_'),
    name: folder,
    categories: [folder] // Categories under General HR folder etc. is just itself, or we can configure further
  }));

  return {
    projectFolders: {
      active: activeProjects,
      archived: archivedProjects
    },
    generalFolders
  };
};

export default {
  getFolderStructure,
  GENERAL_FOLDERS,
  PROJECT_CATEGORIES
};
