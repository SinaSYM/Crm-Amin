# Task ID: 30 - Settings/Profile Page

## Work Record

### Files Created
- `/src/components/crm/settings-page.tsx` - Full settings page component with 6 sections

### Files Modified
- `/src/lib/store.ts` - Added 'settings' to ActiveView and all roleNavConfig entries
- `/src/app/page.tsx` - Added Settings icon, SettingsPage import, nav section, sectionMap entry, ViewRenderer case
- `/src/components/crm/global-search.tsx` - Added Settings icon and settings search entry
- `/src/components/crm/mobile-bottom-nav.tsx` - Added settings: 'dashboard' mapping

### Files Checked (No Changes Needed)
- `/src/app/api/users/[id]/route.ts` - PUT handler already exists with first_name, last_name, phone_number support

### Key Implementation Details
- Settings page has 6 sections: Profile, Account Settings, Notifications, Appearance, Data, Danger Zone
- Profile editing uses PUT /api/users/{id} and updates the Zustand store
- Notification preferences stored in localStorage key `crm-notification-prefs`
- Font size stored in localStorage key `crm-font-size` and applied to document root
- Dark/Light mode uses next-themes useTheme hook
- Delete account requires typing "حذف" for confirmation
- All sections have Framer Motion staggered animations
- Cards have gradient top borders (emerald→teal)
- Full RTL layout, dark mode support, Persian text throughout

### Lint Status
- `bun run lint` passes with 0 errors
