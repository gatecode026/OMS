# OMS Mobile App — Design Philosophy & Global Design Rules

This document establishes the official design language, philosophy, vision, layout, interactions, and quality standards for the OMS Mobile Application. Every screen, component, interaction, animation, and layout created in future updates MUST follow these rules without exception.

---

## 🎨 Design Vision

The OMS Mobile App is designed as a premium enterprise SaaS product used daily by professionals. The experience combines the clarity of productivity tools with the polish of modern fintech applications.

The interface must be:
- **Clean & Minimal**
- **Premium & Elegant**
- **Calm & Fast**
- **Professional & Friendly**
- **Trustworthy**

Avoid harsh black backgrounds, oversaturated colors, heavy gradients, thick borders, excessive glassmorphism, or inconsistent spacing.

---

## 📐 Layout & Spacing Rules

Every screen should follow a predictable structure:
1. **Safe Area**: Insets calculated dynamically per platform.
2. **Header**: Clean top bar with optional back navigation and right accessories.
3. **Screen Title**: Large title text using responsive typography scales.
4. **Primary Content**: Rounded cards with generous padding and subtle shadows.
5. **Secondary Actions**: Placed logically near screen bottoms or inline.
6. **Bottom Navigation**: Tab bar with active theme colors.

### Core Spacing Tokens:
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 20px
- `xxl`: 24px
- `3xl`: 32px
- `4xl`: 40px
- `5xl`: 48px
- `6xl`: 64px

---

## ⚡ Motion & Interaction Philosophy

Animations and interactions should enhance usability rather than distract. Every transition should feel lightweight and responsive:
- **Button Press**: Spring scale downs (e.g. scale to 0.96) for solid touch feedback.
- **Page Transitions**: Slide-from-right animation on standard stacks.
- **Overlays**: Spring slide-up for bottom sheets; fade-in for dialogs and modals.
- **Toasts & Snackbars**: Auto-dismissing banners with spring translateY actions.

---

## ♿ Accessibility Rules

Accessibility is a requirement, not an optional enhancement. Every component must support:
- **Contrast**: Text and indicators must maintain accessible contrast ratios against surfaces.
- **Dynamic Fonts**: Support system font size scaling.
- **VoiceOver & TalkBack**: Provide `accessible`, `accessibilityRole`, and `accessibilityLabel` details on all touch targets.
- **Touch Target**: Touch surfaces must be at least 48x48 dp.

---

## 💎 Design Quality Standard Checklist

Before any screen is considered complete, it must satisfy the following questions:
- Does it match the OMS visual identity?
- Is the hierarchy clear?
- Are actions easy to find?
- Is spacing consistent?
- Does it work in Light Mode?
- Does it work in Dark Mode?
- Does it support accessibility?
- Is every component reusable?
- Are animations subtle and smooth?
- Does it feel like an enterprise product rather than a template?

---

## 💎 Section 2 – Brand Identity & Visual Language

### Brand Personality & Visual Feel
The OMS Mobile App visual interface communicates **Trust, Professionalism, Simplicity, Precision, Speed, Reliability, and Premium Quality**. It avoids cartoonish, colorful, gaming-inspired, or generic template styles, creating a unique identity.

### Visual Hierarchy
Information flows downwards cleanly:
`Primary Action` ➔ `Important Info` ➔ `Secondary Info` ➔ `Supporting Info` ➔ `Background Elements`

### Spacing & Spacing Philosophy
- **White Space is a Design Element**: Spacing is used to establish rhythm and structure, rather than trying to fill every empty screen area.
- Generous margins and clear separation prevent visual overload and maintain data density balances.

### Layout Details
- **Cards**: All content resides in lightweight, rounded, soft cards with subtle shadows and minimal borders.
- **Dividers & Borders**: Borders and dividers are kept extremely subtle and used only when spacing is insufficient for division.
- **Iconography**: Clean, outlined vector icons (e.g. from the `Ionicons` / `Lucide` style family) with consistent stroke widths. Avoid mixing filled and outlined styles.
- **Illustrations**: Premium flat/semi-flat enterprise illustrations with soft color palettes for Empty, Error, and Success states.
- **Data Density**: Information is grouped in progressive sections to prevent cognitive overload.

### Anti-patterns to Avoid
- ✗ Neon colors or overly bright gradients
- ✗ Pure black/very dark saturated backgrounds
- ✗ Bulky or distracting navigation bars
- ✗ Inconsistent corner radiuses or shadow weights
- ✗ Mixed icon packs or generic template layouts

---

## 🎨 Section 3 – Enterprise Color System & Theme Tokens

### Theme Architecture & Support
- The application supports **Light Theme**, **Dark Theme**, **Auto (System) Theme**, and **Dynamic Tenant Branding**. 
- Switching happens instantaneously through our reactive Zustand + Context hooks without visual flickering.

### Color Tokens & Semantic Naming Rules
- Hex codes are never hardcoded inside UI components. All styles reference semantic design tokens:
  - **Core Intent**: `Primary`, `Secondary`, `Success`, `Warning`, `Danger` (`Error`), `Info`, `Neutral`.
  - **Surfaces & Layout**: `Background`, `Secondary Background`, `Card Background`, `SurfaceElevated`, `Divider`, `Border`.
  - **Text Hierarchy**: `Primary Text`, `Secondary Text`, `Muted Text`, `Placeholder`, `Disabled Text`.
  - **Inputs & Buttons**: `Input Background`, `Button Background`, `Active Border`, `Focused Border`.
  
### Theme Personality Rules
- **Light Theme**: Bright, clean, and airy. Warm neutral off-whites (like Slate 50) are used instead of harsh pure `#FFFFFF`.
- **Dark Theme**: Deep navy and slate/graphite tones. Harsh OLED black `#000000` is avoided to reduce eye strain while preserving proper WCAG contrast.

