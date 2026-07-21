# OMS Deployment, EAS Build & Production Release Playbook

> **Purpose:** Comprehensive deployment guide for Expo EAS mobile builds, Render backend hosting, and OTA updates.  
> **Audience:** DevOps Engineers, Release Managers, Mobile Engineers.  
> **Owner:** DevOps & Infrastructure Engineering Team.  
> **Last Updated:** July 20, 2026  
> **Related Modules:** `mobile/`, `backend/`  

---

## 1. Expo EAS Mobile Build Pipelines

The mobile app utilizes **Expo Application Services (EAS)** for native iOS (`.ipa`) and Android (`.apk` / `.aab`) build workflows.

### Configuration (`eas.json`)
- **Development Profile:** Builds `.apk` for Android emulators with Expo Dev Client.
- **Preview Profile:** Internal testing build distributed via Expo EAS Internal Distribution.
- **Production Profile:** Generates production-ready `.aab` (Android App Bundle) and iOS `.ipa` for Google Play Console & Apple App Store Connect.

### Execution Commands
```bash
# Build Android Development APK
eas build --profile development --platform android

# Build Production Android Bundle (.aab)
eas build --profile production --platform android

# Build Production iOS App (.ipa)
eas build --profile production --platform ios
```

---

## 2. OTA (Over-The-Air) Updates Workflow

For JavaScript and asset changes that do not modify native C++/Java/Obj-C code:

```bash
# Publish OTA Update to Production Channel
eas update --branch production --message "Hotfix: Attendance QR sync and chat presence"
```

---

## 3. Render Backend Deployment

The backend Node.js API & Socket.IO server is deployed on **Render**:
- **Production Service URL:** `https://oms-xdcz.onrender.com`
- **Build Command:** `npm install`
- **Start Command:** `node src/server.js`
- **Health Endpoint:** `GET /health` (Returns HTTP 200)

### Pre-Deployment Checklist
- [x] All environment variables set on Render Dashboard (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`).
- [x] Verified zero database migration gaps.
- [x] Run `npx tsc --noEmit` in mobile workspace to confirm API contract compatibility.
