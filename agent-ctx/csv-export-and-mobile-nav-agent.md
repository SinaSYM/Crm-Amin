# Task: CSV Export APIs + Mobile Bottom Nav

## Summary
Completed both tasks: created 3 CSV export API endpoints and a mobile bottom navigation bar component, plus integrated everything into the existing CRM system.

## Files Created

### API Endpoints (Task 1)
1. `/src/app/api/enrollments/export/route.ts` - Exports enrollments as CSV with BOM, includes student and course data, Persian payment status labels
2. `/src/app/api/users/export/route.ts` - Exports users as CSV with BOM, Persian role labels and activity status
3. `/src/app/api/interactions/export/route.ts` - Exports interactions as CSV with BOM, includes lead and agent data, Persian interaction type labels

### Component (Task 2)
4. `/src/components/crm/mobile-bottom-nav.tsx` - Mobile bottom navigation with 5 items (Dashboard, Leads, Sales Panel, Courses, More), glass-morphism effect, emerald active state, safe area padding, only visible < lg breakpoint

## Files Modified

5. `/src/app/page.tsx` - Added MobileBottomNav import and component placement after footer, added `pb-20 lg:pb-4` to footer for mobile spacing
6. `/src/components/crm/enrollments-page.tsx` - Added Download icon, "خروجی CSV" button, handleExportCSV function
7. `/src/components/crm/users-page.tsx` - Added Download icon, "خروجی CSV" button, handleExportCSV function

## Patterns Used
- All CSV exports follow the same pattern as existing `/api/leads/export/route.ts`
- BOM (`\uFEFF`) for UTF-8 Persian text support
- Prisma `include` for related data
- Persian labels for enum values
- Blob download with auto-generated filenames

## Verification
- `bun run lint` passes with zero errors
- Dev server running without issues