### Scoped Module Colors
- **Attendance**: Checked In (`success`), Checked Out (`neutral`), Late (`warning`), Absent (`danger`), Holiday (`info`).
- **Leaves**: Approved (`success`), Rejected (`danger`), Pending (`warning`), Cancelled (`neutral`).
- **Tasks**: Open/Assigned (`info`), In Progress (`warning`), Completed (`success`), Blocked/Overdue (`danger`).
- **Payroll**: Base Salary, Bonuses, Deductions, and Net Pay are styled with consistent soft intents.

### Accessibility Contrast
- All color combinations are designed to meet standard accessibility contrast ratios. Color is never used as the sole indicator for states; it is always paired with supporting icons, labels, or badges.

---

## ✍️ Section 4 – Enterprise Typography System

### Typography Philosophy
Typography underpins the visual structure of OMS Mobile. The interface uses a clean, non-decorative, and confident type scale to allow users to scan enterprise information instantly. Playful or overly decorative type treatments are strictly prohibited.

### Font Family & Weights
- **Primary Font**: `Inter` is the primary font family across iOS and Android, with standard system fallbacks.
- **Font Weights**: Standardized into distinct weights:
  - `Regular` (Body copy, primary lists)
  - `Medium` (Secondary controls, form fields)
  - `SemiBold` / `Bold` (Headings, titles, badges, and primary buttons)
  - Bold weight is applied selectively to keep layouts feeling airy and light.

### Type Scale Hierarchy
Typography tokens are centralized and divided into distinct sizes with matching line heights to prevent overlapping:
- **Display**: For dashboards, totals, and primary stat values (Display XL down to Display Small).
- **Heading**: For major screen dividers and title headers (Heading XL down to Heading Small).
- **Title & Subtitle**: For cards, profile headers, lists, and section headers.
- **Body & Caption**: For descriptions, form hints, and metadata.
- **Supporting Labels**: For input fields, button labels, table headers, and badges.

### Special Rules for Numeric Data
As an enterprise app containing figures (salaries, working hours, ID counts, charts), numbers must:
- Use consistent tabular alignment.
- Implement explicit tracking rules to avoid visual bunching.
- Pair with clean labels to clearly communicate units and metrics.

### Accessibility & Responsiveness
- All typography tokens must scale proportionally to support system-wide **Dynamic Font Scaling** and large text accessibility modes.
- Text sizes automatically resize dynamically across small screens, large phones, and tablets to maintain hierarchy balance.

---

## 📐 Section 5 – Enterprise Layout, Grid & Spacing System

### Spacing Scale Rules
Rhythm in the UI is achieved exclusively through the spacing scale. Margins and paddings are never created ad hoc; they must select from our base-8 scale:
- `4px`, `8px`, `12px`, `16px`, `20px`, `24px`, `32px`, `40px`, `48px`, `56px`, `64px`, `72px`, `80px`, `96px`, `128px`

### Global Outer Padding & Safe Areas
- All standard screens (Dashboard, Tasks, Leaves, Profile) share a uniform outer padding.
- Spacing automatically accommodates system insets (Notches, dynamic islands, home gesture bars, and landscape margins).

### Vertical Section Structures
Screens follow a clean top-to-bottom hierarchy with consistent vertical gaps between blocks:
`Safe Area / Notch` ➔ `Header` ➔ `Screen Title` ➔ `Quick Action Bar` ➔ `Primary Content Cards` ➔ `Secondary/List Content` ➔ `Bottom Action Items` ➔ `Tab Bar / Navigation`

### Grid & Layout Rules
- **Dashboard Grid**: Widgets, charts, and metric stats snap to a clean, adaptive layout (1-column on compact phones, 2-column or 3-column on landscape/tablets).
- **Cards**: Contain explicit interior padding, matching corner radiuses, and balanced text hierarchies.
- **Forms**: Generous, uniform gaps separate inputs. Field groups are clustered logically with labels, input fields, and inline error states.
- **Lists & Tables**: Align elements (Avatars, icons, titles, and tags) consistently. Lists utilize swipe actions; tables support sticky headers and horizontal overflow grids when required.
- **Overlays (Sheets & Modals)**: Include default handlebar indicators, headers, scrollable containers, action buttons, and bottom safe-area offsets.

### State Transitions (Skeletons & Errors)
- Skeletons must mirror the final loaded component dimensions to avoid structural page jumps.
- Error and Empty states use generous, balanced padding to preserve section heights and provide user recovery buttons.

---

## 🔲 Section 6 – Enterprise Surface, Elevation & Shape System

### Shape & Corner Radius System
Avoid hardcoded corner radiuses or sharp edges. The application uses a unified radius scale:
- **Small Radius (`xs` / `sm`)**: For badges, pills, status flags, tags, and small input components.
- **Medium Radius (`md` / `lg`)**: For standard buttons, inputs, dropdown menus, cards, and quick actions.
- **Large Radius (`xl` / `xxl`)**: For dialog modals, bottom sheet overlays, profile headers, and dashboard widgets.
- **Full Radius (`circular`)**: For user avatars, status rings, active indicators, and floating buttons.

### Elevation & Layer Hierarchy
Visual depth is established by stacking surfaces sequentially rather than using decorative layers:
1. **Background**: Low-contrast neutral layer.
2. **Card Surfaces**: Soft elevated blocks where actions are performed.
3. **Floating Widgets / Headers**: Sticky app headers and scrollable content controls.
4. **Overlays**: Bottom sheets, modal dialogs, snackbars, and toasts.

### Shadow Guidelines
- **Light Theme**: Soft, wide, and low-opacity shadows. Avoid harsh edges or black outlines.
- **Dark Theme**: Depth is created using borders and distinct surface contrast values rather than traditional drop shadows.
- **Performance**: Shadow configurations must remain lightweight and GPU-friendly to ensure smooth 60fps scrolling on both iOS and Android.

### Interaction Surfaces
All interactive surfaces must define and support states uniformly:
`Default` ➔ `Pressed` ➔ `Focused` ➔ `Disabled` ➔ `Loading` ➔ `Selected`
- **Buttons**: Spring scale-down animations when pressed.
- **Inputs**: Focus is communicated via borders and tint colors, not excessive glows.
- **Modals & Bottom Sheets**: Render as floating cards or rounded sheets with clear handlebars, maintaining clean boundaries against the page.

