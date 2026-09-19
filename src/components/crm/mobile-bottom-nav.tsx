'use client'

import { LayoutDashboard, Users, Headphones, BookOpen, Menu } from 'lucide-react'
import { useCRMStore, roleNavConfig } from '@/lib/store'
import type { ActiveView } from '@/lib/store'

interface NavItem {
  key: ActiveView | 'more'
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { key: 'leads', label: 'لیدها', icon: Users },
  { key: 'sales-panel', label: 'پنل فروش', icon: Headphones },
  { key: 'courses', label: 'دوره‌ها', icon: BookOpen },
  { key: 'more', label: 'بیشتر', icon: Menu },
]

// Map views that aren't directly in the bottom nav to their closest related tab
const viewToNavMap: Partial<Record<ActiveView, string>> = {
  kanban: 'leads',         // Kanban is a leads-related view
  calendar: 'leads',       // Calendar relates to leads
  interactions: 'leads',   // Interactions relate to leads
  enrollments: 'courses',  // Enrollments relate to courses
  users: 'more',           // Users is admin-only
  analytics: 'more',       // Analytics is manager-only
  settings: 'dashboard',   // Settings maps to dashboard nav
}

export default function MobileBottomNav() {
  const { activeView, setActiveView, setSidebarOpen, currentUser } = useCRMStore()

  // Only show nav items the current user's role is allowed to open,
  // so users never tap a link that just bounces back to the dashboard.
  const allowedViews = currentUser ? (roleNavConfig[currentUser.role] || roleNavConfig.ADMIN) : roleNavConfig.ADMIN
  const visibleItems = navItems.filter(
    (item) => item.key === 'more' || allowedViews.includes(item.key as ActiveView)
  )

  const handleClick = (item: NavItem) => {
    if (item.key === 'more') {
      setSidebarOpen(true)
    } else {
      setActiveView(item.key as ActiveView)
    }
  }

  // Determine which nav item should appear active
  const getActiveNavKey = (view: ActiveView): string => {
    if (navItems.some((item) => item.key === view)) return view
    return viewToNavMap[view] || 'more'
  }

  const activeNavKey = getActiveNavKey(activeView)

  return (
    <nav
      dir="rtl"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
      aria-label="ناوبری موبایل"
    >
      {/* Top hairline */}
      <div className="h-px bg-border" />
      <div className="shadow-[0_-2px_12px_rgba(15,15,15,0.04)] dark:shadow-[0_-2px_12px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-around glass-panel rounded-t-2xl px-2 pb-[env(safe-area-inset-bottom,8px)] pt-1.5">
          {visibleItems.map((item) => {
            const isActive = item.key === activeNavKey
            const Icon = item.icon

            return (
              <button
                key={item.key}
                onClick={() => handleClick(item)}
                className="flex flex-col items-center justify-center gap-1 min-w-[56px] py-1.5 px-2 rounded-lg transition-colors relative"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active pill background */}
                {isActive && (
                  <span className="absolute inset-x-1 top-0 bottom-0 rounded-lg bg-accent -z-10" />
                )}
                <Icon
                  className={`size-5 transition-colors ${
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                />
                <span
                  className={`text-[10px] leading-tight transition-colors ${
                    isActive
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
