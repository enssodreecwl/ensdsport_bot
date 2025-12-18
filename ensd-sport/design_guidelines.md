# ENSD SPORT - Telegram Mini App Design Guidelines

## Design Approach

**Primary Reference:** Telegram Mini App Design Guidelines with custom sports prediction components
**Secondary Inspiration:** Linear (typography clarity), Notion (card organization), modern sports apps (stats display)
**Philosophy:** Clean, information-dense interface optimized for quick scanning of predictions while maintaining Telegram's native feel

---

## Typography System

**Font Stack:** Telegram's system fonts (SF Pro/Roboto via platform defaults)

**Hierarchy:**
- **Hero/Section Titles:** Bold, 24px
- **Card Titles:** Semibold, 18px
- **Match Names:** Medium, 16px
- **Body/Predictions:** Regular, 15px
- **Labels/Metadata:** Regular, 13px
- **Stats/Coefficients:** Tabular numbers, Medium, 16px
- **Small Text/Timestamps:** Regular, 12px

---

## Layout & Spacing System

**Core Spacing Units:** Use Tailwind units of 2, 4, 6, 8, and 16 for consistency
- Component padding: p-4, p-6
- Card spacing: gap-4, gap-6
- Section margins: mt-8, mb-8
- Inline elements: gap-2, gap-3

**Container Strategy:**
- Max width: max-w-2xl (optimized for mobile-first Telegram view)
- Side padding: px-4 on mobile, px-6 on tablet
- Full-width cards with rounded corners (rounded-2xl)

---

## Component Library

### Main Navigation Cards (Home Screen)
Large tappable cards in grid layout:
- Grid: grid-cols-2 gap-4
- Card size: aspect-square or aspect-[4/3]
- Padding: p-6
- Icons: 40px size, centered above text
- Label: Semibold, 16px, centered below icon
- Use subtle elevation/border treatment

### Prediction Cards
Structured information cards:
- Full-width cards with p-5 padding
- Header: Sport icon + League name (13px)
- Match: Bold team names, 18px, with "—" separator
- Prediction row: Icon + Label + Value in horizontal layout
- Coefficient: Highlighted with tabular numbers
- Confidence: Visual indicator (e.g., 7/10 with progress representation)
- Commentary: Regular text, 14px, mt-3, line-clamp-3
- Footer: Timestamp + Action buttons (Like/Save)

### Points Display
- Large number display: 48px, Bold
- "+X points" animations: smaller, 16px
- History list: Timeline format with icons
- Compact spacing between items: gap-3

### Admin Panel
Tab-based interface:
- Sticky header with action buttons
- Form inputs: Full-width, p-3, rounded-lg
- Select dropdowns: Native styling for mobile
- Text areas: min-h-24 for comments
- Submit button: Full-width, prominent, sticky bottom
- Delete actions: Secondary, destructive indicators

### Stats Dashboard (Admin)
- Metric cards: grid-cols-2 md:grid-cols-4
- Large numbers: 32px, Bold
- Labels below: 13px
- Icons: 24px, positioned top-left

---

## Interaction Patterns

**Navigation:**
- Bottom sheet modal pattern for full-screen views
- Swipe gestures for navigation (back/close)
- Persistent bottom navigation with 4-5 main sections

**Cards:**
- Tap anywhere on card to expand/view details
- Quick actions (like/save) as icon buttons in card footer
- Subtle press state (scale-95 on active)

**Forms (Admin):**
- One field per row for mobile optimization
- Auto-advancing between fields
- Inline validation feedback
- Floating action button for submit

**Loading States:**
- Skeleton screens matching card structure
- Shimmer effect for content loading
- Pull-to-refresh for prediction feed

---

## Screen Layouts

### Home Screen
- Header: Logo + Points badge (right-aligned)
- Grid of 6 main cards: Football, Hockey, Points, AI (locked), VIP, Settings
- Bottom navigation sticky

### Predictions List
- Filter tabs: All, Football, Hockey (sticky)
- Vertical stack of prediction cards with gap-4
- Empty state: Icon + Message + CTA
- Infinite scroll loading

### Prediction Detail
- Full-screen modal
- Hero: Match info + league
- Stats grid: 2-column layout
- Commentary section: Expanded
- Related predictions: Horizontal scroll

### Points Screen
- Balance header: Large display with animated number
- Activity feed: Vertical timeline
- Redeem section: Horizontal scrolling cards

### Admin Dashboard
- Tab navigation: Predictions, Stats, Users, Settings
- Quick actions: Floating button cluster (bottom-right)
- Data tables: Responsive, swipeable on mobile

---

## Images

**No hero images needed** - This is a utility-focused Mini App embedded in Telegram

**Icon Usage:**
- Sports icons: 24px for cards, 20px inline
- Use Heroicons via CDN for UI elements
- Custom sport/team icons: 32px, provided as external assets

**Avatar/User Images:**
- Circular, 40px for profile displays
- Team logos: 48px in prediction cards

---

## Accessibility

- Minimum touch target: 44px × 44px
- High contrast ratios for all text
- Clear focus indicators for keyboard navigation (Telegram Desktop)
- Semantic HTML structure for screen readers
- Form labels always visible (no placeholder-only inputs)

---

## Mobile-First Considerations

- Single column layouts default
- Horizontal scrolling for secondary content only
- Sticky headers for context retention
- Bottom navigation for primary actions
- Form inputs optimized for thumb reach
- No hover states (all interactions tap-based)