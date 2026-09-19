# CRM System - Work Log

## Phase 1: Foundation & Core CRM

### Project Status: Phase 1 Complete ✅

---

### Task ID: 1 - Database Setup
**Agent:** Database Setup Agent

**Work Log:**
- Replaced default Prisma schema with full CRM schema (5 models, 4 enums)
- Models: User, Lead, Interaction, Course, Enrollment
- Enums: UserRole, LeadStatus, InteractionType, PaymentStatus
- Ran `bun run db:push` and `bun run db:generate`
- Created seed script with demo data (7 users, 5 courses, 15 leads, 14 interactions, 5 enrollments)

**Stage Summary:**
- Database fully set up with all required tables
- Seed data populated for demo

---

### Task ID: 2 - API Routes
**Agent:** API Routes Agent

**Work Log:**
- Created 13 API route files covering all CRUD operations
- Dashboard stats API with aggregations
- Users, Leads, Courses, Enrollments, Interactions CRUD
- Lead-specific endpoints: assign, status change
- Filtering support on all list endpoints
- Auto system interactions for status changes and assignments

**Stage Summary:**
- All API endpoints functional and tested
- Proper error handling with appropriate status codes

---

### Task ID: 3-a - Layout & Store
**Agent:** Layout & Store Agent

**Work Log:**
- Created Zustand store with navigation state, sidebar state, current user
- Created comprehensive RTL dashboard with stat cards, pie chart, recent leads, follow-ups
- Updated layout.tsx with Persian font support (lang="fa", dir="rtl")
- Created main page.tsx with sidebar navigation

**Stage Summary:**
- Full RTL layout with Persian navigation
- Dashboard with emerald/teal color scheme
- Responsive design with mobile sidebar

---

### Task ID: 3-b - Leads & Sales Panel
**Agent:** Leads & Sales Panel Agent

**Work Log:**
- Created leads-page.tsx with full CRUD, search, filter, pagination
- Created sales-panel.tsx with agent view, quick actions, follow-ups
- Both with proper Persian text, emerald color scheme

**Stage Summary:**
- Complete leads management with status workflow
- Sales agent panel with assigned leads and interaction tracking

---

### Task ID: 3-c - Secondary Pages
**Agent:** Secondary Pages Agent

**Work Log:**
- Created users-page.tsx with RBAC tabs, CRUD, active/inactive toggle
- Created courses-page.tsx with card grid, filters, CRUD
- Created enrollments-page.tsx with table, payment status, CRUD
- Created interactions-page.tsx with timeline layout, filters, add dialog

**Stage Summary:**
- All secondary pages complete with full functionality
- Consistent design language throughout

---

### Task ID: 4 - Integration & Testing
**Agent:** Main Agent

**Work Log:**
- Rewrote page.tsx with comprehensive sidebar layout using Zustand store
- Integrated all 7 views with AnimatePresence transitions
- Added dark mode toggle via next-themes
- Added mobile responsive sidebar with overlay
- Ran lint - all errors fixed
- Tested all views via agent-browser - all rendering correctly

**Stage Summary:**
- Full CRM application functional with all Phase 1 features
- Dashboard, Leads, Sales Panel, Users, Courses, Interactions, Enrollments all working
- Lint passes with 0 errors

---

## Current Goals / Completed Features

✅ Database schema with 5 tables and 4 enums
✅ Full CRUD API for all entities
✅ Dashboard with stats, charts, recent leads, follow-ups
✅ Lead management (list, create, edit, assign, status change, detail view)
✅ Sales agent panel (my leads, quick actions, interaction history, follow-ups)
✅ User management with RBAC (4 roles: Admin, Sales Manager, Sales Agent, Student)
✅ Course management (card grid, filters, CRUD)
✅ Enrollment management (table, payment status, CRUD)
✅ Interaction timeline with filters
✅ RTL layout with Persian/Farsi text
✅ Dark mode support
✅ Responsive design
✅ Demo seed data

### Task ID: 5-b - Layout Fix & Theme Agent
**Agent:** Layout Fix & Theme Agent

**Work Log:**
- **Bug Fix 1**: Created `/src/components/providers.tsx` with ThemeProvider from next-themes (`attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`). Updated `layout.tsx` to wrap children with `<Providers>`. This fixes the dark mode toggle that was broken because `useTheme()` had no provider.
- **Bug Fix 2**: Added Vazirmatn Persian font using `next/font/google` (subset: arabic, display: swap). Applied `vazirmatn.className` to the body. Also added `font-family: 'Vazirmatn'` fallback in globals.css `html` rule.
- **Enhancement 3**: Updated `globals.css` with: smooth scrolling on html, custom thin emerald scrollbar styles (webkit), dark mode scrollbar variant, better focus-visible outlines (emerald), custom selection color (emerald).
- **Enhancement 4**: Improved sidebar with grouped sections (عمومی/فروش/مدیریت), notification bell dropdown with upcoming follow-ups from API, breadcrumbs indicator showing current section + view, taller header (h-18), refresh button next to dark mode toggle, sticky footer with `mt-auto`.

**Stage Summary:**
- Dark mode toggle now works correctly with ThemeProvider
- Vazirmatn Persian font loads properly via next/font/google
- Custom scrollbar, focus, and selection styles applied
- Sidebar has section groupings with labels
- Header has notification bell, refresh button, and breadcrumbs
- Lint passes with 0 errors, 0 warnings

---

## Unresolved Issues / Next Phase Priorities

- ~~No authentication system (currently no login, all users see same data)~~ → ✅ Added login page with role-based user switching
- ~~No role-based view filtering (all views accessible to all)~~ → ✅ Added role-based nav filtering via roleNavConfig
- ~~Sales panel hardcoded to first SALES_AGENT user~~ → ✅ Sales panel now uses logged-in user's context
- ~~No lead conversion flow~~ → ✅ Added lead-to-student conversion with API endpoint
- No lead import/export functionality
- No reporting/analytics beyond dashboard (enhanced dashboard with more chart types)
- ~~No notification system for upcoming follow-ups~~ → ✅ Added notification bell in header
- No audit trail beyond system interactions

---

### Task ID: 5-b - Layout Fix & Theme Agent
**Agent:** Layout Fix & Theme Agent

**Work Log:**
- **Bug Fix 1**: Created `/src/components/providers.tsx` with ThemeProvider from next-themes (`attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`). Updated `layout.tsx` to wrap children with `<Providers>`. This fixes the dark mode toggle that was broken because `useTheme()` had no provider.
- **Bug Fix 2**: Added Vazirmatn Persian font using `next/font/google` (subset: arabic, display: swap). Applied `vazirmatn.className` to the body. Also added `font-family: 'Vazirmatn'` fallback in globals.css `html` rule.
- **Enhancement 3**: Updated `globals.css` with: smooth scrolling on html, custom thin emerald scrollbar styles (webkit), dark mode scrollbar variant, better focus-visible outlines (emerald), custom selection color (emerald).
- **Enhancement 4**: Improved sidebar with grouped sections (عمومی/فروش/مدیریت), notification bell dropdown with upcoming follow-ups from API, breadcrumbs indicator showing current section + view, taller header (h-18), refresh button next to dark mode toggle, sticky footer with `mt-auto`.

**Stage Summary:**
- Dark mode toggle now works correctly with ThemeProvider
- Vazirmatn Persian font loads properly via next/font/google
- Custom scrollbar, focus, and selection styles applied
- Sidebar has section groupings with labels
- Header has notification bell, refresh button, and breadcrumbs
- Lint passes with 0 errors, 0 warnings

---

### Task ID: 5-d/5-e - Feature Development (Login + Lead Conversion)
**Agent:** Feature Development Agent (partially succeeded) + Main Agent fixes

**Work Log:**
- Created `/src/components/crm/login-page.tsx` with beautiful login page featuring:
  - Phone number login field
  - Quick login section with user cards grouped by role
  - Gradient header with CRM branding
  - Framer Motion animations
- Updated `/src/lib/store.ts` with:
  - Added 'login' to ActiveView type
  - Added `CurrentUser` interface with phone_number
  - Added `isAuthenticated` boolean state
  - Added `login()` and `logout()` functions
  - Added `roleNavConfig` for role-based navigation filtering
