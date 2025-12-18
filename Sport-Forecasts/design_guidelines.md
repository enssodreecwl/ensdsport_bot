# ENSD SPORT - Design Guidelines

## Design Approach

**Reference-Based Strategy**: Drawing from premium betting platforms (Bet365, FanDuel) for prediction UX, Instagram for content feed patterns, and Linear for admin panel clarity. This creates a trustworthy, professional sports analytics platform that feels like a serious product, not just a Telegram channel.

**Core Principle**: Build visual hierarchy that clearly separates Free vs VIP content while maintaining engagement through gamification elements.

---

## Typography System

**Font Family**: Inter (via Google Fonts CDN) - clean, modern, excellent readability for data

**Hierarchy**:
- **Hero/Section Headers**: text-4xl md:text-5xl font-bold tracking-tight
- **Card Titles**: text-xl font-semibold
- **Prediction Details**: text-base font-medium
- **Metadata (odds, time, sport)**: text-sm font-normal
- **Micro-copy (badges, labels)**: text-xs font-medium uppercase tracking-wide
- **Admin Panel Headers**: text-2xl font-bold
- **Body Text**: text-base leading-relaxed

---

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8 for consistency (p-4, m-6, gap-8, etc.)

**Container Strategy**:
- Max-width: max-w-6xl for main content areas
- Padding: px-4 md:px-6 for mobile-first responsiveness
- Section spacing: py-8 md:py-12

**Grid Patterns**:
- Prediction cards: grid-cols-1 gap-4 (mobile-first, stack vertically)
- Admin dashboard: Split layout with sidebar navigation (w-64) and main content area
- Stats/Points display: grid-cols-2 gap-4 for compact metric cards

---

## Component Library

### 1. Prediction Card (Core Component)
**Structure**:
- Sport icon + category badge (top-left corner)
- VIP/Free badge (top-right corner) - pill-shaped with icon
- Match details: Teams/fighters with vs. separator
- Time/date metadata row
- Prediction content area (partial blur for VIP if user is Free)
- Odds/confidence indicator
- Expand/collapse interaction for full analysis

**Layout**: Rounded corners (rounded-xl), shadow-lg, padding p-6, border-l-4 for sport category visual distinction

### 2. VIP Content Lock Overlay
**Pattern**: Semi-transparent backdrop with centered unlock prompt
- Lock icon (Heroicons lock-closed)
- "Upgrade to VIP" heading
- Brief benefit list (3 items max)
- CTA button with Telegram Stars icon
- Subtle gradient fade effect from visible to locked content

### 3. User Profile Header
**Elements**:
- Avatar placeholder (circular, 64x64)
- Username + status badge (Free/VIP)
- Points balance with coin icon (prominent, text-2xl)
- Current streak counter with flame icon
- Quick stats row: total predictions viewed, active days, level progress bar

### 4. Navigation Bar (Mini App)
**Structure**: Fixed bottom navigation (iOS-style tab bar)
- 4 icons: Home (predictions feed), Profile, Stats, Admin (conditional)
- Active state: filled icon + label
- Icons from Heroicons
- Spacing: p-4 with safe-area-inset-bottom support

### 5. Admin Panel Layout
**Sidebar Navigation** (fixed left, w-64):
- ENSD SPORT logo/title
- Menu items: Dashboard, Add Prediction, Manage Predictions, Users, Settings
- Active state indicator (border-l-4)

**Main Content Area**:
- Page header with title + action button (right-aligned)
- Form layout: Label-above-input pattern, spacing gap-6
- Input groups: Sport selector, teams/fighters, prediction text (textarea), odds, publish time
- Action buttons: row of justify-end with gap-3

### 6. Gamification Elements
**Daily Bonus Card**:
- Circular progress indicator showing check-in streak (7-day cycle)
- Large points reward number (text-3xl font-bold)
- "Claim Daily Bonus" button (full-width)
- Streak flame emoji indicators

**Points Animation**: Floating +points notification (absolute positioned, fade-in-out animation)

**Level Progress Bar**:
- Thin height (h-2), rounded-full
- Current level label (left), Next level (right)
- Fill animation transition-all duration-300

### 7. Sport Category Filters
**Pattern**: Horizontal scrollable pill buttons
- Container: flex gap-3 overflow-x-auto hide-scrollbar
- Pills: px-4 py-2 rounded-full whitespace-nowrap
- Sport icons (Font Awesome: fa-hockey-puck, fa-futbol, fa-hand-fist for MMA)
- Active state: font-semibold with subtle shadow

### 8. Empty States
**Pattern**: Centered column layout (min-h-screen flex items-center justify-center)
- Large icon (w-24 h-24, opacity-50)
- Heading text-xl
- Supporting text text-sm
- Optional CTA button

---

## Images

**Hero Section**: Large hero image (h-64 md:h-96) featuring dramatic sports action photography (hockey player mid-shot, soccer goal celebration, or UFC fighter victory). Overlay with dark gradient (from-black/60 to-transparent) for text readability.

**Prediction Cards**: Small thumbnail images (48x48, rounded) for team logos or fighter headshots when available. Use placeholder icons if images unavailable.

**Empty State Icons**: Use Font Awesome sport icons as large decorative elements.

**VIP Upsell Section**: Background pattern of subtle sports equipment icons (repeated, very low opacity) behind content.

---

## Accessibility & Polish

- All interactive elements: minimum 44x44 touch target
- Focus states: ring-2 ring-offset-2 for keyboard navigation
- Loading states: Skeleton screens with animate-pulse for prediction cards
- Error states: border-red-500 with inline error text
- Success feedback: Toast notifications (top-right, slide-in animation)

---

## Mini App-Specific Considerations

**Telegram Integration**:
- Respect Telegram's native header/back button (no duplicate nav)
- Use Telegram WebApp SDK for haptic feedback on actions
- Theme adaptation: support both light/dark Telegram themes with CSS variables
- Safe areas: pb-safe for bottom navigation on iOS

**Performance**:
- Lazy load prediction images
- Paginated infinite scroll for predictions feed (load 10 at a time)
- Optimistic UI updates for point claiming and interactions