# OMS Design System & Component Library

> **Purpose:** Enterprise design tokens dictionary, UI component catalog, dark mode specifications, and typography guidelines.  
> **Audience:** Frontend Developers, Mobile Engineers, UI/UX Designers.  
> **Owner:** Mobile Design System & UI Guild.  
> **Last Updated:** July 20, 2026  
> **Related Modules:** `mobile/src/shared/theme/`, `mobile/src/shared/components/`  

---

## 1. Design Token Dictionary

The OMS Mobile App utilizes a cohesive token system accessible via the `useTheme` hook (`src/shared/hooks/useTheme.ts`).

### 🎨 Color Tokens Palette

| Token Name | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `primary` | `#3F51B5` (Indigo) | `#6366F1` (Indigo Light) | Primary actions, buttons, active tabs |
| `surface` | `#FFFFFF` | `#1E293B` | Cards, popovers, headers, modals |
| `background` | `#F8FAFC` | `#0F172A` | Screen background surfaces |
| `text` | `#0F172A` | `#F8FAFC` | Headings, primary text labels |
| `textMuted` | `#64748B` | `#94A3B8` | Subtitles, captions, disabled text |
| `border` | `#E2E8F0` | `#334155` | Card outlines, dividers, input borders |
| `success` | `#10B981` | `#34D399` | Present status, success badges, checkmarks |
| `warning` | `#F59E0B` | `#FBBF24` | Late status, warnings |
| `danger` | `#EF4444` | `#F87171` | Absent status, delete/withdraw actions |

---

## 2. Typography Tokens

We use the Google **Inter** font family across the platform:

| Token Name | Font Family | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- |
| `display` | `Inter-Bold` | 24px | 700 | 32px |
| `title` | `Inter-Bold` | 18px | 700 | 24px |
| `subtitle` | `Inter-SemiBold` | 14px | 600 | 20px |
| `body` | `Inter-Medium` | 13px | 500 | 18px |
| `caption` | `Inter-Medium` | 11px | 500 | 14px |

---

## 3. Reusable UI Components Catalog

All shared UI components live in `src/shared/components/`.

### 🃏 `Card`
A rounded container with theme-aware background, border, and elevation.
```tsx
import { Card } from '../shared/components';

<Card style={{ margin: 16, padding: 16 }}>
  <Text style={{ color: colors.text }}>Card Header Content</Text>
</Card>
```

### 🏷 `Badge`
Renders status badges with custom color backgrounds and dot indicators.
```tsx
import { Badge } from '../shared/components';

<Badge label="Present" variant="success" />
<Badge label="Late" variant="warning" />
```

### 💀 `Skeleton`
Shimmer placeholder component used during data fetching.
```tsx
import { Skeleton } from '../shared/components';

<Skeleton width={120} height={20} borderRadius={8} />
```

### 📄 `EmptyState`
Standard empty placeholder containing icon, title, description, and optional action button.
```tsx
import { EmptyState } from '../shared/components';

<EmptyState
  icon="calendar-clear-outline"
  title="No Logs Recorded"
  description="No attendance punches registered for this date."
/>
```

---

## 4. Dark Mode Guidelines

1. **Never Hardcode Hex Colors:** Always consume `colors` from `useTheme()`.
2. **Transparent Overlay Badges:** In dark mode, use semi-transparent status colors (e.g. `rgba(16, 185, 129, 0.15)` for success) to maintain high readability and avoid eye strain.
3. **Elevations & Borders:** In dark mode, use distinct border colors (`colors.border`) rather than shadows for visual separation between stacked cards.