- Created `/src/components/crm/lead-convert-dialog.tsx` with:
  - Lead info card showing name, phone, target course, assigned agent
  - Course selection (pre-filled from lead's target course)
  - Payment status selection (PAID / INSTALLMENT)
  - Warning message about conversion effects
- Created `/src/app/api/leads/[id]/convert/route.ts` API endpoint:
  - Finds or creates Student user from lead's phone_number
  - Creates Enrollment linking student to course
  - Updates lead status to CONVERTED
  - Creates system Interaction noting the conversion
  - Handles duplicate enrollments and already-converted leads
- Updated main `page.tsx` to:
  - Show LoginPage when not authenticated
  - Filter navigation based on user role
  - Show logged-in user info in sidebar footer
  - Add logout button
- Fixed syntax errors from failed agent (misplaced `</div>` in leads-page.tsx)
- Fixed TS errors (Home icon import conflict, sectionMap missing 'login' key, Interaction type missing `lead` property)

**Stage Summary:**
- Login system with role-based access control fully functional
- Lead-to-student conversion flow with proper API and UI
- All lint and TypeScript errors resolved
- Tested via agent-browser: login, dashboard, dark mode all working

---

## Phase 2 Status: Enhanced Features Complete ✅

### Completed in This Round:
1. ✅ **ThemeProvider** - Dark mode now works correctly
2. ✅ **Vazirmatn Persian Font** - Beautiful Persian typography
3. ✅ **Custom Scrollbar & Focus Styles** - Professional emerald-themed UI
4. ✅ **Login Page** - Role-based user switching with quick login
5. ✅ **Role-Based Navigation** - Different users see different menu items
6. ✅ **Lead Conversion Flow** - Convert leads to students with enrollment
7. ✅ **Notification Bell** - Shows upcoming follow-ups in header
8. ✅ **Sidebar Sections** - Grouped navigation (General/Sales/Management)
9. ✅ **Breadcrumbs** - Current section and view indicator in header
10. ✅ **Refresh Button** - Force refresh current view data

### Remaining Priorities for Next Phase:
- ~~Lead import/export (CSV/Excel)~~ → ✅ Added CSV export with /api/leads/export endpoint
- ~~Advanced reporting and analytics dashboard~~ → ✅ Added full Analytics page with 7 charts/sections
- Real-time notifications (WebSocket)
- Email/SMS integration for follow-up reminders
- ~~Audit trail and activity log~~ → ✅ Added Recent Activity feed on dashboard
- Lead import (CSV upload)
- Bulk lead operations
- Dashboard date range filtering
- Custom report builder

---

## Phase 3: Enhanced Styling, Features & Analytics ✅

### Task ID: 6 - Bug Fixes & Session Persistence
**Agent:** Main Agent

**Work Log:**
- Fixed session persistence by adding `zustand/middleware` persist to the store (saves currentUser + isAuthenticated to localStorage)
- Updated seed data to use future followup dates (Date.now() + N days) instead of hardcoded past dates
- Added inactive user (student3) to seed data for status variation testing
- Re-seeded database with `bun prisma/seed.ts`

**Stage Summary:**
- Session now persists across page refreshes
- Notification bell now shows 7 upcoming followups
- Users page shows both active and inactive users

---

### Task ID: 7 - Dashboard Enhancement
**Agent:** Dashboard Enhancement Subagent

**Work Log:**
- Expanded stat cards from 6 to 8: added نرخ تبدیل (conversion rate), درآمد کل (total revenue), تعاملات (interactions), ثبت‌نام‌ها (enrollments)
- Each card now has gradient top border, colored background, hover animations
- Added Enrollment per Course Bar Chart using recharts BarChart
- Added Recent Activity Feed showing latest 10 interactions with timeline dots and type icons
- Added Top Agents section showing agent performance with progress bars
- Enhanced Source Distribution with progress bars per source
- Enhanced /api/dashboard endpoint to return: conversionRate, totalRevenue, totalInteractions, recentActivity, leadsPerAgent, enrollmentsPerCourse, paymentDistribution

**Stage Summary:**
- Dashboard is now data-rich with 8 stat cards, 2 charts, recent leads, activity feed, top agents, lead sources, follow-ups
- All data comes from enhanced API endpoint

---

### Task ID: 8 - Analytics/Reporting Page
**Agent:** Analytics Subagent

**Work Log:**
- Created `/src/components/crm/analytics-page.tsx` with 7 distinct sections:
  1. Key Metrics (conversion rate, revenue, interactions, enrollments)
  2. Lead Funnel horizontal bar chart (NEW → CONTACTED → IN_PROGRESS → CONVERTED)
  3. Agent Performance table with color-coded conversion rates
  4. Source Effectiveness bar chart comparing conversion rates by source
  5. Course Analytics cards with revenue, enrollment count, popularity bars
  6. Monthly Enrollment Trend line chart
  7. Payment Distribution pie chart + Revenue by Course horizontal bar chart
- Created `/src/app/api/analytics/route.ts` API endpoint with comprehensive analytics data
- Added 'analytics' view to store, page.tsx, navSections, sectionMap
- Added new sidebar section "گزارش‌ها" with analytics nav item
- Analytics available to ADMIN and SALES_MANAGER roles

**Stage Summary:**
- Full analytics/reporting page with 7 chart types
- Comprehensive API endpoint computing: lead funnel, interaction distribution, agent performance, course analytics, source effectiveness, monthly trends, payment summary, revenue by course

---

### Task ID: 9 - Lead CSV Export
**Agent:** Main Agent

**Work Log:**
- Created `/src/app/api/leads/export/route.ts` endpoint returning CSV with BOM for UTF-8
- Added Download icon import and "خروجی CSV" button to leads-page.tsx header
- Added handleExportCSV function using Blob download approach
- CSV includes: name, phone, source, status, assigned agent, target course, interactions count, date, notes

**Stage Summary:**
- CSV export fully functional with proper Persian text encoding

---

### Task ID: 10 - Global Search with Keyboard Shortcut
**Agent:** Main Agent

**Work Log:**
- Created `/src/components/crm/global-search.tsx` with:
  - Search trigger button showing "جستجو..." with ⌘K badge
  - Modal dialog with backdrop, search input, results list
  - Keyboard navigation (↑↓ arrows, Enter to select, Escape to close)
  - Ctrl+K / Cmd+K keyboard shortcut to open
  - Framer Motion animations for open/close
  - Footer showing keyboard shortcuts
- Added GlobalSearch component to page.tsx header

**Stage Summary:**
- Global search accessible via ⌘K shortcut and header button
- Searches through all navigation items with instant filtering

---

### Task ID: 11 - Secondary Pages Styling Enhancement
**Agent:** Styling Enhancement Subagent

**Work Log:**
- Enhanced Users page: added search input, avatar initials, role icons, motion animations on rows, hover effects, createdAt column, better empty state
- Enhanced Courses page: gradient top borders on cards, search input, better price display, enrollment/leads counts with icons, motion animations, better empty state
- Enhanced Enrollments page: search input, student avatars, course icons, better payment badges, hover effects, motion animations, better empty state
- Enhanced Interactions page: gradient timeline line, larger colorful dots, motion animations, better content cards, enhanced filter bar, better empty state

**Stage Summary:**
- All secondary pages now have search functionality, motion animations, avatars/icons, better hover effects
- Consistent emerald/teal color scheme throughout
- All pages pass lint with 0 errors

---

## Phase 3 Status: Complete ✅

### Completed in This Round:
1. ✅ **Session Persistence** - Zustand state persists across page refreshes
2. ✅ **Seed Data Fix** - Followup dates now in the future, notifications working
3. ✅ **Enhanced Dashboard** - 8 stat cards, 2 charts, activity feed, top agents
4. ✅ **Analytics/Reporting Page** - 7 chart types with comprehensive data
5. ✅ **Lead CSV Export** - Full UTF-8 CSV with Persian text
6. ✅ **Global Search** - ⌘K keyboard shortcut, instant filtering
7. ✅ **Enhanced Users Page** - Search, avatars, animations, hover effects
8. ✅ **Enhanced Courses Page** - Gradient cards, search, better layout
9. ✅ **Enhanced Enrollments Page** - Search, avatars, better badges
10. ✅ **Enhanced Interactions Page** - Better timeline, animations, filters
11. ✅ **Inactive User** - Added for status variation testing

### Current Feature Count:
- **8 UI views**: Dashboard, Leads, Sales Panel, Analytics, Users, Courses, Interactions, Enrollments
- **16 API endpoints**: dashboard, analytics, leads CRUD + export + status + convert, users CRUD, courses CRUD, enrollments CRUD, interactions CRUD
- **5 Database tables**: Users, Leads, Interactions, Courses, Enrollments
- **4 Enums**: UserRole, LeadStatus, InteractionType, PaymentStatus
- **Role-based access**: 4 roles with different nav visibility
- **Session persistence**: Zustand + localStorage
- **Dark mode**: Full theme support
- **RTL layout**: Persian/Farsi throughout

### Remaining Priorities for Next Phase:
- Real-time notifications (WebSocket)
- Email/SMS integration for follow-up reminders
- Lead import (CSV upload)
- Bulk lead operations (bulk assign, bulk status change)
- Dashboard date range filtering
- Custom report builder
- Audit trail with detailed change tracking
- Course capacity management
- Payment tracking with installment schedules
- Calendar view for follow-ups
- Data export and backup

---

## Phase 4: Major Feature & Styling Enhancements ✅

### Task ID: 12 - QA Testing & Bug Fixes
**Agent:** Main Agent

**Work Log:**
- Performed comprehensive QA testing via agent-browser across all 9 views
- **Bug Fix 1**: Fixed mobile sidebar defaulting to open on mobile — changed `sidebarOpen` initial value from `true` to viewport-aware (`window.innerWidth >= 1024`)
- **Bug Fix 2**: Fixed RTL sidebar translate animation — changed `transition-transform` to `transition-all` for better RTL compatibility
- **Bug Fix 3**: Added body scroll lock when mobile sidebar is open (`document.body.style.overflow = 'hidden'`)
- **Bug Fix 4**: Added `aria-label` attributes to all sidebar navigation buttons for accessibility
- **Bug Fix 5**: Added `data-testid` attributes to sidebar nav buttons for testing tools
- **Bug Fix 6**: Fixed dynamic footer year — changed hardcoded `۱۴۰۳` to `Intl.DateTimeFormat('fa-IR').format(new Date())`

**Stage Summary:**
- Mobile sidebar no longer blocks content on small screens
- Scroll lock prevents background scrolling when sidebar is open
- All navigation buttons have proper aria-labels
- Footer year is now dynamic

---

### Task ID: 13 - Lead Pipeline Kanban Board
**Agent:** Kanban Board Subagent + Main Agent integration

**Work Log:**
- Created `/src/components/crm/kanban-board.tsx` with full drag-and-drop pipeline view:
  - 4 columns: NEW (sky/blue), CONTACTED (amber/orange), IN_PROGRESS (yellow/amber), CONVERTED (emerald/green)
  - Each lead card shows: name, phone, source badge, target course, assigned agent, interaction count, notes preview
  - Drag-and-drop via @dnd-kit/core + @dnd-kit/sortable with:
    - PointerSensor with 8px activation distance
    - DragOverlay showing simplified card with rotation effect
    - Optimistic UI updates during drag-over
    - API call `PUT /api/leads/{id}/status` on drop with toast notifications
    - Same-column reorder support with arrayMove
  - Quick actions dropdown per card: view detail, log call, change status to any of 4 states
  - Search/filter input at top
  - Column count badges
  - Loading skeleton matching column layout
  - RTL layout with colored column headers/backgrounds
- Integrated into main app:
  - Added 'kanban' to ActiveView type in store
  - Added 'kanban' to roleNavConfig for ADMIN, SALES_MANAGER, SALES_AGENT
  - Added navigation entry in "فروش" section with Kanban icon
  - Added sectionMap entry and ViewRenderer case

**Stage Summary:**
- Full Kanban board with drag-and-drop lead pipeline management
- Cards can be moved between status columns with real-time API updates
- Visual feedback during drag operations

---

### Task ID: 14 - Dashboard Styling Enhancement
**Agent:** Frontend Styling Expert Subagent

**Work Log:**
- Added trend/change indicators to all 8 stat cards with Persian percentages (+۱۲٪↑, +۵٪↑, etc.)
- Added welcome header section at top with:
  - "خوش آمدید" greeting with Sparkles icon
  - Current Persian date via Intl.DateTimeFormat
  - Emerald gradient background
  - Decorative gradient line and circular icon
- Enhanced pie chart with donut center label showing total leads count
- Improved card hover animations: scale-[1.02], shadow-xl, -translate-y-1, background opacity change
- Added section labels "آمار کلی" (General Statistics) and "نمودارها" (Charts) with emerald decorators
- Added gradient divider between sections
- Added status dot indicators on recent leads (blue/orange/yellow/green based on status)
- All enhancements include proper dark mode support

**Stage Summary:**
- Dashboard now has welcome header, trend indicators, better visual hierarchy
- All additions properly support dark mode

---

### Task ID: 15 - CSV Export for All Tables
**Agent:** Full-stack Developer Subagent

**Work Log:**
- Created `/src/app/api/enrollments/export/route.ts` — Exports enrollments with student name, phone, course, price, payment status, enrollment date
- Created `/src/app/api/users/export/route.ts` — Exports users with name, phone, role (Persian labels), active status, creation date
- Created `/src/app/api/interactions/export/route.ts` — Exports interactions with lead name/phone, agent name, type, content, followup date, creation date
- All exports include UTF-8 BOM for proper Persian text in Excel
- Added "خروجی CSV" export buttons to enrollments-page.tsx, users-page.tsx, interactions-page.tsx
- Each export button has handleExportCSV function with blob download approach

**Stage Summary:**
- All 4 data tables (leads, enrollments, users, interactions) now support CSV export
- Proper Persian text encoding with UTF-8 BOM

---

### Task ID: 16 - Mobile Bottom Navigation
**Agent:** Full-stack Developer Subagent + Main Agent fixes

**Work Log:**
- Created `/src/components/crm/mobile-bottom-nav.tsx` with:
  - 5 navigation items: Dashboard, Leads, Sales Panel, Courses, More
  - Glass-morphism effect (backdrop-blur, semi-transparent background)
  - Emerald-600 active state with dot indicator above
  - Safe area bottom padding for iOS (env(safe-area-inset-bottom))
  - Only visible below lg breakpoint (1024px)
  - Shadow on top edge
- Added viewToNavMap for smart active state: Kanban→Leads, Interactions→Leads, Enrollments→Courses, Users→More, Analytics→More
- Updated page.tsx footer with extra bottom padding on mobile (pb-20 lg:pb-4)
- Integrated MobileBottomNav into page.tsx

**Stage Summary:**
- Mobile bottom navigation with smart active state mapping
- Glass-morphism design with safe area support

---

### Task ID: 17 - Enhanced Courses & Interactions Pages
**Agent:** Frontend Styling Expert Subagent

**Work Log:**

**Courses Page Enhancements:**
- Added `description` field to Course interface
- Enhanced grid cards with:
  - 80px gradient header band (emerald→teal for active, red→orange for inactive)
  - Decorative BookOpen icon at 15% opacity in header
  - Frosted-glass status badges on gradient
  - Lead interest indicator badge
  - Prominent price with emerald gradient container
  - Enrollment progress bar (capacity-based, emerald→teal gradient)
  - Created date with CalendarDays icon
  - Better hover: scale-[1.02], -translate-y-1, shadow-xl
- Added view mode toggle (grid/list) with LayoutGrid and List icons
- Added list view with horizontal cards and status stripe
- Added empty illustration state with gradient container
- Added course count statistics (Total, Active, Inactive)

**Interactions Page Enhancements:**
- Enhanced timeline with:
  - Pulse animation on timeline dots for recent items (within 24 hours)
  - Gradient timeline line (emerald→teal)
  - Left border colors per type: CALL=emerald, NOTE=amber, SYSTEM=slate
  - Prominent relative time badges (emerald for recent, muted for older)
- Added interaction type filter tabs (All, Call, Note, System) with colored icons
- Added summary stats row (Total, Calls, Notes, Upcoming Followups)
- Added CSV export button with handleExportCSV function
- Removed old type Select dropdown (replaced by tabs)

**Stage Summary:**
- Courses page now has grid/list toggle, enhanced cards, statistics
- Interactions page has enhanced timeline, type tabs, stats row, CSV export

---

### Task ID: 18 - Sales Panel User Context Fix
**Agent:** Main Agent

**Work Log:**
- Updated sales-panel.tsx to use logged-in user context via useCRMStore
- If logged-in user is SALES_AGENT, use their ID directly instead of fetching first agent
- Otherwise, fall back to fetching first SALES_AGENT from API
- Added useCRMStore import and currentUser dependency

**Stage Summary:**
- Sales panel now correctly uses logged-in user's identity when they're a sales agent
- Admin/Manager users still see first agent's data as reference

---

## Phase 4 Status: Complete ✅

### Completed in This Round:
1. ✅ **Mobile Sidebar Fix** — Closed by default on mobile, scroll lock when open
2. ✅ **Lead Pipeline Kanban Board** — Full drag-and-drop with 4 status columns
3. ✅ **Dashboard Styling Enhancement** — Welcome header, trend indicators, section labels, status dots
4. ✅ **Mobile Bottom Navigation** — Glass-morphism bar with smart active state mapping
5. ✅ **CSV Export for All Tables** — Enrollments, Users, Interactions export endpoints
6. ✅ **Accessibility Improvements** — aria-labels, data-testid on nav buttons
7. ✅ **Enhanced Courses Page** — Grid/list toggle, gradient headers, progress bars, statistics
8. ✅ **Enhanced Interactions Page** — Type tabs, summary stats, enhanced timeline, CSV export
9. ✅ **Sales Panel User Context** — Uses logged-in user's identity
10. ✅ **Dynamic Footer Year** — Auto-updating Persian year

### Current Feature Count:
- **9 UI views**: Dashboard, Leads, Kanban Board, Sales Panel, Analytics, Users, Courses, Interactions, Enrollments
- **19 API endpoints**: dashboard, analytics, leads CRUD + export + status + convert, users CRUD + export, courses CRUD, enrollments CRUD + export, interactions CRUD + export
- **5 Database tables**: Users, Leads, Interactions, Courses, Enrollments
- **4 Enums**: UserRole, LeadStatus, InteractionType, PaymentStatus
- **Role-based access**: 4 roles with different nav visibility
- **Session persistence**: Zustand + localStorage
- **Dark mode**: Full theme support with proper dark variants
- **RTL layout**: Persian/Farsi throughout
- **Drag-and-drop**: Kanban board with @dnd-kit
- **Mobile bottom nav**: Glass-morphism with safe area
- **CSV export**: All 4 data tables
- **Global search**: ⌘K keyboard shortcut
- **Accessibility**: aria-labels, data-testid, semantic HTML

### Remaining Priorities for Next Phase:
- Lead import (CSV upload)
- Bulk lead operations (bulk assign, bulk status change)
- Dashboard date range filtering
- Calendar view for follow-ups
- Real-time notifications (WebSocket)
- Email/SMS integration for follow-up reminders
- Custom report builder
- Audit trail with detailed change tracking
- Course capacity management
- Payment tracking with installment schedules
- Lead scoring system

---

### Task ID: 21 - Major Styling Enhancements Across Multiple Pages
**Agent:** Frontend Styling Expert Subagent

**Work Log:**

**1. Global CSS Enhancements (`/src/app/globals.css`):**
- Added 6 animation keyframes: `shimmer`, `float`, `pulse-slow`, `gradient-shift`, `border-rotate`, `sparkle`
- Added custom utility classes: `.animate-shimmer`, `.animate-float`, `.animate-float-delayed`, `.animate-pulse-slow`, `.animate-gradient-shift`, `.animate-border-rotate`
- Added `.glass` utility class for glass-morphism effect (backdrop-blur, semi-transparent background) with dark mode variant
- Added `.gradient-border` utility with animated pseudo-element border using mask-composite technique
- Added smooth dark mode transitions (150ms cubic-bezier on bg, border, color, shadow, transform)
- Added `.shine-on-hover` utility with diagonal shine sweep animation
- Added override for `.no-theme-transition` and `.framer-motion *` elements

**2. Enhanced Login Page (`/src/components/crm/login-page.tsx`):**
- Added 4 floating gradient circles/blobs behind the card with absolute positioning and `animate-float`/`animate-pulse-slow` animations
- Added SVG geometric dot pattern overlay across entire background
- Applied glass-morphism effect to card (`glass` class + `gradient-border` + `backdrop-blur-xl`)
- Added animated shimmer overlay on gradient header
- Added SVG grid pattern in header for geometric texture
- Improved quick login buttons: `shine-on-hover` class, hover border glow, shadow elevation, icon translate animation
- Made footer year dynamic using `Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date())`
- Added "Powered by CRM" text at bottom
- Added login success transition with AnimatePresence: shows animated GraduationCap icon with "در حال ورود..." before navigating

**3. Enhanced Enrollments Page (`/src/components/crm/enrollments-page.tsx`):**
- Added summary statistics row (4 cards): Total Enrollments (emerald), Paid count (teal), Installment count (amber), Total Revenue (orange)
  - Revenue calculated: full course price for PAID, half for INSTALLMENT
  - Each card with gradient top border, icon, color scheme
- Added payment status filter tabs (همه / پرداخت شده / اقساطی) with active state styling
- Added "مبلغ دوره" (Course Price) column with DollarSign icon and Persian currency formatting
- Added revenue summary row at bottom of table showing filtered total + counts breakdown
- Added gradient top border on table container (emerald→teal gradient)
- Enhanced empty state with gradient background container
- Added hover effects on table rows: left border color change (border-r-emerald-400 on hover)
- Added payment progress bar indicators (100% green for PAID, 50% amber for INSTALLMENT)
- Added enrollment date relative time badge (e.g., "۲ ماه پیش")
- Added delete confirmation dialog with AlertTriangle icon, warning text, destructive button with spinner
- Added student phone number display in table
- Added course price display in create/edit dialog course selector

**4. Enhanced Dashboard (`/src/components/crm/dashboard.tsx`):**
- Added "Quick Actions" section with 4 action buttons:
  - "افزودن لید" (Add Lead) → navigates to leads view (emerald gradient)
  - "ثبت تماس" (Log Call) → navigates to interactions view (cyan gradient)
  - "مشاهده تقویم" (View Calendar) → navigates to sales-panel view (teal gradient)
  - "گزارش‌ها" (Reports) → navigates to analytics view (amber gradient)
  - Each with gradient icon, hover animation (-translate-y-0.5), icon scale on hover
  - Uses `useCRMStore` `setActiveView` for navigation
- Added "Performance Overview" section with AreaChart sparkline of leads over last 7 days
  - Uses recharts AreaChart with emerald gradient fill
  - Mock data based on total leads count
  - Smooth monotone curve with dots
- Enhanced "Recent Activity" section:
  - Larger interaction type icons in colored circles with ring-2 effect
  - Agent avatars with initials in emerald circles
  - Relative time badges using Badge component (secondary variant)
  - Gradient timeline line (emerald→teal→emerald)
  - "View All" link button navigating to interactions view
- Added "Lead Score Distribution" mini chart with horizontal bars:
  - 4 brackets: بالا (converted), متوسط (in-progress), پایین (contacted), جدید
  - Color-coded bars (emerald, amber, sky, gray)
  - Progress bars with animated width transitions
- Improved welcome header with logged-in user's name from useCRMStore
- Changed Top Agents layout from vertical scroll to 2-column grid

**Stage Summary:**
- Login page has premium glass-morphism with animated background and smooth login transition
- Enrollments page has summary stats, filters, payment progress bars, delete confirmation, revenue tracking
- Dashboard has quick actions, leads trend sparkline, enhanced activity feed, lead score distribution
- Global CSS provides reusable animation and utility classes across the app
- All changes support dark mode with proper dark variants
- Lint passes with 0 errors

---

### Task ID: 20 - Bulk Lead Operations
**Agent:** Main Agent

**Work Log:**
- Created `/src/app/api/leads/bulk/route.ts` API endpoint:
  - PUT endpoint accepting JSON body with `action` (assign/status/delete), `lead_ids` (string[]), and optional `data` object
  - **assign**: Updates `assigned_to_id` for all specified leads, creates SYSTEM interaction for each assignment
  - **status**: Updates `status` for all specified leads, creates SYSTEM interaction for each status change
  - **delete**: Deletes interactions then leads for all specified IDs
  - Validates `lead_ids` is not empty (returns 400)
  - Validates agent exists for assign action (returns 404)
  - Validates status is valid enum value for status action (returns 400)
  - Returns success count and any errors array
- Updated `/src/components/crm/leads-page.tsx` with bulk operations UI:
  - Added `selectedLeads` state (Set<string>) and `bulkProcessing` state
  - Added checkbox column to leads table with select-all/individual checkboxes
  - Selected rows highlighted with emerald background
  - Added bulk action bar (sticky, emerald background, Framer Motion animated) showing:
    - Selected count: "X لید انتخاب شده"
    - "تخصیص دسته‌ای" (Bulk Assign) button → opens dialog with agent selector
    - "تغییر وضعیت دسته‌ای" (Bulk Status Change) button → opens dialog with status selector + optional note
    - "حذف دسته‌ای" (Bulk Delete) button → opens AlertDialog confirmation with red warning
    - "انصراف" (Cancel) button to deselect all
  - Bulk Assign Dialog: agent selector from existing `agents` state, info card showing count, confirm button
  - Bulk Status Change Dialog: status dropdown (NEW/CONTACTED/IN_PROGRESS/CONVERTED), optional note textarea, confirm button
  - Bulk Delete Confirmation Dialog: warning about irreversibility, destructive red confirm button, AlertDialog component
  - All bulk operations: loading state during processing, toast success/error feedback, refresh leads and clear selection on success
  - Added Checkbox import from `@/components/ui/checkbox`
  - Added AlertDialog imports from `@/components/ui/alert-dialog`
  - Added Trash2, Users, ArrowRightLeft icons from lucide-react
  - Removed unused DialogTrigger import
- Lint passes with 0 errors
- API tested: bulk assign, bulk status change, empty lead_ids validation all working

**Stage Summary:**
- Full bulk operations (assign, status change, delete) for leads
- Clean UI with checkbox selection, animated action bar, and three dialogs
- API endpoint with proper validation, error handling, and system interactions
- All Persian text with emerald/teal color scheme

---

### Task ID: 19 - Calendar View & CSV Import
**Agent:** Main Agent

**Work Log:**

**Task 1: Calendar View for Follow-ups**
- Created `/src/components/crm/calendar-page.tsx` with full Persian/Jalali calendar:
  - Monthly calendar grid with Jalali/Shamsi date conversion using custom `gregorianToJalali`/`jalaliToGregorian` functions
  - Days of week in Persian (شنبه, یکشنبه, دوشنبه, سه‌شنبه, چهارشنبه, پنجشنبه, جمعه) — Saturday first
  - Persian month names (فروردین through اسفند) with Persian numerals via `toLocaleString('fa-IR')`
  - Each day cell shows follow-up events with color-coded dots by type: CALL=emerald, NOTE=amber, SYSTEM=slate
  - Event preview badges (visible on sm+ screens) showing lead name inside each cell
  - Click on a day with events to open a Popover showing event details (lead name, interaction type, content preview, agent name)
  - Today highlighted with emerald ring (ring-2 ring-emerald-500)
  - Previous/next month navigation arrows with Framer Motion slide animations (AnimatePresence)
  - "Go to today" button showing current month name and year
  - Right side panel (lg:col-span-1) showing upcoming follow-ups sorted by date:
    - Each event shows: lead name, interaction type icon+badge, content preview, agent name, relative time label
    - Color-coded by interaction type with border and background
    - ScrollArea for overflow
  - Legend bar at bottom showing interaction type colors and today indicator
  - Loading skeleton state with 42 cell skeleton placeholders
  - Dark mode support throughout
  - RTL layout with dir="rtl"
- Updated `/src/app/api/interactions/route.ts`:
  - Added `has_followup` query parameter filter (when `has_followup=true`, adds `where.next_followup_date = { not: null }`)
- Updated `/src/lib/store.ts`:
  - Added 'calendar' to `ActiveView` type union
  - Added 'calendar' to `roleNavConfig` for ADMIN, SALES_MANAGER, SALES_AGENT roles (in فروش section)
- Updated `/src/app/page.tsx`:
  - Added `CalendarDays` icon import from lucide-react
  - Added `CalendarPage` component import
  - Added 'calendar' navigation entry in "فروش" navSection: `{ key: 'calendar', label: 'تقویم پیگیری‌ها', icon: CalendarDays }`
  - Added 'calendar' entry to `sectionMap`: `{ section: 'فروش', label: 'تقویم پیگیری‌ها' }`
  - Added 'calendar' case to ViewRenderer switch: `<CalendarPage key={refreshKey} />`
- Updated `/src/components/crm/global-search.tsx`:
  - Added `CalendarDays` and `Kanban` icon imports
  - Added calendar and kanban entries to `searchItems` array
- Updated `/src/components/crm/mobile-bottom-nav.tsx`:
  - Added `calendar: 'leads'` mapping to `viewToNavMap` for smart active state

**Task 2: Lead CSV Import API + UI**
- Created `/src/app/api/leads/import/route.ts`:
  - POST endpoint accepting FormData with `file` field
  - Parses CSV with columns: first_name, last_name, phone_number, source, notes
  - Validates required field (phone_number is required — returns 400 if column missing or cell empty)
  - Handles duplicates gracefully (skips if phone_number already exists in database)
  - Validates source field against allowed values (manual, website, campaign)
  - Creates leads with status NEW using Prisma
  - Returns `{ successCount, errorCount, errors, totalRows }` JSON response
  - Custom `parseCSVLine` function handling quoted fields with commas
  - Error messages in Persian with row numbers
  - Limits error messages to 20 entries
- Updated `/src/components/crm/leads-page.tsx`:
  - Added `Upload` icon import from lucide-react
  - Added "وارد کردن CSV" button next to "خروجی CSV" button in header
  - Added CSV import dialog with:
    - File upload input accepting .csv files
    - File info display (name, size)
    - Preview table showing first 5 rows after file selection
    - Import progress indicator with spinning RefreshCw icon
    - Import results display: 3-column grid (total rows, success count, error count)
    - Error details in scrollable area
    - After successful import, automatically refreshes leads list
  - Added state variables: `importDialogOpen`, `importFile`, `importPreview`, `importing`, `importResult`
  - Added handlers: `handleFileSelect` (with FileReader preview), `handleImportCSV`, `resetImportState`

**Stage Summary:**
- Full Persian/Shamsi calendar view with follow-up events plotted on each day
- Color-coded interaction type dots/badges (CALL=emerald, NOTE=amber, SYSTEM=slate)
- Day click popover showing event details, upcoming follow-ups side panel
- Framer Motion animations on month transitions
- CSV import API with validation, duplicate detection, and error reporting
- CSV import UI with file preview, progress, and results display
- Calendar accessible from sidebar (فروش section), global search, and mobile nav mapping
- All API endpoints tested and working
- Lint passes with 0 errors

---

## Phase 5: Calendar, CSV Import, Bulk Operations & Major Styling ✅

### Task ID: 22 - Bug Fixes & Seed Data
**Agent:** Main Agent

**Work Log:**
- **Bug Fix 1**: Fixed Sales Panel agent context — Added agent selector dropdown for admin/manager users so they can switch between viewing different agents' panels instead of silently showing first agent's data
  - Added `availableAgents` state and `isViewingOtherAgent` computed flag
  - Added `handleAgentSwitch` callback that switches to selected agent and refreshes data
  - Updated header text: admins see "مشاهده پنل [Agent Name]" instead of "خوش آمدید"
  - Added Select dropdown with all SALES_AGENT users
- **Bug Fix 2**: Fixed seed data — Changed "Sara Ahmadi" (English) to "سارا احمدی" (Persian) for data consistency
- **Bug Fix 3**: Fixed HTML nesting issue in enrollments-page.tsx — Changed `<p>` wrapper to `<div>` for stat card value that contained `<Skeleton>` (which renders as `<div>`, invalid HTML)
- Re-seeded database with corrected Persian name data

**Stage Summary:**
- Sales panel now has agent selector for admin/manager users
- Seed data names are all in Persian for consistency
- HTML validation issue resolved
- Lint passes with 0 errors

---

### Phase 5 Status: Complete ✅

### Completed in This Round:
1. ✅ **Calendar View** — Full Persian/Shamsi monthly calendar with follow-up events, color-coded dots, day click popover, upcoming follow-ups panel
2. ✅ **CSV Import** — Upload CSV file, preview rows, import with validation/duplicate detection, success/error reporting
3. ✅ **Bulk Lead Operations** — Select multiple leads, bulk assign to agent, bulk status change, bulk delete with confirmation
4. ✅ **Sales Panel Agent Selector** — Admin/manager can switch between agents' panels
5. ✅ **Enhanced Login Page** — Glass-morphism card, floating gradient blobs, animated shimmer, login transition animation, dynamic year
6. ✅ **Enhanced Enrollments Page** — Summary stats, payment filter tabs, course price column, revenue summary, payment progress bars, delete confirmation
7. ✅ **Enhanced Dashboard** — Quick Actions buttons, Leads Trend sparkline, enhanced activity feed, lead score distribution, user welcome name
8. ✅ **Global CSS Animations** — shimmer, float, pulse-slow, gradient-shift, glass-morphism, gradient-border, shine-on-hover
9. ✅ **Seed Data Fix** — All names in Persian
10. ✅ **HTML Fix** — p/div nesting validation issue resolved

### Current Feature Count:
- **10 UI views**: Dashboard, Leads, Kanban Board, Sales Panel, Calendar, Analytics, Users, Courses, Interactions, Enrollments
- **21+ API endpoints**: dashboard, analytics, leads CRUD + export + import + status + convert + bulk, users CRUD + export, courses CRUD, enrollments CRUD + export, interactions CRUD + export
- **5 Database tables**: Users, Leads, Interactions, Courses, Enrollments
- **4 Enums**: UserRole, LeadStatus, InteractionType, PaymentStatus
- **Role-based access**: 4 roles with different nav visibility
- **Session persistence**: Zustand + localStorage
- **Dark mode**: Full theme support with proper dark variants
- **RTL layout**: Persian/Farsi throughout
- **Drag-and-drop**: Kanban board with @dnd-kit
- **Mobile bottom nav**: Glass-morphism with safe area
- **CSV export/import**: All 4 data tables export, leads import
- **Bulk operations**: Bulk assign, bulk status change, bulk delete for leads
- **Global search**: ⌘K keyboard shortcut
- **Calendar view**: Persian/Shamsi calendar with follow-up events
- **Accessibility**: aria-labels, data-testid, semantic HTML
- **Custom animations**: shimmer, float, pulse-slow, glass-morphism, gradient-border, shine-on-hover

### Remaining Priorities for Next Phase:
- Real-time notifications (WebSocket)
- Email/SMS integration for follow-up reminders
- Dashboard date range filtering
- Custom report builder
- Audit trail with detailed change tracking
- Course capacity management
- Payment tracking with installment schedules
- Lead scoring system
- Data backup and restore

---

### Task ID: 2 - Lead Scoring Backend Agent
**Agent:** Lead Scoring Backend Agent

**Work Log:**

**1. Lead Score Computation Library (`/src/lib/lead-scoring/compute.ts`):**
- Created shared `computeLeadScore()` function that calculates a lead's score (0-100) based on:
  - Has first AND last name: +10
  - Has phone number: +5
  - Source scoring: website=+15, campaign=+10, manual=+5
  - Has assigned agent: +10
  - Has target course: +10
  - Status scoring: CONTACTED=+10, IN_PROGRESS=+15, CONVERTED=+20
  - Number of interactions: +3 per interaction (max +15)
  - Has follow-up scheduled: +5
  - Notes not empty: +5
  - Recent activity (interaction in last 7 days): +5
- Score capped at 100
- Returns `{ score, breakdown }` with detailed point breakdown
- Created `computeAndSaveLeadScore()` that also persists the score to the database

**2. Lead Score API (`/src/app/api/leads/[id]/score/route.ts`):**
- GET endpoint: Computes a lead's score and updates it in the database
- Returns `{ lead_id, score, breakdown }` JSON response
- Persian error messages for 404 and 500 errors

**3. Batch Score Computation API (`/src/app/api/leads/compute-scores/route.ts`):**
- POST endpoint: Computes scores for ALL leads and updates them in the database
- Returns `{ totalLeads, updatedCount, errorCount, errors? }` JSON response
- Iterates through all leads, computes and saves each score
- Graceful error handling per lead (continues on individual failures)

**4. Updated Lead List API (`/src/app/api/leads/route.ts`):**
- GET endpoint now includes the `score` field in responses (already part of Lead model)
- For leads with score=0, computes the score on-the-fly and persists it to the database
- Uses `computeLeadScore()` from shared library

**5. Payments API (`/src/app/api/payments/route.ts`):**
- GET: List all payments with filtering by `enrollment_id`, `status`, `payment_type`
  - Includes enrollment → student + course relations in response
- POST: Create a new payment record
  - Validates `enrollment_id` and `amount` are required
  - Validates enrollment exists
  - Supports `payment_type` (FULL/INSTALLMENT), `status` (PENDING/PAID/OVERDUE), `due_date`, `paid_date`, `description`

**6. Payment Detail API (`/src/app/api/payments/[id]/route.ts`):**
- GET: Get single payment details with enrollment relations
- PUT: Update payment (mark as paid, change status, etc.)
  - Auto-sets `paid_date` to now when status is changed to PAID
  - Validates status against PaymentItemStatus enum
- DELETE: Delete a payment record

**7. Enrollment Payments API (`/src/app/api/enrollments/[id]/payments/route.ts`):**
- GET: Get all payments for an enrollment with summary
  - Returns `{ enrollment, payments, summary }` where summary includes total, paid, pending, overdue amounts and counts
- POST: Auto-generate installment payments for an enrollment
  - Accepts `installments` (3 or 6) in request body
  - Creates evenly distributed payments based on course price
  - Last installment adjusted to match total course price exactly
  - Updates enrollment `payment_status` to INSTALLMENT
  - Returns created payments with total amount info
  - Prevents duplicate installment generation (409 if payments already exist)

**8. Updated Courses API (`/src/app/api/courses/route.ts` and `/src/app/api/courses/[id]/route.ts`):**
- Both GET endpoints now include `capacityInfo` object:
  - `capacity`: max students per course
  - `currentEnrollments`: current enrollment count
  - `availableSpots`: remaining capacity
  - `utilizationPercentage`: percentage of capacity used
- Course POST now accepts `capacity` field (defaults to 30)
- Course PUT now accepts `capacity` field for updates

**API Testing Results:**
- ✅ Lead Score GET `/api/leads/{id}/score` — Returns score 78 with breakdown
- ✅ Batch Score POST `/api/leads/compute-scores` — Updated 15 leads successfully
- ✅ Courses GET `/api/courses` — Returns courses with capacityInfo
- ✅ Enrollment Payments POST `/api/enrollments/{id}/payments` — Created 3 installments
- ✅ Enrollment Payments GET `/api/enrollments/{id}/payments` — Returns payments with summary
- ✅ Payment GET `/api/payments/{id}` — Returns payment with enrollment details
- ✅ Payment PUT `/api/payments/{id}` — Marked as PAID with auto-set paid_date
- ✅ Lint passes with 0 errors

**Stage Summary:**
- Complete lead scoring system with 10 scoring criteria and detailed breakdowns
- Full Payments CRUD API with enrollment-level installment generation
- Course capacity management with utilization tracking
- All API endpoints tested and working
- Persian error messages throughout
- Shared scoring library for reuse across endpoints

---

### Task ID: 3 - Lead Detail Page Frontend
**Agent:** Lead Detail Page Frontend Agent

**Work Log:**
- Updated `/src/lib/store.ts`:
  - Added `'lead-detail'` to `ActiveView` type union
  - Added `selectedLeadId: string | null` and `setSelectedLeadId` to store
  - Added `'lead-detail'` to `roleNavConfig` for ADMIN, SALES_MANAGER, SALES_AGENT roles
- Created `/src/components/crm/lead-detail-page.tsx` with comprehensive lead detail page:
  - Header with lead name, status badge, score badge, back button, quick action buttons (Log Call, Add Note, Change Status, Convert)
  - 3-column profile cards grid: Personal Info, Assignment & Course, Score Visualization (Circular SVG progress)
  - Score Breakdown card showing all 10 criteria with checkmark/X icons and points earned/max
  - Notes card (conditional display)
  - Interaction Timeline with add new interaction form (type selector, content textarea, follow-up date, submit)
  - Timeline items color-coded by type (CALL=green, NOTE=amber, SYSTEM=gray) with Framer Motion animations
  - Status Change Dialog and Convert Dialog
  - Data fetched from `/api/leads/{id}`, `/api/leads/{id}/score`, `/api/interactions?lead_id={id}`, `/api/users?role=SALES_AGENT`
  - Full skeleton loading states, responsive design, dark mode support
- Updated `/src/app/page.tsx`:
  - Imported LeadDetailPage component
  - Added `'lead-detail'` case to ViewRenderer
  - Added `'lead-detail'` to sectionMap (section: 'فروش', label: 'جزئیات لید')
  - Did NOT add to navSections (navigated programmatically from leads/kanban)
- Updated `/src/components/crm/leads-page.tsx`:
  - Imported useCRMStore
  - Changed handleOpenDetail to navigate to lead detail page via setSelectedLeadId + setActiveView
- Updated `/src/components/crm/kanban-board.tsx`:
  - Imported useCRMStore
  - Changed handleViewDetail from placeholder toast to actual navigation to lead detail page

**Stage Summary:**
- Full lead detail page with profile cards, circular score visualization, score breakdown, interaction timeline
- Navigation from leads page (Eye button) and kanban board (مشاهده جزئیات) to lead detail
- Back button returns to leads list
- All Persian/Farsi text, RTL layout, emerald/teal color scheme
- Framer Motion animations, dark mode support, responsive design
- Lint passes with 0 errors


---

### Task ID: 5+7 - Dashboard Date Filter, Payment Tracking UI, Course Capacity Management
**Agent:** Dashboard + Payments + Courses UI Agent

**Work Log:**

**Feature 1: Dashboard Date Range Filter**
- Updated `/src/app/api/dashboard/route.ts`:
  - Added `startDate` and `endDate` query parameter support
  - When provided, filters leads, interactions by `createdAt` within the date range
  - Filters enrollments by `enrollment_date` within the date range
  - Filters upcoming follow-ups by `next_followup_date` within the date range
  - Filters leads per agent count and enrollments per course count by date range
  - When not provided, returns all-time data (current behavior preserved)
  - Returns `dateFilter` field in response indicating active filter state
- Updated `/src/components/crm/dashboard.tsx`:
  - Added date range filter state: `filterStartDate`, `filterEndDate`, `activeStartDate`, `activeEndDate`
  - Added `fetchData` as a `useCallback` that passes startDate/endDate as query params to `/api/dashboard`
  - Added compact date filter row below welcome header, above quick actions
  - Two date inputs (from/to) in Persian style with "تا" separator
  - "اعمال" (Apply) button and "همه" (All) clear button
  - Active filter indicator badge with pulsing dot and X close button
  - Framer Motion animation on filter row
  - Added `Filter`, `X` icons from lucide-react
  - Added `motion` from framer-motion import

**Feature 2: Payment Tracking UI in Enrollments Page**
- Updated `/src/components/crm/enrollments-page.tsx`:
  - Added "پرداخت‌ها" (Payments) button on each enrollment row with Wallet icon
  - Payment management dialog (`paymentDialogOpen`) showing:
    - Payment summary: 4 cards showing total amount, paid amount, pending amount, overdue amount
    - Action buttons: "ایجاد اقساط" (Create Installments), "افزودن پرداخت" (Add Payment), "بروزرسانی" (Refresh)
    - Installments sub-dialog with ۳ اقساط or ۶ اقساط options
    - Installment creation calls `POST /api/enrollments/{id}/payments` with `installments` count
    - Shows estimated installment amount based on course price
    - Disables installments button when payments already exist
    - Add single payment form: amount, due date, type (FULL/INSTALLMENT), description
    - Single payment creation calls `POST /api/payments`
    - Payments list with status badges: PENDING=amber, PAID=green, OVERDUE=red
    - Each payment shows: description, amount (formatted with تومان), due date (Persian), paid date, status badge
    - "تأیید پرداخت" (Mark as Paid) button on pending/overdue payments
    - Mark as paid calls `PUT /api/payments/{id}` with status: PAID
    - Payment amounts displayed in Persian with تومان suffix
    - Dates formatted using `Intl.DateTimeFormat('fa-IR')`
    - ScrollArea for payments list (max-h-72)
    - Framer Motion animations on payment items
    - Separator component for visual sections
    - Loading skeletons for payments
    - Empty state with helpful instructions
  - Added interfaces: Payment, PaymentSummary
  - Added state: paymentsLoading, markingPaid, installmentDialogOpen, installmentCount, creatingInstallments, addPaymentFormOpen, formPayAmount, formPayDueDate, formPayDescription, formPayType, addingPayment

**Feature 3: Course Capacity Management**
- Updated `/src/components/crm/courses-page.tsx`:
  - Added `CapacityInfo` interface matching API response
  - Added `getCapacityColor()` helper function:
    - <70%: green (emerald), "ظرفیت موجود"
    - 70-90%: amber, "نزدیک تکمیل"
    - >=90%: red, "ظرفیت تکمیل"
  - Grid view: Added capacity progress bar with:
    - "ظرفیت: X از Y" label
    - Visual progress bar with color coding (green/amber/red)
    - Percentage text in Persian numerals
    - Available spots count
    - Capacity badge on gradient header when >=70%
    - Framer Motion animated progress bar width
  - List view: Added capacity column showing:
    - Enrollment count / capacity with percentage
    - Color-coded progress bar
    - Capacity status badge
    - Available spots text
  - Create/edit dialog: Added capacity input field (number input, default 30)
    - Helper text: "حداکثر تعداد دانش‌پذیر قابل ثبت‌نام در این دوره"
    - Capacity sent in POST/PUT payload to API
  - Added "ظرفیت تکمیل" (Full Capacity) filter option showing courses with >=70% utilization
  - Statistics row expanded to 4 cards: Total, Active, Inactive, Full Capacity (with AlertTriangle icon)
  - All data comes from `capacityInfo` in the GET /api/courses response (already existed)

**Styling:**
- All new UI uses shadcn/ui components (Dialog, Badge, Button, Input, Select, ScrollArea, Separator)
- Emerald/teal color scheme maintained
- RTL layout, all text in Persian/Farsi
- Dark mode support throughout
- Framer Motion animations on new elements (progress bars, payment items, filter row)
- Responsive design

**Stage Summary:**
- Dashboard date range filter fully functional with API and UI
- Payment tracking with installments creation, single payment, and mark as paid
- Course capacity management with visual progress bars and filtering
- Lint passes with 0 errors
- All features use existing API endpoints (no new API changes needed)


### Task ID: 23 - Major Styling Enhancements (Phase 6)
**Agent:** Frontend Styling Enhancement Agent

**Work Log:**

**1. Global CSS Enhancements (`/src/app/globals.css`):**
- Added `.card-hover-lift` utility class for card lift effect on hover (translateY -4px + enhanced shadow)
- Added `@keyframes stagger-in` and `.stagger-item` class for staggered list animations
- Added `@keyframes gradient-border-move` and `.gradient-border-animated` for animated gradient borders
- Added `@keyframes count-up` and `.count-animate` for number value entrance animations
- Added `.ripple` utility class with emerald-colored radial gradient click effect
- Added `.premium-row-hover` utility for table rows with emerald left-border inset on hover (with dark mode variant)
- Added `.icon-tooltip` utility with CSS-only tooltip (attr(data-tip)) on hover
- Added `@keyframes typing-cursor` and `.typing-cursor` for typing animation blink effect
- Added `@keyframes particle-float` and `.particle-dot` for floating particle background animation

**2. Enhanced Leads Page (`/src/components/crm/leads-page.tsx`):**
- Added `score` field to Lead interface (0-100 lead quality score)
- Added lead score visual indicator badge next to each lead name:
  - Score 0-30: red badge, 31-60: amber badge, 61-100: green badge
  - Shows colored dot + numeric score value
- Added `getScoreBadge()` helper function with color thresholds
- Added "محاسبه امتیازها" (Compute Scores) button in header that calls POST /api/leads/compute-scores
- Added computing state with animated Zap icon during score computation
- Added "امتیاز" (Score) column header and score badge column to leads table
- Applied `premium-row-hover` class to table rows for emerald left-border inset effect
- Added stagger animation delay (index * 50ms) via inline style
- Improved status filter buttons with:
  - Colored dot indicators per status (sky for NEW, orange for CONTACTED, amber for IN_PROGRESS, emerald for CONVERTED)
  - Status-specific active class colors (each filter has its own color when active)
  - `ripple` class for click effect
- Improved row numbers: styled as centered rounded badges with muted background
- Added `Zap` and `Hash` icon imports
- Fixed pre-existing bug: LeadConvertDialog `onSuccess` → `onConverted` prop name mismatch

**3. Enhanced Sales Panel (`/src/components/crm/sales-panel.tsx`):**
- Added `score` field to Lead interface
- Added lead score indicator on each lead card (colored dot + numeric value next to name)
  - Uses `getScoreDotInfo()` helper (61+: emerald, 31-60: amber, 0-30: red)
- Added gradient top border on each lead card based on status:
  - NEW: amber gradient, CONTACTED: sky gradient, IN_PROGRESS: emerald gradient, CONVERTED: teal gradient
  - Uses `statusGradientColors` mapping
- Added gradient top border (h-1) on summary stat cards
- Applied `card-hover-lift` and `count-animate` classes to stat cards
- Reorganized stats cards: My Leads, Converted, Pending Follow-ups, New Leads
- Added gradient property to each stat card config
- Added dark mode bg variants to stat card icon containers
- Improved agent selector dropdown: emerald border, emerald focus ring
- Enhanced empty state: gradient circle container with centered icon (size-20)
- Added `statusGradientColors` and `getScoreDotInfo` helper objects/functions

**4. Enhanced Users Page (`/src/components/crm/users-page.tsx`):**
- Added user activity indicator: green/emerald dot for active users, gray dot for inactive (positioned at bottom-left of avatar)
- Added role-specific colored right borders on user rows:
  - ADMIN: emerald, SALES_MANAGER: amber, SALES_AGENT: sky, STUDENT: gray
  - Uses `roleBorderColors` mapping
- Added "آخرین فعالیت" (Last Activity) relative time badge under each user name
  - Shows "همین الان", "X دقیقه پیش", "X ساعت پیش", "X روز پیش"
  - Uses `getRelativeTime()` helper function
- Improved tab design with better visual distinction:
  - Emerald active state (`data-[state=active]:bg-emerald-600 data-[state=active]:text-white`)
  - Role icons on each tab (Shield, BarChart3, HeadphonesIcon, GraduationCap)
  - Styled TabsList with `bg-muted/40 p-1 gap-1`
- Added user count badges on each role tab (shows count of users per role)
- Applied `premium-row-hover` class to table rows

**5. Enhanced Login Page (`/src/components/crm/login-page.tsx`):**
- Added particle/dot animation in background using CSS `particle-dot` class:
  - 12 floating particles with random positions, delays, and durations
  - Emerald-colored 2-5px dots floating upward with fade effect
- Added typing animation effect on the title text "سیستم CRM آموزشی":
  - Characters appear one at a time (80ms interval)
  - Blinking cursor effect using `.typing-cursor` CSS class
  - Uses `useRef` for title text and `useState` for displayed chars
- Added "مرا به خاطر بسپار" (Remember Me) checkbox with emerald styling
- Added "فراموشی رمز عبور" (Forgot Password) link (visual only, shows toast on click)
- Added `Checkbox` component import
- Added `ripple` class to quick login buttons
- Added `useRef` and new state variables: `rememberMe`, `displayedTitle`, `titleComplete`

**6. Enhanced Analytics Page (`/src/components/crm/analytics-page.tsx`):**
- Added section transition animations sliding from different directions:
  - `slideFromRight` for Lead Funnel, Course Analytics
  - `slideFromLeft` for Agent Performance + Source, Revenue by Course
  - `slideFromBottom` for Key Metrics, Monthly Trend + Payment
- Improved chart containers with animated gradient borders at the top:
  - Each section has a unique gradient color strip with `gradient-border-animated` class
  - 1px animated gradient border at top of each Card
- Added data point count badges next to section titles:
  - Lead Funnel: "X لید" badge
  - Agent Performance: "X نفر" badge
  - Source Effectiveness: "X منبع" badge
  - Course Analytics: "X دوره" badge
  - Monthly Trend: "X ماه" badge
  - Payment Distribution: "X پرداخت" badge
  - Revenue by Course: "X دوره" badge
- Added print/export report buttons at the top:
  - "چاپ گزارش" (Print Report) button with Printer icon
  - "خروجی گزارش" (Export Report) button with FileDown icon
  - Print uses `window.print()`, Export creates HTML blob download
- Applied `card-hover-lift` and `count-animate` to Key Metrics stat cards
- Added `Button` component import
- Fixed Framer Motion TypeScript type issue: `ease: easeOut` → `ease: easeOut as const`

**Stage Summary:**
- 6 pages enhanced with premium micro-interactions and visual polish
- Global CSS adds 8 new utility classes for animations and effects
- Lead scores displayed visually across Leads page and Sales Panel
- Users page has activity indicators, role borders, count badges
- Login page has particle effects, typing animation, remember me, forgot password
- Analytics page has directional slide transitions, gradient borders, data badges, print/export
- All changes properly support dark mode
- Lint passes with 0 errors, TypeScript passes with 0 errors in modified files


---

## Phase 6: Lead Scoring, Payment Tracking, Lead Detail Page & Major Styling Enhancements ✅

### Task ID: 22 - QA Assessment & Planning
**Agent:** Main Agent

**Work Log:**
- Read worklog.md to understand Phase 5 status (all features complete)
- Performed comprehensive QA testing via agent-browser across all 11 views
- All views rendering correctly: Login, Dashboard, Leads, Kanban, Calendar, Sales Panel, Analytics, Users, Courses, Interactions, Enrollments
- No page errors detected
- Dark mode toggle works correctly
- Mobile view responsive with bottom navigation
- Lint passes with 0 errors
- Identified remaining priorities: Lead scoring, Payment tracking, Lead detail page, Dashboard date filter, Course capacity

**Stage Summary:**
- Application stable, all features working
- Planned Phase 6 features: Lead scoring, Payment/installment tracking, Lead detail page, Dashboard date filter, Course capacity, Major styling enhancements

---

### Task ID: 23 - Database Schema Updates
**Agent:** Main Agent

**Work Log:**
- Added `score` Int field (default 0) to Lead model for lead quality scoring (0-100)
- Added `capacity` Int field (default 30) to Course model for max students per course
- Added `Payment` model with: id, enrollment_id, amount, payment_type (FULL/INSTALLMENT), status (PENDING/PAID/OVERDUE), due_date, paid_date, description
- Added `PaymentType` enum (FULL, INSTALLMENT)
- Added `PaymentItemStatus` enum (PENDING, PAID, OVERDUE)
- Added `payments` relation to Enrollment model
- Ran `bun run db:push` to sync schema changes
- Re-seeded database with `bun prisma/seed.ts`

**Stage Summary:**
- Database now has 6 tables (User, Lead, Interaction, Course, Enrollment, Payment), 6 enums
- Lead scoring field ready for computation
- Payment tracking infrastructure in place

---

### Task ID: 24 - Lead Scoring & Payment APIs
**Agent:** Lead Scoring Backend Subagent

**Work Log:**
- Created `/src/lib/lead-scoring/compute.ts` — Shared scoring utility with 10 criteria (max 100 points):
  - Has name (+10), Has phone (+5), Source (website=+15, campaign=+10, manual=+5), Has agent (+10), Has course (+10), Status (CONTACTED=+10, IN_PROGRESS=+15, CONVERTED=+20), Interactions (+3 each, max +15), Follow-up (+5), Notes (+5), Recent activity (+5)
- Created `/src/app/api/leads/[id]/score/route.ts` — GET: computes, saves, and returns lead score with detailed breakdown
- Created `/src/app/api/leads/compute-scores/route.ts` — POST: batch compute all lead scores
- Updated `/src/app/api/leads/route.ts` — GET now computes scores on-the-fly for leads with score=0
- Created `/src/app/api/payments/route.ts` — GET/POST for payments with filtering
- Created `/src/app/api/payments/[id]/route.ts` — GET/PUT/DELETE for individual payments
- Created `/src/app/api/enrollments/[id]/payments/route.ts` — GET payments for enrollment + POST to create installments (3 or 6)
- Updated `/src/app/api/courses/route.ts` — Added `capacityInfo` (capacity, currentEnrollments, availableSpots, utilizationPercentage)

**Stage Summary:**
- Complete lead scoring system with 10-factor computation
- Full payment CRUD API with installment generation
- Course capacity info API

---

### Task ID: 25 - Lead Detail Page
**Agent:** Lead Detail Page Frontend Subagent

**Work Log:**
- Created `/src/components/crm/lead-detail-page.tsx` with comprehensive lead profile:
  - Header with name, status badge, score badge, back button, 4 quick action buttons
  - 3 profile cards: Personal info, Assignment & Course (with avatars), Score Visualization (animated circular SVG)
  - Score Breakdown card with 10 criteria grid showing ✅/❌ icons and points earned/max
  - Notes card with pre-wrap formatting
  - Interaction Timeline with add form, color-coded items (CALL=green, NOTE=amber, SYSTEM=gray), Framer Motion animations
  - Status change dialog and Lead conversion dialog
  - Score color coding: red (0-30), amber (31-60), green (61-100)
- Updated store: Added 'lead-detail' to ActiveView, selectedLeadId state, roleNavConfig
- Updated page.tsx: Added lead-detail to ViewRenderer and sectionMap
- Updated leads-page.tsx: "مشاهده" button navigates to lead detail page
- Updated kanban-board.tsx: "مشاهده جزئیات" navigates to lead detail page

**Stage Summary:**
- Full lead detail page with all information, interactions, score visualization
- Navigable from both leads list and kanban board

---

### Task ID: 26 - Dashboard Date Filter, Payment UI, Course Capacity
**Agent:** Dashboard + Payments + Courses UI Subagent

**Work Log:**
- **Dashboard Date Range Filter:**
  - Updated `/src/app/api/dashboard/route.ts` with startDate/endDate query params
  - Added compact date filter row to dashboard with two date inputs, Apply/All buttons
  - Active filter indicator badge with pulsing dot
- **Payment Tracking UI in Enrollments Page:**
  - "پرداخت‌ها" button on each enrollment row
  - Payment management dialog with: summary cards (total/paid/pending/overdue), payment list with status badges
  - "ایجاد اقساط" sub-dialog with ۳ or ۶ installment options
  - "افزودن پرداخت" form for single payments
  - "تأیید پرداخت" button to mark payments as paid
  - All amounts in Persian with تومان, dates in Jalali
- **Course Capacity Management:**
  - Capacity progress bars in grid and list views (green <70%, amber 70-90%, red ≥90%)
  - Capacity input in create/edit dialogs
  - "ظرفیت تکمیل" filter showing near-capacity courses
  - 4th statistics card showing full capacity count

**Stage Summary:**
- Dashboard now supports date range filtering
- Full payment tracking with installment generation
- Course capacity management with visual progress bars

---

### Task ID: 27 - Major Styling Enhancements
**Agent:** Frontend Styling Expert Subagent

**Work Log:**
- **Global CSS (`/src/app/globals.css`):** Added 8 new utilities:
  - `.card-hover-lift` — Card lifts 4px with shadow on hover
  - `.stagger-item` — Staggered fade-in animation
  - `.gradient-border-animated` — Animated gradient border
  - `.count-animate` — Number entrance animation
  - `.ripple` — Emerald click effect
  - `.premium-row-hover` — Table row hover with emerald left-border
  - `.icon-tooltip` — CSS-only tooltip
  - `.typing-cursor`, `.particle-dot` — Login animations
- **Leads Page:** Lead score badge (red/amber/green), "محاسبه امتیازها" button, premium-row-hover, improved status filters, styled row numbers
- **Sales Panel:** Lead score indicator, gradient top border per status, enhanced stat cards, improved agent selector, enhanced empty state
- **Users Page:** Activity indicator dot on avatars, role-specific colored borders, "آخرین فعالیت" badge, improved tabs with count badges
- **Login Page:** 12 floating particle dots, typing animation on title, "مرا به خاطر بسپار" checkbox, "فراموشی رمز عبور" link, ripple effect
- **Analytics Page:** Directional slide transitions, animated gradient borders, data point count badges, "چاپ گزارش"/"خروجی گزارش" buttons

**Stage Summary:**
- All pages have enhanced micro-interactions and visual polish
- Consistent animation language across the app
- New utilities available for future components

---

### Task ID: 28 - Bug Fixes & TypeScript Errors
**Agent:** Main Agent

**Work Log:**
- Fixed `dir="ltr"` prop on Phone icon in lead-detail-page.tsx (not valid for Lucide icons)
- Fixed `dir="rtl"` prop on DropdownMenuContent in kanban-board.tsx (not valid prop)
- Fixed boolean null issue in calendar-page.tsx Popover `open` prop (added `!!` cast)
- Fixed `data.status` type assertion in leads bulk route (added `as LeadStatus` type)
- Added explicit type annotation for `createdPayments` array in enrollment payments route
- Added explicit type annotation for `monthlyTrend` array in analytics route
- Added explicit type annotation for `days` array in dashboard leadsTrendData

**Stage Summary:**
- All critical TypeScript errors fixed
- Lint passes with 0 errors
- All API endpoints tested and returning correct data

---

## Phase 6 Status: Complete ✅

### Completed in This Round:
1. ✅ **Lead Scoring System** — 10-factor scoring (0-100) with API + visual indicators + circular progress
2. ✅ **Lead Detail Page** — Full profile with timeline, score breakdown, quick actions
3. ✅ **Payment/Installment Tracking** — DB model + CRUD API + payment management UI with installment generation
4. ✅ **Dashboard Date Range Filter** — startDate/endDate API params + compact filter UI
5. ✅ **Course Capacity Management** — capacity field + progress bars + filter
6. ✅ **Major Styling Enhancements** — 8 global utilities, enhanced 6 pages with micro-interactions
7. ✅ **TypeScript Bug Fixes** — Fixed 7 type errors across 5 files
8. ✅ **QA Testing** — All APIs verified (users, leads, dashboard, payments, scoring)

### Current Feature Count:
- **12 UI views**: Dashboard, Leads, Lead Detail, Kanban Board, Calendar, Sales Panel, Analytics, Users, Courses, Interactions, Enrollments, Login
- **25+ API endpoints**: dashboard, analytics, leads CRUD + export + import + status + convert + score + bulk, users CRUD + export, courses CRUD + capacity, enrollments CRUD + export + payments, interactions CRUD + export, payments CRUD
- **6 Database tables**: Users, Leads, Interactions, Courses, Enrollments, Payments
- **6 Enums**: UserRole, LeadStatus, InteractionType, PaymentStatus, PaymentType, PaymentItemStatus
- **Lead Scoring**: 10-factor computation with visual breakdown
- **Payment Tracking**: Installment generation (3/6), payment status management
- **Course Capacity**: Visual progress bars with utilization tracking
- **Role-based access**: 4 roles with different nav visibility
- **Session persistence**: Zustand + localStorage
- **Dark mode**: Full theme support with proper dark variants
- **RTL layout**: Persian/Farsi throughout
- **Date filtering**: Dashboard date range filter
- **CSV import/export**: All 4 data tables
- **Global search**: ⌘K keyboard shortcut
- **Accessibility**: aria-labels, data-testid, semantic HTML

### Remaining Priorities for Next Phase:
- Real-time notifications (WebSocket)
- Email/SMS integration for follow-up reminders
- Audit trail with detailed change tracking
- Custom report builder
- Lead scoring weight customization
- Advanced dashboard with more interactive charts
- Multi-language support (English/Farsi toggle)
- Data backup and restore
- User activity logging


---

### Task ID: 30 - Settings/Profile Page
**Agent:** Settings Page Agent

**Work Log:**
- Created `/src/components/crm/settings-page.tsx` with comprehensive settings page:
  - **Profile Section**: Avatar with initials in emerald gradient circle, full name, role badge (color-coded), phone number, edit profile button with inline edit form (first_name, last_name, phone_number), save/cancel buttons, API integration via PUT `/api/users/{id}`
  - **Account Settings Section**: Active status display with green dot indicator, role badge (read-only) with color-coded styling per role
  - **Notification Preferences Section**: Toggle switches for email notifications, SMS notifications, follow-up reminders — all stored in localStorage via `crm-notification-prefs` key
  - **Appearance Section**: Dark/Light mode toggle using next-themes `useTheme`, font size selector (small/medium/large) with button group — stored in localStorage via `crm-font-size` key and applied to document root
  - **Data Section**: Export all data button (placeholder with toast), Clear cache button (clears localStorage and reloads page)
  - **Danger Zone Section**: Delete account button with red styling, AlertDialog confirmation requiring user to type "حذف" (delete in Farsi), calls DELETE `/api/users/{id}` API
  - Framer Motion section transition animations with staggered delays
  - Gradient top borders on all cards (emerald→teal)
  - Section headers with gradient icon backgrounds and decorative gradient lines
  - Full RTL layout with dir="rtl"
  - Dark mode support with proper dark: variants
  - All text in Persian/Farsi
  - Emerald/teal color scheme throughout
- API endpoint already existed: `/src/app/api/users/[id]/route.ts` — PUT handler already supports first_name, last_name, phone_number, role, is_active fields. No changes needed.
- Updated `/src/lib/store.ts`:
  - Added `"settings"` to `ActiveView` type union
  - Added `"settings"` to `roleNavConfig` for all 4 roles: STUDENT, SALES_AGENT, SALES_MANAGER, ADMIN
- Updated `/src/app/page.tsx`:
  - Added `Settings` icon import from lucide-react
  - Added `SettingsPage` component import
  - Added new navSection `{ title: "تنظیمات", items: [{ key: "settings", label: "تنظیمات", icon: Settings }] }`
  - Added `settings` entry to `sectionMap`: `{ section: "تنظیمات", label: "تنظیمات" }`
  - Added `settings` case to ViewRenderer: `<SettingsPage key={refreshKey} />`
- Updated `/src/components/crm/global-search.tsx`:
  - Added `Settings` icon import from lucide-react
  - Added `{ key: "settings", label: "تنظیمات", section: "تنظیمات", icon: Settings }` to searchItems
- Updated `/src/components/crm/mobile-bottom-nav.tsx`:
  - Added `settings: "dashboard"` mapping to `viewToNavMap`
- Lint passes with 0 errors

**Stage Summary:**
- Full Settings/Profile page with 6 sections: Profile, Account, Notifications, Appearance, Data, Danger Zone
- Profile editing with API integration (PUT /api/users/{id})
- Notification preferences persisted to localStorage
- Font size preference persisted and applied globally
- Dark mode toggle integrated with next-themes
- Delete account with confirmation dialog
- Settings accessible from sidebar, global search, and mobile nav
- All roles can access settings page


---

### Task ID: 31 - Dashboard, Leads, Sales Panel & Global Styling Enhancements
**Agent:** Frontend Styling Expert Agent

**Work Log:**

**1. Global CSS Enhancements (`/src/app/globals.css`):**
- Added 3 new animation keyframes: `slide-in-right` (slide from right with opacity), `scale-in` (scale from 0.95 to 1 with opacity), `count-up-num` (number counter with bounce)
- Added new utility classes:
  - `.card-hover-effect`: Hover effect with subtle lift, emerald shadow increase, border color change (with dark mode)
  - `.stat-card-shine`: One-time shine sweep animation on mount (diagonal light sweep)
  - `.gradient-text-emerald`: Text with emerald gradient (135deg, emerald→teal→teal-dark)
  - `.animate-slide-in-right`, `.animate-scale-in`, `.animate-count-up`: Utility classes for new keyframes
- Improved scrollbar styles:
  - Thinner webkit scrollbar (5px) with emerald-themed thumb (rgba emerald colors)
  - Added scrollbar-corner transparent
  - Added Firefox scrollbar support (`scrollbar-width: thin`, `scrollbar-color`)
  - Dark mode scrollbar colors for both webkit and Firefox
- Removed old scrollbar styles (replaced by improved versions)

**2. Dashboard Enhancement (`/src/components/crm/dashboard.tsx`):**
- Added time-of-day greeting with motivational messages:
  - Morning (6-12): "صبح بخیر! روز پرانرژی‌ای داشته باشید" with Sunrise icon
  - Afternoon (12-18): "ظهر بخیر! امیدوارم روز خوبی داشته باشید" with Sun icon
  - Evening (18-24): "عصر بخیر! وقت استراحت نزدیک است" with Sunset icon
  - Night (0-6): "شب بخیر! فردا روز جدیدی است" with Moon icon
- Added pending tasks count for today below the greeting (with Zap icon)
- Added "Today's Follow-ups" section (پیگیری‌های امروز) after Quick Actions:
  - Shows follow-ups due today with "امروز" (Today) badge and pulse indicator
  - Each item shows: lead name, agent name, time, and interaction type icon
  - Overdue items shown with red/amber styling and "تأخیر" (Overdue) badge
  - Emerald accent color with "View All" link to calendar page
  - Uses `todayFollowups` computed from `data.upcomingFollowups` filtered to today's date
- Enhanced stat cards with sparkline-like progress bars:
  - Each card now shows a thin progress bar based on relative value among all stat cards
  - Gradient-colored bars matching each card's color scheme
  - Added `stat-card-shine` class for one-time shine animation on mount
  - Changed background from flat color to gradient (from stat color to transparent)
  - Added `animate-count-up` class to stat values

**3. Leads Page Enhancement (`/src/components/crm/leads-page.tsx`):**
- Added "Lead Status Pipeline Bar" (خط لوله وضعیت لیدها) at top of page:
  - Segmented horizontal bar showing distribution of leads across 4 statuses
  - NEW = sky, CONTACTED = amber, IN_PROGRESS = yellow, CONVERTED = emerald
  - Shows percentage and count for each segment in legend below the bar
  - Only visible when there are leads
  - Framer Motion entrance animation
- Added "Quick View Tooltip" on hover over lead rows:
  - Shows: last interaction date, number of interactions, assigned agent name
  - Uses shadcn/ui Tooltip component with `side="left"` positioning
  - Wrapped with `TooltipProvider` with 300ms delay
  - Icons for each data point (FileText, Hash, Users)

**4. Sales Panel Enhancement (`/src/components/crm/sales-panel.tsx`):**
- Added "عملکرد من" (My Performance) section with 3 metric cards:
  - Leads converted this month: count with target progress bar (monthly target: 10)
  - Total calls this month: count with PhoneCall icon and response rate indicator
  - Average response time: placeholder "۲ ساعت" with clock icon and quality rating
  - Each card with gradient background, icon, and emerald/teal color scheme
  - Uses `useMemo` for computed metrics (leadsConvertedThisMonth, totalCallsThisMonth)
- Added "Quick Dial Button" next to each lead in the list:
  - Phone icon button that shows toast notification "تماس با [name]..." when clicked
  - Positioned before the existing "Log Call" button
  - Emerald colored hover effect

**Stage Summary:**
- Dashboard has time-of-day greetings, today's follow-ups section, sparkline progress bars on stat cards, shine animation
- Leads page has status pipeline bar and quick view tooltips on hover
- Sales panel has performance metrics section and quick dial button
- Global CSS has new animations, utility classes, and improved scrollbar styles
- All changes support dark mode with proper dark variants
- Lint passes with 0 errors

---
Task ID: 30 - Settings/Profile Page
Agent: Full-stack Developer Subagent

Work Log:
- Created `/src/components/crm/settings-page.tsx` with 6 sections:
  - Profile section: Avatar with emerald gradient initials, name/role/phone, inline edit form with API save
  - Account Settings: Active/Inactive status indicator, role badge (read-only)
  - Notification Preferences: Toggle switches for email, SMS, follow-up reminders (persisted to localStorage)
  - Appearance: Dark/Light mode toggle via next-themes, font size selector (small/medium/large)
  - Data: Export all data button (placeholder), Clear cache button (clears localStorage + reloads)
  - Danger Zone: Delete account button with red styling and AlertDialog confirmation
  - Framer Motion staggered animations, gradient top borders, dark mode support, full RTL
- Updated `/src/lib/store.ts`: Added 'settings' to ActiveView type and all roleNavConfig entries
- Updated `/src/app/page.tsx`: Added Settings icon, SettingsPage import, "تنظیمات" nav section, sectionMap entry, ViewRenderer case
- Updated `/src/components/crm/global-search.tsx`: Added Settings icon and settings search entry
- Updated `/src/components/crm/mobile-bottom-nav.tsx`: Added settings: 'dashboard' mapping

Stage Summary:
- Full settings page with profile editing, notification preferences, appearance settings, danger zone
- Available to all user roles
- Lint passes with 0 errors

---
Task ID: 31 - Dashboard Enhancement, Leads Pipeline Bar, Sales Panel Performance
Agent: Full-stack Developer Subagent

Work Log:
- Enhanced Dashboard with:
  - Time-of-day greeting (Morning/Afternoon/Evening/Night with matching Persian messages and icons)
  - Pending tasks count for today's follow-ups
  - Today's Follow-ups section showing items due today with "امروز" badge, overdue items in red with "تأخیر" badge
  - "View All" link to calendar page
  - Stat card sparklines with progress bars and gradient backgrounds
  - stat-card-shine animation and animate-count-up on values
- Enhanced Leads page with:
  - Lead Status Pipeline Bar at top: segmented horizontal bar showing distribution across 4 statuses (NEW=sky, CONTACTED=amber, IN_PROGRESS=yellow, CONVERTED=emerald) with percentage and count labels
  - Quick View Tooltip on hover: shows last interaction date, number of interactions, assigned agent name
- Enhanced Sales Panel with:
  - Performance Metrics Section ("عملکرد من"): 3 cards showing leads converted this month (with target progress bar), total calls made, average response time
  - Quick Dial Button: phone icon next to each lead that shows toast "تماس با [name]..." when clicked
- Enhanced Global CSS with:
  - 3 new animation keyframes: slide-in-right, scale-in, count-up-num
  - New utility classes: .card-hover-effect, .stat-card-shine, .gradient-text-emerald, .animate-slide-in-right, .animate-scale-in, .animate-count-up
  - Improved scrollbar styles: thinner 5px scrollbar with emerald-themed colors for Webkit and Firefox, dark mode support

Stage Summary:
- Dashboard has time-of-day greeting, today's follow-ups section, stat sparklines
- Leads page has pipeline distribution bar and hover tooltips
- Sales Panel has performance metrics and quick dial buttons
- Global CSS has new animation utilities and better scrollbars
- Lint passes with 0 errors

---
## Phase 7: Settings Page, Dashboard & Sales Enhancements ✅

### Completed in This Round:
1. ✅ **Settings/Profile Page** — Full page with profile editing, notifications, appearance, danger zone
2. ✅ **Time-of-Day Greeting** — Dynamic Persian greeting based on morning/afternoon/evening/night
3. ✅ **Today's Follow-ups Section** — Dashboard section showing follow-ups due today with overdue indicators
4. ✅ **Lead Status Pipeline Bar** — Segmented bar on Leads page showing status distribution
5. ✅ **Quick View Tooltip** — Hover tooltip on lead rows showing last interaction, count, agent
6. ✅ **Sales Panel Performance Metrics** — "عملکرد من" section with conversion, calls, response time
7. ✅ **Quick Dial Buttons** — Phone icon buttons next to each lead in sales panel
8. ✅ **Global CSS Animations** — New slide-in, scale-in, count-up animations and utilities
9. ✅ **Improved Scrollbar Styles** — Thinner emerald-themed scrollbars for Webkit and Firefox

### Current Feature Count:
- **12 UI views**: Dashboard, Leads, Kanban Board, Calendar, Sales Panel, Analytics, Users, Courses, Interactions, Enrollments, Lead Detail, Settings
- **20+ API endpoints**: Full CRUD + export + bulk + convert + status + analytics + dashboard
- **5 Database tables**: Users, Leads, Interactions, Courses, Enrollments
- **4 Enums**: UserRole, LeadStatus, InteractionType, PaymentStatus
- **Role-based access**: 4 roles with different nav visibility
- **Session persistence**: Zustand + localStorage
- **Dark mode**: Full theme support with settings page toggle
- **RTL layout**: Persian/Farsi throughout
- **Drag-and-drop**: Kanban board with @dnd-kit
- **Mobile bottom nav**: Glass-morphism with safe area
- **CSV export/import**: All 4 data tables
- **Global search**: ⌘K keyboard shortcut
- **Settings page**: Profile editing, appearance, notifications, danger zone

### Unresolved Issues / Next Phase Priorities:
- Real-time notifications (WebSocket)
- Email/SMS integration for follow-up reminders
- Custom report builder
- Audit trail with detailed change tracking
- Payment tracking with installment schedules
- Lead scoring algorithm improvement (currently score field exists but not used in scoring logic)
- Dashboard date range filtering
- Course capacity management with auto-notifications
- Multi-language support (English option)
- Data backup and restore functionality