---

## 🎨 Section 7 – Enterprise Iconography, Illustrations & Visual Assets

### Iconography Rules
To maintain visual consistency, only one icon family is used throughout the application. 
- **Approved Icon Library**: `Ionicons` (or `Lucide` / `Phosphor` equivalents) in outlined, rounded, and minimal configurations. Mixing multiple icon packs (like FontAwesome or Material Design) is strictly prohibited.
- **Sizes**: Standardized into explicit scales (Extra Small, Small, Medium, Large, Hero) with uniform stroke weights.
- **Interaction Feedback**: Interactive icons must support state transitions (Default, Pressed, Disabled, and Active/Selected).
- **Mapping Consistency**: The same icon must always represent the same concept or action across all modules (e.g. `calendar` always representing scheduling, `checkmark-circle` representing success).

### Illustration & Graphic Guidelines
Illustrations are used to communicate context rather than serve as decorative elements. They should only appear in:
- **Empty States**: Customized illustrations for "No Tasks", "No Notifications", or "No Attendance Records".
- **Error States**: Reusable graphics for "Server Offline", "Unauthorized", or "Unexpected Error" screens.
- **Onboarding & Success States**: Clean workflows reassuring the user when submitting logs or changing profiles.
- **Style constraints**: Minimal, flat or semi-flat vector illustrations using the soft branding color palette. Cartoonish or overly playful figures are excluded.

### Avatar & Brand Assets
- **Avatar System**: Displays initials or cached profile images inside rounded grids. Includes support for user status presence indicators (e.g. Online/Offline status rings).
- **Company Branding**: Logos must support light/dark transparency bounds and maintain strict aspect ratios without distortion.
- **Image Caching**: All image loaders use automatic optimization, placeholder fades, and caching (leveraging `expo-image`) to prevent rendering lag.

---

## ⚡ Section 8 – Enterprise Motion, Animation & Micro-Interaction System

### Motion Engine & Performance
- **React Native Reanimated**: All complex visual transitions, springs, and layouts are driven by Reanimated for native 60 FPS performance, keeping the JS thread clean.
- **Transforms & GPU-Friendly Actions**: Durations are kept short (typically 150ms to 300ms) utilizing hardware-accelerated properties (like `scale`, `opacity`, `translateY`). Layout reflow recalculations are avoided during animation cycles.

### Screen & Navigation Transitions
- Screen navigation actions follow consistent push/pop slide patterns or fade entries.
- Overlays, bottom sheets, and dialogs enter using spring curves, responding smoothly to gestures (drag-to-dismiss, swiping) with elastic rebounds.

### Reusable UI Micro-Interactions
- **Buttons & Cards**: React instantly to touch states (scale springs to 0.96 or 0.98 on press, fading to disabled opacity rules on trigger states).
- **Forms & Inputs**: Validation errors, helper transitions, and focus highlights slide and fade into view smoothly to prevent sudden layout jumps.
- **Loading states & skeletons**: Skeleton loaders utilize continuous linear shimmer loops, mapping exactly to final loaded element heights.

### Platform Haptics
- Tactile feedback (via `expo-haptic` or `react-native-haptics`) triggers on primary actions (e.g., check-in confirmation), success notifications, or error validation overrides.

### Reduced Motion Accessibility
- The motion engine respects user-level system settings. If **Reduce Motion** is active, standard spring scaling and translations automatically fallback to instant cuts or simple opacity fades.

---

## 🧩 Section 9 – Enterprise Component Library

### Component Strategy & Architecture
All screens must be composed using only centralized, reusable UI elements. Screen-specific custom style modifications are strictly forbidden. If a custom variant is required, developers must extend the existing component props instead of duplicating files.

### Foundation & Input Elements
- **Buttons**: A standardized series (`Button`, `IconButton`, `FloatingButton`) supporting solid, outlined, text, and loading status variants, reacting instantly with spring touch scales.
- **Inputs & Forms**: Centralized components for text, passwords, search bars, dropdown selectors, date/time picker modules, and text areas. Includes `FormContainer`, labels, validation overrides, helper texts, and validation error wrappers.

### Cards & Layout Elements
- **Cards**: Base card layouts adapted for stats, check-ins, tasks, announcements, payroll details, reporting structures, and user profiles. Contains unified rounded borders and subtle drop shadow tokens.
- **Avatars**: Initial-based avatars or cached network images with status indicator rings (representing user activity presence).
- **Status Indicators**: Clean badges, chips, tag items, and status pills matching semantic color intents.

### Navigation & List Controls
- **Headers & Navigation**: Tab selectors, collapsible app headers, breadcrumbs, segment controls, and bottom navigation layouts with native safe-area inset alignments.
- **Lists & Timeline Items**: Reusable timeline blocks, grouped lists, activity feeds, swipeable cell items, and scroll states.

### Data Grid & Feedback Panels
- **Data & Tables**: Progress bars, linear/circular loaders, KPI indicators, key-value detail rows, and table columns.
- **Overlay Feedback**: Slide-up bottom sheets, modal alert boxes, snackbar/toast notifications, and success/warning/error status banner alerts.
- **Empty & Error states**: Layout-stable skeletons, retry interfaces, offline warnings, and onboarding layouts.

---

## 🧭 Section 10 – Enterprise Navigation System & Information Architecture

### Primary Tab Layout
The app utilizes a fixed, five-tab bottom navigation structure for root destinations:
- **Home / Dashboard**: Central aggregation hub.
- **Attendance**: Shift logging, history, and status updates.
- **Tasks**: Priority checklists and collaboration feeds.
- **Notifications**: Central alerts box.
- **Profile / Settings**: Personal details, reporting hierarchy, and app options.

### Navigation Hierarchy Rules
To prevent users from getting lost, layout transitions must maintain strict depth hierarchies:
`Level 1: Root Tabs` ➔ `Level 2: Feature Overview` ➔ `Level 3: Detail Pages` ➔ `Level 4: Create/Edit Forms` ➔ `Level 5: Previews / Confirmations`

