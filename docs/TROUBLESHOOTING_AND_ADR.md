# OMS Troubleshooting Manual & Knowledge Base

> **Purpose:** Diagnostics manual covering runtime issues, root cause analyses, solutions, and architectural FAQs.  
> **Audience:** Core Engineers, Onboarding Developers, Support Leads.  
> **Owner:** SRE & Mobile Engineering Guild.  
> **Last Updated:** July 20, 2026  
> **Related Modules:** `mobile/`, `backend/`  

---

## 1. Common Issues & Solutions

### 🔴 Issue 1: Users Always Show Offline on Mobile
- **Symptom:** Web application displays online users, but mobile app shows everyone as offline.
- **Root Cause:** Missing `extraHeaders` in `SocketManager.ts`. Sockets were connecting without `Authorization` and `Tenant-ID` headers.
- **Solution:** Inject custom headers into `socketManager` handshake options:
  ```typescript
  extraHeaders: {
    Authorization: `Bearer ${token}`,
    'Tenant-ID': companyId,
    'User-ID': userId,
  }
  ```

### 🔴 Issue 2: `Maximum update depth exceeded` Error in Direct Chat
- **Symptom:** App enters infinite render loop when opening a direct conversation thread.
- **Root Cause:** Dynamic inline object literal creation inside Zustand selectors (`useChatSettingsStore`).
- **Solution:** Use static default object fallbacks (`DEFAULT_WALLPAPER`, `DEFAULT_NOTIFICATION_CONFIG`) to maintain reference stability across re-renders.

### 🔴 Issue 3: HTTP 404 on API Requests
- **Symptom:** Network request returns HTTP 404 for employee profile endpoint.
- **Root Cause:** Path mismatch (`/api/v1/me` instead of `/api/v1/employees/${id}` or `/api/v1/profile`).
- **Solution:** Enforce standardized API endpoint routes in `profileApi.ts`.

---

## 2. Developer Knowledge Base & FAQs

### Q1: How do I test real-time presence between Web and Mobile locally?
Ensure both web and mobile point to `https://oms-5rmc.onrender.com` or the same local backend IP (`http://<YOUR_IP>:5000`). Verify that the tenant ID matches on both clients.

### Q2: How does the attendance QR Code work offline?
The `AttendanceQRScreen` generates a deterministic 25x25 vector SVG QR code locally from the database employee ID payload, allowing office kiosks to scan it even when cellular data is intermittent.
