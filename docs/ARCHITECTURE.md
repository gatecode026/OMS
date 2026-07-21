# OMS System Architecture & Engineering Blueprint

> **Purpose:** Comprehensive technical architecture guide detailing system design, network flows, state management, security boundaries, and ADRs.  
> **Audience:** Senior Software Engineers, System Architects, Mobile Developers, DevOps Team.  
> **Owner:** Lead Mobile Architect & Core Engineering Team.  
> **Last Updated:** July 20, 2026  
> **Related Modules:** `mobile/src/shared/services/`, `mobile/src/shared/store/`, `backend/src/`  

---

## 1. High-Level System Architecture

The OMS ecosystem consists of a **React Native Cross-Platform Application** (iOS, Android, Web), a **Node.js/Express REST & WebSocket Backend**, a shared **PostgreSQL / MongoDB database**, and external media handling via **ImageKit CDN**.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|                                                                                   |
|  +-----------------------------------+     +-----------------------------------+  |
|  |           OMS Mobile App          |     |           OMS Web App             |  |
|  |  React Native (Expo 54), Zustand  |     |      React 19, Tailwind CSS       |  |
|  +-----------------+-----------------+     +-----------------+-----------------+  |
+--------------------|-----------------------------------------|--------------------+
                     |                                         |
                     | HTTPS (REST API) / WSS (Socket.IO)      |
                     v                                         v
+-----------------------------------------------------------------------------------+
|                                 APPLICATION LAYER                                 |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  |                    Render-Hosted Node.js / Express Server                    |  |
|  |                                                                             |  |
|  |  [Auth Middleware] -> [Tenant Scoping Middleware] -> [Rate Limiters]        |  |
|  |  [Socket.IO Server] -> [Event Handlers] -> [Room Broadcast Manager]          |  |
|  +---------------------------------------+-------------------------------------+  |
+------------------------------------------|----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                                  DATA & SERVICES                                  |
|                                                                                   |
|  +--------------------+      +--------------------+      +---------------------+  |
|  |   PostgreSQL DB    |      |    Redis Cache     |      |  ImageKit CDN S3    |  |
|  | (Emp, Attendance)  |      |  (Presence/Rooms)  |      |   (Media Storage)   |  |
|  +--------------------+      +--------------------+      +---------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Multi-Tenant Scoping & Security Isolation

Multi-tenancy is enforced at every layer to prevent data leakages between organizations.

### Request Scoping Pipeline
1. **HTTP Headers:** Every request executed by `apiClient.ts` injects:
   - `Authorization: Bearer <JWT>`
   - `x-tenant-id: <COMPANY_ID>`
   - `x-device-id: <DEVICE_ID>`
2. **Backend Authentication Middleware:** Verifies JWT signature and extracts `companyId` and `userId`.
3. **Database Scoping:** Database queries automatically prepend `tenantId` match criteria to restrict scope to the authenticated user's organization.

---

## 3. Real-Time Presence & Socket.IO Architecture

Presence tracking is fully synchronized between Web and Mobile clients.

```
Mobile Client                               Socket.IO Server                              Presence Store
     |                                             |                                            |
     |--- 1. WebSocket Connect (extraHeaders) ---->|                                            |
     |                                             |--- 2. Verify Auth & Tenant Headers        |
     |                                             |--- 3. Broadcast user_online (tenant room)->|
     |<-- 4. Emit online_users_list --------------|                                            |
     |                                             |------------------------------------------->| Updates Zustand
     |                                             |                                            | presenceStore
     |--- 5. User disconnect / app background ---->|                                            |
     |                                             |--- 6. Debounced offline broadcast -------->| Status: Offline
```

### Key Socket Events
- `connect` / `disconnect`: Lifecycle connection tracking.
- `online_users_list`: Syncs the complete list of active company users upon handshake.
- `user_online` / `user:online`: Real-time user online notification.
- `user_offline` / `user:offline`: Debounced offline event fired on application shutdown or socket termination.
- `user:typing` / `user:stopped_typing`: Cross-platform typing status indicators.

---

## 4. Offline-First Architecture & Synchronization Queue

To guarantee uninterrupted mobile functionality in poor connectivity environments, OMS implements an offline queueing architecture.

```
                       +-----------------------------------+
                       |      User Performs Mutation       |
                       +-----------------+-----------------+
                                         |
                                         v
                       +-----------------------------------+
                       |    Check NetInfo Connection?      |
                       +--------+-----------------+--------+
                                |                 |
                       ONLINE   |                 | OFFLINE
                                v                 v
               +-------------------+   +--------------------+
               | Execute API via   |   | Queue Mutation in  |
               | Axios apiClient   |   | offlineStore       |
               +-------------------+   +----------+---------+
                                                  |
                                                  v
                                       +--------------------+
                                       | NetInfo Reconnects |
                                       +----------+---------+
                                                  |
                                                  v
                                       +--------------------+
                                       | Flush Queue & Sync |
                                       | Back to Production |
                                       +--------------------+
```

### Components
- **`NetInfo` Hook:** Monitors physical cellular and Wi-Fi state.
- **`offlineStore` (Zustand + SecureStore):** Queues mutation payload objects (`POST`, `PUT`, `DELETE`).
- **Sync Flusher:** Triggers sequential execution of queued actions when internet reachability returns.

---

## 5. State Management & Cache Architecture

OMS splits state management responsibilities cleanly:

```
+-----------------------------------------------------------------------------------+
|                                STATE ARCHITECTURE                                 |
+-----------------------------------------+-----------------------------------------+
|              ZUSTAND                    |             REACT QUERY                 |
|       (Client / Transient State)        |        (Server / Cached State)          |
+-----------------------------------------+-----------------------------------------+
| • authStore (JWT, User Profile)         | • Attendance Records & Monthly Summaries |
| • presenceStore (Online User Maps)      | • Chat Conversations & Message Threads  |
| • themeStore (Light/Dark Mode)          | • Payslips, Salary Data, Leave Lists    |
| • chatSettingsStore (Wallpapers, Audio) | • Notifications & Document Collections  |
| • offlineStore (Network Mutation Queue) | • Background Cache Invalidation & Polling|
+-----------------------------------------+-----------------------------------------+
```

---

## 6. Architecture Decision Records (ADRs)

### ADR 001: Selection of Expo SDK 54 & Expo Router v6
- **Context:** Mobile application needed file-based routing, smooth updates, and cross-platform native builds.
- **Decision:** Adopt Expo SDK 54 with Expo Router v6.
- **Consequences:** Simplified navigation code, seamless OTA updates via Expo EAS, clean TypeScript route typing.

### ADR 002: Dual State Management (Zustand + React Query)
- **Context:** Separating local UI state from server data caching.
- **Decision:** Use Zustand for client state (auth, presence, theme) and React Query for server cache (attendance, chat messages, payslips).
- **Consequences:** Zero state duplication, automated background revalidation, minimal re-renders.

### ADR 003: Socket.IO with Injected Extra Handshake Headers
- **Context:** Authorization failure on mobile WebSockets.
- **Decision:** Pass `Authorization`, `Tenant-ID`, and `User-ID` inside `extraHeaders` during socket transport setup.
- **Consequences:** Solved real-time presence synchronization between Web and Mobile clients permanently.
