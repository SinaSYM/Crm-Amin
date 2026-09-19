# Task 3-a: Layout & Store Agent

## Summary
Created the Zustand store, main application layout, and dashboard component for the Persian/Farsi CRM system "آموزش‌نگار".

## Files Created/Modified
1. **`src/lib/store.ts`** - Zustand store with `activeView`, `sidebarOpen`, `currentUser` state
2. **`src/components/crm/dashboard.tsx`** - Dashboard with stat cards, pie chart, recent leads, follow-ups
3. **`src/app/page.tsx`** - Full RTL CRM layout with header, sidebar, and dynamic content
4. **`src/app/layout.tsx`** - Updated with `lang="fa"`, `dir="rtl"`, Vazirmatn Persian font

## Key Decisions
- Used Zustand for client-side state management (store at `src/lib/store.ts`)
- RTL layout with sidebar on the right side
- Emerald/teal color scheme (educational theme, no indigo/blue)
- Vazirmatn font via Google Fonts CDN (not available in next/font/google)
- Responsive: sidebar overlay on mobile, fixed sidebar on desktop
- Dashboard fetches from `/api/dashboard` which was set up by Task 2
- Used shadcn/ui ChartContainer with recharts for pie chart
- All labels in Persian/Farsi with proper RTL support

## Verification
- `bun run lint` passes with 0 errors
- Dev server compiles and serves the page correctly
- Dashboard API returns proper data from seeded database
