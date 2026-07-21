/**
 * @file index.ts
 * @description Barrel export for the Enterprise Profile feature module.
 */

// Types
export * from './types';

// API
export { default as profileApi } from './api/profileApi';

// Hooks
export {
  useProfile,
  useUpdateProfilePhoto,
  useBankDetails,
  useEmergencyContacts,
  useProfileDocuments,
  useLeaveSummary,
  usePayroll,
  useProfileCompleteness,
  useUpdateProfile,
  useActiveSessions,
  useActiveDevices,
  useTerminateSession,
  useTerminateOtherSessions,
} from './hooks/useProfile';

// Components
export { InfoRow } from './components/InfoRow';
export { InfoCard } from './components/InfoCard';
export { MenuCard } from './components/MenuCard';
export { MainProfileSkeleton, InnerPageSkeleton } from './components/ProfileSkeleton';