### Header & Screen Elements
Every screen utilizes a standardized `Header` component supporting:
- Consistent status and safety inset paddings.
- Standardized back buttons, titles, subtitles, search triggers, and action icons.
- Notification badges and user profile avatar circles.

### Secondary Flow Architecture
- **Filters & Menus**: Must open inside bottom sheet modals rather than taking up the full screen, unless highly complex.
- **Global Search**: Supports recent queries, suggestion lists, and instant filter chips.
- **Deep Linking**: Configured to resolve routes directly for tasks, checks, leaves, and profiles from push notifications.

---

## 📱 Section 11 – Enterprise Screen Templates & Layout Patterns

### Approved Screen Blueprints
All core views are structured around ten official layouts to maintain predictability across different modules. Developers should select the closest layout when creating new views:
1. **Dashboard Template**: Includes greeting card, quick action segment links, statistics cards, and chronological activities or announcements.
2. **Module List Template**: Features search bars, filter buttons, scrollable rows (infinite scroll or paginated lists), and empty/no-results states.
3. **Details Template**: Composed of header navigation controls, a top-level details summary card, key-value metadata tabs, and a timeline history block.
4. **Create / Edit Form Template**: Standard vertical form layouts including section titles, nested input grids, keyboard-avoiding container blocks, and primary submit action bars.
5. **Approval Workflow Template**: Specific summary blocks, comments fields, attachments sliders, and double-action (Approve/Reject) button groups.
6. **Profile Template**: Centered avatar with user headers, core stats indicators, organized personal details blocks, and application configurations.
7. **Calendar Template**: Unified agenda headers, calendar grids, schedule listings, and new event action triggers.
8. **Analytics Template**: Filters, primary KPI widgets, line/bar charts, and scrollable data detail grids.
9. **Settings Template**: Grouped configuration settings, toggle rows, detail rows, and logout buttons.
10. **Search Results Template**: Dynamic query inputs, suggestion chips, results, and illustrative empty states.

### Standard Layout Adapters
- **State States**: Skeletons, offline notifications, or missing permission barriers must map directly to template heights.
- **Device Support**: All templates adapt structurally across regular phone screens, large screens, and landscape/tablet modes.

---

## 📝 Section 12 – Enterprise Forms, Validation & Input Experience

### Input States & Behaviors
Every input field (text, passwords, dropdowns, pickers) must reactively support the following visual states:
`Default` ➔ `Focused / Active` ➔ `Typing` ➔ `Filled` ➔ `Disabled / Read-only` ➔ `Success / Error`
- Input containers feature character counters, labels, placeholders, optional/required indicators, helper texts, and validation messages.

### Password UX Guidelines
- Password forms feature toggles for show/hide visibility, password strength rules, and requirements checklist maps.
- Fields must support standard copy-paste and system autofill operations.

### Keyboard & Focus Behaviors
- **Keyboard Avoiding Views**: Inputs must never slide underneath the system keyboard. Containers must wrap using `KeyboardAvoidingView` or equivalent scroll/inset paddings.
- **Form Focus Loops**: Tapping "Next" on the keyboard must cycle focus cleanly to the subsequent input. Tapping "Done" or "Submit" should dismiss focus or trigger validation checks.

### Form Validation & Submission
- Inputs support regex validations (emails, phone formatting, credential parameters) and trigger instant client-side feedback.
- **Submission Lockouts**: Buttons enter a loading state and lock input fields during active API requests to prevent double-submissions. Success screens or field-specific inline error summaries display cleanly upon response resolution.

---

## 🔔 Section 13 – Enterprise Feedback System

### Visual Feedback Loop Philosophy
Every user interaction must receive an immediate, clear response so that the user is never left wondering if an action succeeded or if the app is frozen.

### Standardized Feedback States
- **Loading & Skeletons**: Standard skeleton shapes replace blank screens for initial content fetches. Button loaders block secondary tap events; refreshing headers handle pull-to-refresh feeds seamlessly.
- **Success States**: Success screens or confirmation snackbars trigger instantly upon action resolution (e.g. "Leave Submitted").
- **Error Indicators**: Centralized validation overlays, HTTP connection error sheets, and permission alerts. All error templates must provide a clear path to recovery (such as a "Retry" or "Reconnect" button).
- **Offline States**: Banners indicating offline status, cached storage indicators, and auto-sync queue trackers.
- **Toasts & Snackbars**: Auto-dismissing panels styled by intent (Success, Warning, Danger/Error, Info) with optional "Undo" action links.

---

## 🌍 Section 14 – Accessibility, Responsiveness & Internationalization

### Core Accessibility Requirements
Accessibility is integrated from the ground up to support all enterprise users:
- **Screen Reader Support**: Active elements must supply `accessible`, `accessibilityLabel`, and `accessibilityHint` attributes. Screen reader announcements trigger for state outcomes (such as offline/online shifts).
- **Interactive Targets**: Minimum touch target dimensions are `48x48 dp`.
- **Dynamic Text Scaling**: Styles must use system scaling without clipping text or causing layout wraps.
- **Reduced Motion**: Spring and translate transforms switch to clean opacity fades if system-level motion reduction is active.

### Responsive Design Principles
- **Adaptive Layouts**: View layers adapt smoothly between compact mobile displays, foldables, and landscape tablet grids.
- **Grid Layouts**: Columns switch dynamically from single-column on standard portrait displays to multi-column blocks on tablets.

### Internationalization Ready (i18n)
- **Localizations**: Strings are referenced dynamically via centralized language bundles (preparing the app for future translation profiles).
- **Format Utilities**: Dates, times, numbers, and currency values are formatted localized using standard libraries (such as `dayjs` for calendars and formatting locales).
- **RTL Alignment**: Layout elements support Right-to-Left (RTL) reading flows automatically without hardcoded horizontal margins.

---

## 🎨 Section 15 – Enterprise Theme Engine & Design Token Architecture

