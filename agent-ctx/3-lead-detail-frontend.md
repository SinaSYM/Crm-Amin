# Task ID: 3 - Lead Detail Page Frontend Agent

## Work Log

### 1. Updated `/src/lib/store.ts`
- Added `'lead-detail'` to `ActiveView` type union
- Added `selectedLeadId: string | null` and `setSelectedLeadId: (id: string | null) => void` to CRMStore interface
- Added `selectedLeadId: null` and `setSelectedLeadId` to the store implementation
- Added `'lead-detail'` to `roleNavConfig` for ADMIN, SALES_MANAGER, and SALES_AGENT roles

### 2. Created `/src/components/crm/lead-detail-page.tsx`
A comprehensive lead detail page with:

**Header Section:**
- Lead name in large bold text with status badge and score badge
- Phone number, source, and creation date in subtitle
- Back button (arrow) to return to leads list
- Quick action buttons: ثبت تماس (Log Call), افزودن یادداشت (Add Note), تغییر وضعیت (Change Status), تبدیل (Convert)

**Profile Cards Grid (3-column on desktop):**
- Personal Info Card: name, phone, source, creation date
- Assignment Card: assigned agent with avatar initials, target course with icon, current status, interaction count
- Score Visualization Card: Circular SVG progress indicator (animated), score label (ضعیف/متوسط/عالی), color-coded (red 0-30, amber 31-60, green 61-100)

**Score Breakdown Card:**
- Shows all 10 scoring criteria in a grid (5 columns on desktop)
- Each criterion shows checkmark/X icon, label, and points earned/max
- Green background for criteria met, muted for zero points
- Uses data from `/api/leads/{id}/score`

**Notes Card:**
- Shows lead notes if present, with pre-wrap formatting

**Interaction Timeline:**
- Add New Interaction form at top (dashed border, emerald theme)
  - Type selector (CALL/NOTE)
  - Content textarea
  - Follow-up date picker
  - Submit button with loading state
- Timeline of all interactions with:
  - Type icon in colored circle (CALL=green, NOTE=amber, SYSTEM=gray)
  - Gradient timeline connector line
  - Color-coded content cards by interaction type
  - Agent name, relative time, follow-up date
  - Framer Motion animations on each item
- ScrollArea with max-h-96 for overflow

**Status Change Dialog:**
- Shows current status badge
- Select for new status
- Save button

**Convert Dialog:**
- Uses existing LeadConvertDialog component

**Data Fetching:**
- `/api/leads/{id}` for lead details (with assigned_to, target_course, interactions)
- `/api/leads/{id}/score` for score and breakdown
- `/api/interactions?lead_id={id}` for full interactions
- `/api/users?role=SALES_AGENT` for agent list

**Loading States:**
- Full skeleton loading for header, cards, and timeline

### 3. Updated `/src/app/page.tsx`
- Imported `LeadDetailPage` component
- Added `'lead-detail'` case to `ViewRenderer` switch
- Added `'lead-detail'` entry to `sectionMap` with section: 'فروش', label: 'جزئیات لید'
- Did NOT add to navSections (it's navigated to programmatically, not from sidebar)

### 4. Updated `/src/components/crm/leads-page.tsx`
- Imported `useCRMStore` from `@/lib/store`
- Destructured `setSelectedLeadId` and `setActiveView` from store
- Changed `handleOpenDetail` to navigate to lead detail page instead of opening dialog:
  ```typescript
  setSelectedLeadId(lead.id)
  setActiveView('lead-detail')
  ```

### 5. Updated `/src/components/crm/kanban-board.tsx`
- Imported `useCRMStore` from `@/lib/store`
- Destructured `setSelectedLeadId` and `setActiveView` from store
- Changed `handleViewDetail` from placeholder toast to actual navigation:
  ```typescript
  setSelectedLeadId(lead.id)
  setActiveView('lead-detail')
  ```

## Lint & Dev Server
- `bun run lint` passes with 0 errors
- Dev server running successfully on port 3000

## Stage Summary
- Full lead detail page with profile cards, score visualization, interaction timeline
- Navigation from leads page and kanban board to lead detail
- Back button returns to leads list
- All text in Persian/Farsi
- RTL layout with emerald/teal color scheme
- Framer Motion animations throughout
- Dark mode support
- Responsive design (mobile-first)
