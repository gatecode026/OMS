# OMS Mobile App – Enterprise Authentication Module (PRD-02)

## 🔐 Section 1 – Product Vision, Objectives & Global Implementation Rules

### Vision & Objective
Build a world-class, seamless, and secure authentication experience for the OMS Mobile Application. The system is designed to minimize login friction for daily enterprise operations while enforcing strict multi-tenant authorization policies.

### Design Integration
Every screen, element, and transition inside the authentication flows must consume our centralized design tokens from the Enterprise Design System. Do not introduce custom themes, visual colors, margins, or components.

### Startup Boot Sequence
Upon application launch, the App Shell and Auth Module coordinate the following sequence:
`App Boot` ➔ `Restoring Theme (themeStore)` ➔ `NetInfo check` ➔ `JWT Claims check (authStore)` ➔ `Refresh Token (Silent validation)` ➔ `Retrieve profile & roles` ➔ `Resolve Tenant Branding` ➔ `Navigate (Dashboard OR Tenant Gate)`

### Security Rules
- **Encrypted Storage**: Active JWT tokens (Access and Refresh) are stored securely using platform-level keychain APIs (`expo-secure-store`).
- **Silent Refresh Interceptors**: Expired access tokens trigger auto-refresh actions via `/auth/refresh`. Tapping logout cleans secure caches and unmounts the Main Stack.
- **Biometric & MFA Ready**: The hooks and context APIs expose states prepared to support biometrics, multi-factor logins, and Single Sign-On (SSO) gateways in future updates.

---

## 🗺️ Section 2 – Information Architecture, User Journey & Authentication Flows

### User Journey Scenarios
- **First App Launch**: Splashes, detects no active session, guides user to the company lookup and login form, then maps them to the dashboard post-success.
- **Returning User / Silent Restore**: Splashes, checks secure token storage, validates tokens, refreshes silently if expired, and enters dashboard immediately.
- **Token Expiry & Recovery**: Intercepts expired credentials via silent JWT refresh cycles. If the refresh token is also invalid, the app destroys the session caches and drops to the company input portal.
- **Offline Entry**: If user has a valid cached session, allows offline access to cached routes and files, presenting network notification badges. If login forms require submit validations, it blocks action until connectivity returns.

### Core Authentication Flows
- **Credentials Login Flow**: Form validation ➔ Submit credentials ➔ Store tokens locally ➔ Retrieve roles and claims ➔ Resolve dynamic company branding ➔ Navigate to Dashboard.
- **Forgot Password Flow**: Input verified email ➔ Send request ➔ Verification checks ➔ Verify with OTP / link ➔ Select new password ➔ Route back to Login.
- **Session Logout Flow**: User selects logout action ➔ Shows confirmation dialog ➔ Clears secure tokens ➔ Purges query/store caches ➔ Redirects to the authentication stack.

---

## 🎨 Section 3 – Enterprise Splash Screen & App Initialization

### Startup Orchestrator
The Splash screen operates as our App Bootstrapping Engine. It manages initial app configurations and makes routing decisions before presenting any view to the user.

### App Initializations & Checks
1. **Locales & Styles**: Restores user color theme (Light/Dark/Auto) and active language settings.
2. **Network Checks**: Detects internet connection state. If offline but valid session tokens are cached, it enters offline mode; otherwise, it retry-polls or shows the offline connection warning.
3. **Tenant & Brand Resolution**: Resolves branding colors, company name, and logo icons dynamically. Falls back to default OMS branding rules if tenant loading fails.
4. **Maintenance Verification**: Inspects API status. If the backend returns maintenance codes, the bootloader halts navigation and overlays the Maintenance Screen.
5. **Gateway routing**: Silent tokens check decides the next step (routing directly to the main Dashboard or dropping to the Login workspace).


