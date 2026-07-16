# OMS Mobile — Enterprise Foundation Architecture

Welcome to the **Office Management System (OMS) Mobile Application** foundation repository. This project is built using React Native + Expo, structured to easily scale to 25+ business modules with strict clean code principles, tenant-aware configurations, offline synchronization, and dynamic branding.

---

## 📂 Project Directory Structure

The project follows a **feature-first** and **layered Clean Architecture**:

```
mobile/
├── app/                      # Expo Router - Presentation & Navigation Routing
│   ├── _layout.tsx           # Global Root layout & authentication gate
│   ├── (auth)/               # Unauthenticated routing stack (Tenant, Login)
│   │   ├── _layout.tsx
│   │   ├── tenant.tsx
│   │   └── login.tsx
│   └── (app)/                # Authenticated protected routing stack
│       ├── _layout.tsx
│       └── (tabs)/           # Main Application Tab Navigator
│           ├── index.tsx     # Dashboard
│           ├── notifications.tsx
│           └── profile.tsx
├── src/                      # Business & Application Logic
│   ├── config/               # Environment profiles (env.ts)
│   ├── shared/               # Shared Infrastructure layer
│   │   ├── components/       # Design System UI Library (Button, TextField, Card, etc.)
│   │   ├── hooks/            # Shared hooks (useTheme, useAuth, useOffline, usePermissions)
│   │   ├── services/         # Infrastructure Services (apiClient, secureStore, syncManager)
│   │   ├── store/            # Zustand Local State (authStore, themeStore, offlineStore)
│   │   ├── theme/            # Styling Design Tokens & ThemeProvider
│   │   ├── providers/        # Combined Global Context Providers (RootProvider)
│   │   ├── types/            # Shared TS types
│   │   └── utils/            # General utilities
│   └── features/             # Scoped Business Feature Modules
│       ├── auth/             # Authentication Domain
│       └── attendance/       # Scaffolded Attendance Domain
│           ├── api/          # Query/Mutation calls
│           ├── components/   # Scoped UI elements
│           ├── hooks/        # Scoped Hooks
│           ├── screens/      # Feature layouts
│           └── types/        # Scoped Type definitions
```

---

## 🏛️ Layered Clean Architecture

Our architecture separates concerns across five distinct boundaries:

```
┌───────────────────────────────────────────────────────────┐
│                    Presentation Layer                     │
│               (Expo Router / app/ Screen UI)              │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│                      Business Layer                       │
│              (Zustand Stores / Custom Hooks)              │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│                         API Layer                         │
│               (TanStack Query / axios client)             │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                   │
│             (Network State / Secure Store / CDN)          │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│                       Backend API                         │
│                    (Node.js REST API)                     │
└───────────────────────────────────────────────────────────┘
```

1. **Presentation Layer**: Handles rendering and user interaction. No raw business rules, data fetching, or database manipulation happens here.
2. **Business Layer**: Hook boundaries (e.g. `useAttendance.ts`) and global stores (`authStore.ts`). Coordinates presentation actions with APIs and offline queues.
3. **API Layer**: Standardized HTTP configurations, request interceptors, and query hydration caching via TanStack Query.
4. **Infrastructure Layer**: Physical device capabilities (encrypted file storage, push notifications, network socket state watchers).

---

## 🎨 Theme Engine & Design Tokens

Theme styling is driven by **Design Tokens** defined in `src/shared/theme/tokens.ts` (Colors, Typography, Spacing, Radius, Shadows).

### Highlights:
- **Tenant-Aware Branding**: When the user enters their company code on the `tenant` screen, the app requests the tenant's public branding details `/api/public/branding/:companyId`. The primary/secondary hex colors are saved in `themeStore` and immediately override the default themes.
- **Dynamic Hook Consumption**: Use the `useTheme` hook inside custom styles:
  ```typescript
  const { colors, spacing, radius } = useTheme();
  ```

---

## 🔄 Data Flows & Networking

Our network client (`src/shared/services/apiClient.ts`) uses Axios with custom interceptors:

1. **JWT Injection**: Automatically reads the token from `useAuthStore` and appends `Authorization: Bearer <token>` to outbound requests. It also appends `x-tenant-id` header to correctly scope databases.
2. **Silent Token Refresh**: If a request encounters a `401 Unauthorized` response due to token expiration, the Axios client halts the request, locks the queue, and issues a `POST /api/v1/auth/refresh` request. If successful, the new token is stored and the halted requests are retried. If the refresh fails, the user is logged out.
3. **Centralized Error Handling**: Response rejections are mapped to user-friendly messages for codes: `400`, `401`, `403`, `404`, `422`, `429`, and `500`.

---

## 📶 Offline Sync Architecture

The offline engine ensures a reliable experience during connectivity loss:

1. **Connectivity Watcher**: `NetworkProvider` binds `@react-native-community/netinfo` to trace active connectivity.
2. **Offline Mutation Queue**: If a user performs a state mutation (e.g., clocks in) while offline, the feature hook captures the action and queues it inside `offlineStore` via `SecureStore`.
3. **Sync Manager**: On transition from offline to online, the `NetworkProvider` calls `syncManager.sync()`. The sync manager processes queued items sequentially. If an error is client-side (e.g., 400/404), it drops it. If it is network-related, it pauses the queue to retry later.

---

## 🚀 How to Integrate a New Feature Module (in 5 Minutes)

To add a new business module (e.g., **Leaves**), follow these steps:

### Step 1: Create the Directory Layout
Inside `src/features/`, create a new folder `leaves/` containing:
```
leaves/
├── api/
│   └── leavesApi.ts
├── components/
│   └── LeaveStatusCard.tsx
├── hooks/
│   └── useLeaves.ts
└── types/
    └── index.ts
```

### Step 2: Define Types
In `leaves/types/index.ts`:
```typescript
export interface LeaveRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}
```

### Step 3: Write API Client Calls
In `leaves/api/leavesApi.ts`:
```typescript
import apiClient from '../../../shared/services/apiClient';
import { LeaveRequest } from '../types';

export const leavesApi = {
  async fetchRequests(): Promise<LeaveRequest[]> {
    const response = await apiClient.get('/api/v1/leaves');
    return response.data?.data;
  }
};
```

### Step 4: Construct Business Hook
In `leaves/hooks/useLeaves.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { leavesApi } from '../api/leavesApi';

export const useLeaves = () => {
  const query = useQuery({
    queryKey: ['leaves', 'requests'],
    queryFn: leavesApi.fetchRequests,
  });

  return {
    leaves: query.data || [],
    loading: query.isLoading,
  };
};
```

### Step 5: Mount to Routing View
Add a file in `app/(app)/leaves.tsx` or register the screen in `app/(app)/(tabs)/` to mount the leaves visual screen.