### Token Hierarchy Strategy
Every visual element must reference centralized design tokens instead of using hardcoded variables or inline styles:
`Foundation Tokens (Palette, base sizes)` ➔ `Semantic Tokens (Core intents: Primary, Success, Border)` ➔ `Component Tokens (Button active bg, input borders)` ➔ `UI Layouts`

### Light, Dark, & System Auto Themes
- **Light Theme**: Built on soft, off-white background variables (avoiding pure `#FFFFFF`) with balanced typography contrast.
- **Dark Theme**: Standardized using deep slate/navy surfaces (avoiding OLED pure black) to minimize visual fatigue while satisfying contrast standards.
- **Auto (System) Mode**: Switch events sync instantly without layout resets.

### Dynamic Tenant Branding
- Primary, secondary, and accent colors load at runtime from the tenant branding configuration API.
- Custom colors map into dynamic theme providers while preserving semantic contrast (e.g. automatically resolving accessible text highlights on custom brand color backgrounds).

### Persistence & Performance
- Selected settings (user theme adjustments, dynamic brand parameters) are cached securely on the device and restored instantly at startup.
- Theme switching is optimized to prevent layout shifts or screen flickers.

---

## 🏗️ Section 16 – Enterprise Component Library & UI Architecture

### Component Hierarchy & Flow
The application layout is built strictly using reusable components, ensuring that local style modifications are never introduced directly in modules. The hierarchy flow is structured as follows:
`Application` ➔ `Feature Modules` ➔ `Feature Screens` ➔ `Enterprise Components` ➔ `Primitive Components` ➔ `Semantic Tokens` ➔ `Foundation Tokens`

### Scale Directory Structure
All components are organized systematically inside the `/mobile/src/shared/components` directory:
- `/primitives`: Base containers (`Box`, `Stack`, `Row`, `Column`, `Spacer`), text typography, and basic divider separations.
- `/buttons`: Reusable button classes (`Button`, `IconButton`, `FloatingButton`) managing state styles (pressed, disabled, loading).
- `/inputs`: Text inputs, password forms, OTP input cells, picker dropdowns, autocomplete listings, and date selector modules.
- `/cards`: Base widgets styled for stats, check-ins, tasks, details cards, and employee dashboard metrics.
- `/feedback`: Overlays (`Modal`, `BottomSheet`, `Snackbar`, `Toast`, `Dialog`) managing animated slide-ins.
- `/loading`: Performance skeletons, spinners, and linear loading shimmers.
- `/empty-state`: Illustrated screens indicating empty, offline, or server error results with retry buttons.

### Implementation Principles
- **Separation of Concerns**: Visual components are presentation-only. Business logic and API queries (queries/mutations) are handled inside feature modules or custom store hooks.
- **Theme Reactivity**: Every component inherits light, dark, system auto, or dynamic brand styles using active tokens. Visual properties (colors, padding, spacing, shadows, radius) are never hardcoded.
- **Rendering Optimization**: Interactive widgets are optimized using `React.memo` and style caching to avoid unnecessary layout updates.
- **Strict Guidelines**: Developers must consume shared base elements and extend existing prop properties instead of creating screen-specific forks.

---

## 🧭 Section 17 – Enterprise Navigation System & Application Shell Architecture

### Application Shell Lifecycle
The Application Shell controls startup and configuration initialization prior to presenting screens to the user:
`App Boot` ➔ `Credentials Check (authStore)` ➔ `Tenant Configuration Lookup` ➔ `JWT Claims / Permission Fetch` ➔ `Theme Restorer (themeStore)` ➔ `Navigation Gateway Mount`

### Isolation of Route Stacks
- **Authentication Stack**: Isolated routing context for authentication screens (`/tenant`, `/login`, password resets). This stack is completely distinct from the main application view layers.
- **Main Application Stack**: The post-authentication view layer, organized around standard sub-stacks and Tab layouts.
- **Modal & Overlay Stack**: Lightweight bottom sheet panels, dialog windows, and transaction forms.

### Route Protection & Guards
Navigation is protected by route guards executing prior to layout rendering:
- **Authentication Guard**: Blocks app routes if active user tokens do not exist, redirecting to `/tenant`.
- **Tenant Guard**: Resolves and locks branding layouts against tenant identifiers.
- **Permission Guard**: Filters tabs, dashboard widgets, and actions at runtime based on backend roles (e.g. Super Admin, Manager, Employee).

### Routing Guidelines
- Navigation is handled through Expo Router context configurations. Hardcoding route strings directly inside components is discouraged; use standardized path mappings and navigation hooks.
- Views must maintain scroll offsets, selected values, and pending inputs when shifting between tab items or stack layers.

---

## 📝 Section 18 – Enterprise Forms, Validation & Data Entry Architecture

### Centralized Form Architecture
All form interactions are structured under a uniform registration system. Component visual presentation remains isolated from forms validation and lifecycle tracking:
`Form Provider (Zustand/FormHook)` ➔ `Form Context (Shared states: Values, Errors, Touched)` ➔ `Validation Engine` ➔ `Inputs Components`

### Input Fields & Verification States
Forms utilize standard primitives (`TextField`, `PasswordField`, selectors, pickers). Each input tracks and presents its state reactively:
- **Core States**: Default, Focused, Typing, Disabled, Valid/Invalid, Error/Success notifications, and optional character counters.

### Input Validation Architecture
- **Rules Engine**: Centralized validation covers formatting regex (emails, passwords, numbers, currency inputs), minimum/maximum lengths, matching constraints (passwords), and server-side duplicate detections.
- **Dynamic Forms**: Supports dynamic configurations (backend-driven conditional layouts, visibility shifts, and nested group list items).

### Lifecycle, Draft Recovery & Auto-Save
- **Draft Persistence**: Unsubmitted multi-step wizards or long forms automatically save active inputs in local secure caches to recover state after app background suspensions or crashes.
- **Attachment management**: File, image, and document upload slots feature compression ratios, progress loading percentages, and attachment retry queues.
- **Offline Forms**: Submissions attempted while offline are validated locally, placed in the sync queues, and committed sequentially upon network recovery.

