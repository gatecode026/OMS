# OMS Mobile Application Client

> **Purpose:** Developer guide and codebase documentation for the OMS React Native Mobile Application.  
> **Audience:** Mobile Engineers, React Native Developers, UI/UX Designers.  
> **Owner:** Mobile Engineering Team.  
> **Last Updated:** July 20, 2026  
> **Related Modules:** `src/app/`, `src/features/`, `src/shared/`, `docs/`  

---

## 📱 Workspace Structure Overview

The mobile app is built with **Expo Router v6** (file-based navigation) and a modular feature-driven architecture under `src/features/`.

```
mobile/
├── app/                      # File-based Expo Router Navigation
│   ├── (auth)/               # Unauthenticated Auth Flow (Login, OTP, Signup)
│   ├── (app)/                # Authenticated Application Screens
│   │   ├── (tabs)/           # Main Tab Bar Screens (Dashboard, Chat, Attendance, Payroll, Profile)
│   │   ├── attendance-history.tsx
│   │   ├── chat/             # Direct Chat & Group Conversation Screens
│   │   └── ...
│   └── _layout.tsx           # Global Root Navigation & Context Providers
├── src/                      # Source Code
│   ├── config/               # Environment Configuration (`env.ts`)
│   ├── features/             # Modular Domain Features
│   │   ├── attendance/       # Hooks, Services & Components for Punch & History
│   │   ├── chat/             # Chat Sockets, Threads, Media & Voice Messages
│   │   ├── payroll/          # Payslips & Salary Calculation Components
│   │   ├── profile/          # User & Bank Profile APIs & Stores
│   │   └── ...
│   ├── shared/               # Shared Utilities & Platform Core
│   │   ├── components/       # Card, Badge, Skeleton, BottomSheet, Inputs
│   │   ├── hooks/            # useTheme, useOffline, useAppState
│   │   ├── services/         # apiClient (Axios), socketManager
│   │   ├── store/            # Auth, Presence & Theme Zustand Stores
│   │   └── theme/            # Tokens, Typography & Color Palettes
└── package.json
```

---

## 🛠 Features & Capabilities

- **Real-Time Enterprise Chat:** Direct messages, group chats, message replies, typing indicators, image/file attachments, voice notes, and read receipts.
- **Attendance & Geo-Fencing:** GPS location verification, live Punch-In / Punch-Out, monthly attendance history calendar, and punch correction request workflow.
- **Payroll & Leaves:** Payslip previews, tax breakdowns, leave application submissions, and manager approvals.
- **Offline Support:** Local caching with Zustand persistence and an offline HTTP request queue (`offlineStore`).
- **Presence System:** Automatic online/offline status broadcasting synchronized with the web client via Socket.IO.
- **Theme System:** Dynamic Light and Dark modes with automatic OS theme matching.

---

## 🚀 Environment Setup

Copy `.env.example` to `.env.local` or `.env.development`:

```env
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_URL=https://oms-xdcz.onrender.com
EXPO_PUBLIC_TIMEOUT=15000
EXPO_PUBLIC_APP_NAME=OMS (Dev)
EXPO_PUBLIC_ENABLE_LOGGER=true
```

### Running Locally
```bash
# Start metro bundler
npm run start

# Launch on Android Emulator
npm run android

# Launch on iOS Simulator
npm run ios
```

---

## 🧪 Testing & Code Quality

```bash
# Run unit and component test suites
npm run test

# Run static TypeScript type checks
npx tsc --noEmit
```
