# OMS Developer Onboarding & Coding Standards Manual

> **Purpose:** 30-minute developer onboarding guide, folder directory reference, coding standards, and DX best practices.  
> **Audience:** New Engineers, Mobile Developers, Frontend Contributors.  
> **Owner:** Engineering Operations & Developer Experience Guild.  
> **Last Updated:** July 20, 2026  
> **Related Modules:** `mobile/src/`, `mobile/app/`  

---

## 1. 30-Minute Onboarding Checklist

```
 [x] Step 1: Clone Repository & Install Node 20.x
 [x] Step 2: Run `npm install` in root & `mobile/` directory
 [x] Step 3: Copy `mobile/.env.example` to `mobile/.env.local`
 [x] Step 4: Verify API reachability (`https://oms-xdcz.onrender.com/health`)
 [x] Step 5: Start Metro Bundler via `npm run start` inside `mobile/`
 [x] Step 6: Verify TypeScript types via `npx tsc --noEmit`
```

---

## 2. Directory Responsibility Matrix

| Directory | Purpose | Best Practices | Forbidden Practices |
| :--- | :--- | :--- | :--- |
| `mobile/app/` | Expo Router navigation pages & routes | Keep pages light; delegate business logic to feature hooks | Do NOT place reusable UI or API business logic here |
| `mobile/src/features/` | Modular feature domains (chat, attendance, payroll) | Keep hooks, services, and types encapsulated inside the feature folder | Do NOT cross-import private helpers between unrelated feature folders |
| `mobile/src/shared/` | Shared UI components, theme, services, and stores | Maintain generic, highly reusable components and services | Do NOT put feature-specific API endpoints in shared components |
| `mobile/src/config/` | Environment & app configuration (`env.ts`) | Access environment configuration strictly via `import ENV from '...'` | Do NOT access `process.env` directly in feature screens |

---

## 3. Coding & Style Conventions

### TypeScript Standards
- Enable strict mode (`"strict": true`).
- Avoid `any`. Define explicit interface schemas for API responses, components, and hooks.
- Use discriminated unions for status types (e.g. `type Status = 'Present' | 'Late' | 'Absent' | 'Half Day'`).

### Component Guidelines
- Use functional components with hooks (`const MyComponent: React.FC<Props> = ...`).
- Memoize heavy callbacks using `useCallback` and memoize derived calculations using `useMemo`.
- Never create inline object or function references inside loops or render props to prevent unnecessary re-renders.

### Logging Guidelines
- Always use structured log prefixes in services:
  - `[API]` for Axios REST network calls.
  - `[Socket]` for WebSocket lifecycle events.
  - `[Presence]` for user online status updates.