---

## 🗄️ Section 19 – Enterprise State Management & Application Data Architecture

### Division of State Responsibility
The application organizes data states into distinct layers to minimize re-renders and guarantee scalability:
`Application / Global State (authStore, themeStore)` ➔ `Feature / Business State (local feature hooks)` ➔ `Server / Cache State (React Query cache)` ➔ `UI Layout State (Zustand filters, sorting)` ➔ `Component Local State (useState)`

### Local Repository Pattern
The application accesses backend information strictly using the Repository Pattern. Business components are decoupled from raw Axios fetching, consuming unified data repositories instead:
`UI Components` ➔ `Feature Stores / Hooks` ➔ `Repository Layer` ➔ `API client / Offline Database Caches`

### Cache & Offline First Execution
- **Server Cache (React Query)**: Standardizes caching timers, handles infinite scrolls/pagination requests, manages optimistic UI updates, and implements retry rules on network timeouts.
- **Offline Storage Queue**: Mutating requests attempted while offline serialize safely in local Secure Storage, queuing sync-replay pipelines that trigger automatically when connection returns.
- **Persistence Policies**: Dynamic company branding, session JWT tokens, and user accessibility options are persisted locally and restored during early app boot.

---

## 🔌 Section 20 – Enterprise API Layer, Networking & Offline Synchronization Architecture

### Core Networking Strategy
Direct network calls (Axios or fetch) inside screens, components, or layout templates are strictly prohibited. Every visual element must consume data via standardized repository interfaces.

### HTTP Client Configuration
Our Axios `apiClient` encapsulates all network layers and configurations:
- **Middleware Pipeling**: Request intercepts inject Authorization Bearer tokens, localization formats, active workspace IDs, and Tenant Headers (`x-tenant-id`).
- **Silent JWT Refresh**: Traps 401 Unauthorized responses, attempts token refreshes via `POST /api/v1/auth/refresh`, and transparently re-runs blocked requests.
- **Error Mapping**: Translates standard HTTP status errors (400, 401, 403, 404, 422, 500) into user-friendly localized messages.

### Offline Synchronization
- **Transaction Queues**: Mutations performed while offline are serialized and written into local JSON file queues.
- **Auto-Sync Replay**: NetInfo listener hooks automatically wake the sequential queue replay pipeline upon internet recovery.
- **Conflict Handling**: Implements retry timing backoffs and conflict resolution callbacks.

---

## 🔒 Section 21 – Enterprise Authentication, Authorization & Security Architecture

### Authentication & Identity Management
User sessions are managed securely utilizing standard OAuth2 and JWT architectures:
- **Credential Sign-In**: Supports standard tenant workspaces selection, user logins, biometric locks, and session refresh checks.
- **Storage Security**: JWT tokens (Access and Refresh) and sensitive credentials are encrypted and stored using `expo-secure-store` wrapper utilities (`secureStore.ts`).

### Role & Permission-Based Authorization
- **Role-Based Access Control (RBAC)**: Supports roles including `Super Admin`, `Organization Admin`, `HR`, `Manager`, `Supervisor`, and `Employee`.
- **Permission-Based Access Control (PBAC)**: Dynamic permission structures evaluated from active JWT claims. Navigations, UI items, tabs, and action triggers hide or show conditionally based on user claims.

### Security Enhancements & Session Rules
- **Silent Refresh Interceptors**: Automatically recovers expired access tokens by hitting `/auth/refresh` using securely persisted refresh tokens.
- **Enforced Session Expansions**: Supports remote session revocation, session timeout logs, and automated logouts on token expiry or validation failures.

---

## ⚡ Section 22 – Enterprise Animation, Motion & Interaction System

### Core Motion Philosophy
All animations must remain purposeful, fast, and natural. Movement should communicate context changes and actions without delaying user interaction or dropping frames.

### Centralized Easing & Spring Tokens
- Animation curves reference dedicated timing configurations: spring scales for tap gestures, timing functions for fade states, and translations for menu panels.
- Layout metrics are calculated dynamically to prevent page shifts.

### Standardized Micro-Interactions
- **Buttons, Toggles, and Checks**: Standardize tactile spring bounds on tap events (e.g. spring scale response).
- **Gestures**: Supports pull-to-refresh stretches, swipe actions on lists, drag handles on sheets, and long-press contextual menus.
- **Loading states**: Standard linear shimmer loops on skeleton blocks, circular/linear progress bars, and upload state loaders.

---

## 📊 Section 23 – Enterprise Dashboard & Widget Framework

### Dashboard Widget Layout Hierarchy
Dashboards are structured as modular sections composed of rows and columns containing widgets. Custom or module-isolated dashboard styling is prohibited:
`Dashboard Container` ➔ `Categorized Sections` ➔ `Grid Rows & Columns` ➔ `Reusable Widgets (KPIs, Charts, Feeds)`

### Widget Classification
- **KPI Metrics Cards**: Standardized numeric display blocks for key figures (revenue, attendance counts, active tasks, approved leaves).
- **Feeds & Notifications**: Recent activity timelines, checklists, approvals widgets, calendar slots, and upcoming holiday cards.
- **Quick Action Grids**: Reusable touch shortcuts allowing users to trigger check-ins, request leave forms, or create tasks.

### Features & Layout Performance
- **Role-Based Widgets**: Dashboard views filter and rearrange cards dynamically at runtime based on user permissions.
- **Data Refreshing**: Supports pull-to-refresh, manual sync triggers, and local data caching.
- **Rendering Virtualization**: Skeletons preserve widget layouts during async loading. Off-screen dashboard cards are lazy-loaded to optimize memory footprint.

---

## 📈 Section 24 – Enterprise Reporting & Data Visualization Architecture

