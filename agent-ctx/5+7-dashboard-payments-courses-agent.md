# Task 5+7 - Dashboard + Payments + Courses UI Agent

## Work Completed

### Feature 1: Dashboard Date Range Filter
- Updated `/src/app/api/dashboard/route.ts` to accept `startDate` and `endDate` query parameters
- Updated `/src/components/crm/dashboard.tsx` with compact date range filter UI (from/to date inputs, apply/clear buttons, active filter indicator)

### Feature 2: Payment Tracking UI in Enrollments Page
- Updated `/src/components/crm/enrollments-page.tsx` with full payment management:
  - "پرداخت‌ها" button on each enrollment row
  - Payment management dialog with summary cards, payment list, installment creation, single payment form, mark as paid

### Feature 3: Course Capacity Management
- Updated `/src/components/crm/courses-page.tsx` with:
  - Capacity progress bars (color-coded green/amber/red) in grid and list views
  - Capacity input in create/edit dialogs
  - "ظرفیت تکمیل" filter option
  - Full capacity statistics card

### Verification
- Lint passes with 0 errors
- All features use existing API endpoints