### Visualizations & Chart Rules
Data visualization elements must follow design system rules. Uncoordinated chart color configurations are prohibited:
- **Approved Layout Components**: Line charts, bar graphs, area flows, and donut metric shapes.
- **Color Consistency**: Charts automatically load colors from dedicated theme tokens (`chart.positive`, `chart.negative`, `chart.neutral`, or branding overrides), guaranteeing readable contrast ratios in both light and dark mode.

### Reporting Flow
- **Interaction Model**: Supports drill-down selections on charts to expose details or tabular lists. Filters and sorting choices appear inside overlay sheets to preserve layout structures.
- **Exports & Sharing**: Exports (generating localized summaries, PDFs, Excel/CSV grids) are handled by background utilities, showing progress loaders to keep visual flows responsive.

---

## 🔔 Section 25 – Enterprise Notification & Communication Framework

### Notification Center Layout
- **Notification Inbox**: A unified list tab using high-performance lists (`FlashList`) containing category-specific cell structures.
- **Interaction Rules**: Tapping a notification card executes target action routes (deep-linking users directly to the specific leave page, attendance status sheet, or task assignment details) and triggers automatic marks as read.

### Communication Delivery Channels
- **In-App Alerts**: Responsive toasts, badges, status indicators, and notification boxes.
- **Push Notification Integration**: Routing maps match notification triggers directly to the Expo Router stack gates.
- **WebSocket & Real-Time Sync**: Real-time listeners bind updates (such as approval requests, messages, or checklists) directly to the active application caches and stores.

### User Notification Preferences
- Supports dynamic configurations (toggle rows or mute preferences) for quiet hours and channel triggers managed inside the user settings profiles.

---

## 📁 Section 26 – Enterprise File, Document & Media Management

### Core Document System
All file interactions (uploads, downloads, attachments, previews) must run through a centralized Document Manager. Direct filesystem operations inside feature modules are prohibited.

### File Formats & Preview
- **Supported Formats**: Standard corporate files (Images, PDFs, Word, Excel, CSV, text) and media clips (Video, Audio).
- **Inline Preview Engine**: Media files, profile image captures, and document attachments open inside dedicated, overlay-level viewers (such as PDF sliders or full-screen image views) rather than opening external app components where possible.

### Upload & Sync Architecture
- **Performance Optimization**: Supports lazy loading of asset galleries, background uploads/downloads, progress loading percentages, and chunk uploads for large attachments.
- **Offline Attachment Queueing**: Upload requests initiated while offline write securely to the local transaction queue, executing automatically once connectivity returns.

---

## 🔍 Section 27 – Enterprise Search, Filtering & Global Discovery

### Search Models
The application provides high-performance, responsive search interfaces across all features. Local inline searches execute instantly; server searches use optimized caching:
- **Global Search**: Central discovery console allowing search results across tasks, documents, and notifications.
- **Advanced Filtering**: Opens inside modal bottom sheets (filtering by date range, department, role, priority) to preserve screen hierarchy.
- **Query Optimizations**: Implements search input debouncing (typically 300ms) to reduce API load, caches search history locally, and supports infinite scroll results.

---

## 🔌 Section 28 – Enterprise Offline, Background Sync & Connectivity Strategy

### Connectivity & Network Quality Monitoring
- **Real-Time Quality Checks**: The connectivity listener checks Wi-Fi, cell states, latencies, and signals to dynamically adapt data loading behaviors.
- **Visual Network Banners**: An offline banner triggers automatically when connection drops, showing pending upload counts and cache reload buttons.

### Offline Caching Policies
- All major modules (Attendance shifts, Task cards, Leaves lists, User profile data) cache API responses locally using React Query persistent caches and Secure Storage.
- Draft forms and unsubmitted files automatically auto-save to local storage, recovering states if the app backgrounds or crashes.

### Transaction Queueing & Synchronization
- **Sequential Replay Queue**: Mutations attempted offline write to local storage transaction queues. Once connectivity returns, a NetInfo background listener executes the replay sequentially.
- **Conflict Handling**: Synchronization conflicts resolve using standard policies (e.g. timestamp comparisons, last write wins) with failed sync cards showing retry actions.

---

## 📊 Section 29 – Enterprise Logging, Monitoring & Analytics Architecture

### Observability Structure & Naming
Every event, action, or failure must pass through the unified logging system. Local inline console writes are prohibited. Structured logging properties are mapped uniformly across all packages:
`Correlation / Request ID` ➔ `User & Tenant Identifiers` ➔ `Structured Levels (Info, Warning, Error)` ➔ `Module/Feature Scope`

### Observability Categories
- **Audits & Security Trace**: Logs authentication results, session validation drops, failed biometric checks, and unauthorized actions. PII (Passwords, access/refresh tokens) must be scrubbed prior to writing.
- **Performance Diagnostics**: Measures app start cold timings, rendering speeds, frames dropped (targeting 60fps), and API request delays.
- **Errors & Crash Reports**: Unhandled JavaScript exceptions, network timeout failures, API server warnings, and local database write bugs are logged automatically with recovery retry statuses.
- **User Activity Metrics**: Anonymously captures screen focus transitions, filter applications, search searches, and export logs to evaluate journey bottlenecks.

---

## ⚡ Section 30 – Enterprise Performance, Scalability & Optimization Architecture

### Core Performance Standard
High responsiveness is a primary design constraint. Calculations, database operations, or uploads must run off the main UI thread to protect rendering frames.

### Performance Targets
- **Application Startup**: Cold starts must complete in under 2 seconds.
- **Screen Navigation Transitions**: Transitions must resolve in less than 300ms.
- **Interactive Framerate**: Key interactions (scrolling, micro-interactions, spring animations) must sustain 60 FPS target rates.

### Rendering & List Virtualization
- **Lists & Grids**: Infinite scroll and search listings must use virtualization (`FlashList` or `FlatList` with optimized window settings).
- **React Updates**: Pure layouts, stable hooks (`useCallback`, `useMemo`), and shallow comparison wrappers (`React.memo`) prevent unnecessary re-rendering during state updates.

### Memory & Resource Cleanup
- Active listeners, subscriptions, image caches, and background sync queues are monitored to avoid memory leaks. Unused widgets and off-screen nodes are unmounted reactively.

---

## ♿ Section 31 – Enterprise Accessibility, Internationalization & Localization Architecture

### Accessibility (A11Y) Integrations
Inclusive design is a fundamental requirement. Every component must support:
- **Screen Reader Support**: All touch widgets must provide descriptive `accessibilityLabel`, `accessibilityHint`, and appropriate role/state descriptions for TalkBack and VoiceOver.
- **Visual Assistance**: Maintains WCAG 2.2 AA contrast levels, provides color-blind friendly styling options, and supports high-contrast theme variations.
- **Dynamic Sizing**: Views and layouts adapt dynamically to system font sizes, avoiding layout overlaps when dynamic font scaling is active.
- **Reduced Motion**: Disables secondary animations and shimmers when system-wide reduced motion settings are enabled.
- **Touch Targets**: Standard touch areas measure at least 48x48 dp with generous spacing to avoid mistakes.

### Internationalization & Localization (i18n / L10n)
- **RTL Support**: Mirror navigation stacks, headers, drawers, input alignments, lists, cards, and animation vectors automatically when RTL locales (such as Arabic) are active.
- **Localized Formatting**: Date/time strings, currencies, decimals, and numeric listings format natively according to current locale standards.
- **String Management**: Hardcoded text labels are prohibited. All strings are configured inside central localization files (`en.json`, `ar.json`, `hi.json`) and support variables and pluralizations.

---

## 🧪 Section 32 – Enterprise Testing, Quality Assurance & Automation Architecture

### Testing Pyramid & Quality Gates
All feature additions and visual modifications must pass our central automated quality gates prior to staging release:
- **Static Code Analysis**: Typechecking (`tsc`), linting rules, styling formatting audits, and import validation runs on every commit.
- **Unit and Integration Tests**: Standard mock-ups for feature repositories, Zustand hooks, state store mutations, and offline queue controllers.
- **Visual Regression**: Validates UI component lookups across themes (Light, Dark, and Tenant Custom colors) and safe area offsets.

### Diagnostic Auditing
- **Accessibility Testing**: Checks focus order flow, touch targets bounds, and TalkBack description labels.
- **Performance Budgets**: Verifies app startup times, rendering FPS drops, memory leaks, and offline recovery sync timings.

---

## 🚀 Section 33 – Enterprise DevOps, CI/CD & Release Management Architecture

### Git Workflow & Environment Pipeline
Our deployment relies on a unified Git branching strategy coordinating staging steps to production:
- **Environments**: Isolated environments (`Local`, `QA`, `Staging`, `Production`) lock API client variables and tenant configuration headers.
- **Branching Policy**: Standard feature/bugfix branches merge into `development` (triggers QA build) and `main` (requires peer reviews, design approvals, and UAT approval).

### Automated CI/CD Execution
- **Artifact Control**: Pipeline engines automate the generation of Android APKs and AAB bundles, storing release maps and symbol mapping indexes.
- **Disaster Recovery**: Supports rapid deployment rollback commands, recovery procedures, and version history logs.

---

## 🗃️ Section 34 – Enterprise Project Architecture, Folder Structure & Coding Standards

### Core Coding Principles
The repository enforces Clean Architecture and SOLID principles. Developers must maintain a strict separation of concerns, decoupling screen presentation code from data repository management.

### Scale Directory Map
The codebase is structured under distinct operational layers:
- `/mobile/src/app`: Application entry setups and global providers.
- `/mobile/src/shared`: Generic layout grids, UI primitives, hooks, helpers, localization strings, and global configurations.
- `/mobile/src/features`: Grouped feature directories (e.g. `attendance`, `tasks`, `leaves`, `profile`). Each feature module must package its own:
  - `/api`: Remote repository calls and queries/mutations.
  - `/components`: Feature-specific sub-widgets.
  - `/hooks`: Custom state management wrappers.
  - `/screens` or `/routes`: Presentation entry views.

### Code Organization Rules
- **TypeScript Strict Mode**: Explicit parameter types and return boundaries are required. Avoid casting variables to `any`.
- **Component Rules**: Standardize functional React components, hooks, stable references (`useMemo`/`useCallback`), and camelCase file naming formats.
- **Cleanups**: Unused variables, dead console logs, and hardcoded literals are audited out during PR reviews.

---

## 🤖 Section 35 – Enterprise AI, Automation & Future Extensibility Architecture

### Architecture Extensibility
The platform supports future feature expansion and module integrations without requiring breaking revisions to the core shell structures:
- **Feature Flags**: Toggle visibility of experimental screens, custom workflows, or new sections dynamically based on tenant-specific settings or roles.
- **Hook-Based Services**: Abstracted helper classes and repository interfaces decouple third-party libraries and modules, allowing drop-in replacements.

### AI Integration Model
- **Gateway Abstractions**: Future AI search features, predictive analysis widgets, or speech commands route through dedicated service wrappers rather than calling external APIs directly inside visual components.
- **Modular Data Seeding**: Business models are structured cleanly using unified datasets, preparing our data architecture for easy parsing by OCR engines, NLP search indexers, and local recommendations.

---

## 🏛️ Section 36 – Enterprise Governance, Documentation & Long-Term Maintenance Framework

### Governance & Verification Model
The application design system, component APIs, and security configurations are maintained through structured review gates:
- **Design Reviews**: Visual components, color palettes, and motion spring curves require review when modified.
- **Security & Quality Audits**: Dependency updates, authentication rules, and API client interceptors are audited quarterly to guarantee compatibility and prevent regressions.

### Versioning & Compatibility Policies
- **Semantic Versioning**: Code releases follow standard semantic versioning rules (`major.minor.patch`).
- **Data Caches and Migrations**: Storage schemas (Zustand persists, SQLite tables, or Secure Store variables) use version numbers to automate schema updates.
- **API Versioning Guidelines**: Networking endpoints reference explicit version prefixes (e.g. `/api/v1/`), ensuring backwards compatibility when backend fields change.
































