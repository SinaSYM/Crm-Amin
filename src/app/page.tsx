'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Toaster } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Headphones,
  GraduationCap,
  MessageSquare,
  BookOpen,
  ClipboardList,
  Menu,
  X,
  ChevronLeft,
  Moon,
  Sun,
  Bell,
  RefreshCw,
  Clock,
  BarChart3,
  Kanban,
  CalendarDays,
  Settings,
  ShoppingCart,
  Landmark,
  History,
  HelpCircle,
} from 'lucide-react'
import { useTheme } from 'next-themes'

import { useCRMStore, roleNavConfig, type ActiveView } from '@/lib/store'
import LoginPage from '@/components/crm/login-page'
import Dashboard from '@/components/crm/dashboard'
import LeadsPage from '@/components/crm/leads-page'
import SalesPanel from '@/components/crm/sales-panel'
import UsersPage from '@/components/crm/users-page'
import CoursesPage from '@/components/crm/courses-page'
import EnrollmentsPage from '@/components/crm/enrollments-page'
import InteractionsPage from '@/components/crm/interactions-page'
import AnalyticsPage from '@/components/crm/analytics-page'
import KanbanBoard from '@/components/crm/kanban-board'
import CalendarPage from '@/components/crm/calendar-page'
import LeadDetailPage from '@/components/crm/lead-detail-page'
import SettingsPage from '@/components/crm/settings-page'
import RoleplayPage from '@/components/crm/roleplay-page'
import GlobalSearch from '@/components/crm/global-search'
import MobileBottomNav from '@/components/crm/mobile-bottom-nav'
import TaskReminderNotifier from '@/components/crm/task-reminder-notifier'
import TeacherCoordination from '@/components/crm/teacher-coordination'
import PurchaseRequestsPage from '@/components/crm/purchase-requests'
import FinancialDashboard from '@/components/crm/financial-dashboard'
import ActivityLogsPage from '@/components/crm/activity-logs'
import HelpPage from '@/components/crm/help-page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/* ─── Nav Section Definitions ─── */
interface NavItem {
  key: ActiveView
  label: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'عمومی',
    items: [
      { key: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    ],
  },
  {
    title: 'فروش',
    items: [
      { key: 'leads', label: 'مدیریت لیدها', icon: Users },
      { key: 'kanban', label: 'خط لوله لیدها', icon: Kanban },
      { key: 'calendar', label: 'تقویم پیگیری‌ها', icon: CalendarDays },
      { key: 'sales-panel', label: 'پنل کارشناس فروش', icon: Headphones },
      { key: 'roleplay', label: 'شبیه‌ساز تماس (AI)', icon: GraduationCap },
    ],
  },
  {
    title: 'امور مالی',
    items: [
      { key: 'financial-dashboard', label: 'داشبورد مالی', icon: Landmark },
      { key: 'purchase-requests', label: 'تنخواه و درخواست خرید', icon: ShoppingCart },
    ],
  },
  {
    title: 'گزارش‌ها',
    items: [
      { key: 'analytics', label: 'گزارش‌ها و تحلیل', icon: BarChart3 },
    ],
  },
  {
    title: 'مدیریت',
    items: [
      { key: 'users', label: 'کاربران', icon: ClipboardList },
      { key: 'courses', label: 'دوره‌ها', icon: BookOpen },
      { key: 'interactions', label: 'تعاملات', icon: MessageSquare },
      { key: 'enrollments', label: 'ثبت‌نام‌ها', icon: GraduationCap },
      { key: 'teacher-coordination', label: 'هماهنگی اساتید', icon: GraduationCap },
      { key: 'activity-logs', label: 'لاگ‌های فعالیت', icon: History },
    ],
  },
  {
    title: 'تنظیمات',
    items: [
      { key: 'settings', label: 'تنظیمات', icon: Settings },
      { key: 'help', label: 'راهنما', icon: HelpCircle },
    ],
  },
]

/* ─── Section labels for breadcrumbs ─── */
const sectionMap: Record<string, { section: string; label: string }> = {
  dashboard: { section: 'عمومی', label: 'داشبورد' },
  leads: { section: 'فروش', label: 'مدیریت لیدها' },
  kanban: { section: 'فروش', label: 'خط لوله لیدها' },
  calendar: { section: 'فروش', label: 'تقویم پیگیری‌ها' },
  'sales-panel': { section: 'فروش', label: 'پنل کارشناس فروش' },
  roleplay: { section: 'فروش', label: 'شبیه‌ساز تماس (AI)' },
  users: { section: 'مدیریت', label: 'کاربران' },
  courses: { section: 'مدیریت', label: 'دوره‌ها' },
  interactions: { section: 'مدیریت', label: 'تعاملات' },
  enrollments: { section: 'مدیریت', label: 'ثبت‌نام‌ها' },
  'teacher-coordination': { section: 'مدیریت', label: 'هماهنگی اساتید' },
  'activity-logs': { section: 'مدیریت', label: 'لاگ‌های فعالیت' },
  'purchase-requests': { section: 'امور مالی', label: 'تنخواه و درخواست خرید' },
  'financial-dashboard': { section: 'امور مالی', label: 'داشبورد مالی' },
  analytics: { section: 'گزارش‌ها', label: 'گزارش‌ها و تحلیل' },
  login: { section: '', label: 'ورود' },
  help: { section: 'راهنما', label: 'راهنمای استفاده' },
  'lead-detail': { section: 'فروش', label: 'جزئیات لید' },
  settings: { section: 'تنظیمات', label: 'تنظیمات' },
}

/* ─── Follow-up type for notification bell ─── */
interface Followup {
  id: string
  content: string
  next_followup_date: string
  lead: { id: string; first_name: string; last_name: string }
  agent: { id: string; first_name: string; last_name: string }
}

/* ─── View Renderer ─── */
function ViewRenderer({ activeView, refreshKey }: { activeView: ActiveView; refreshKey: number }) {
  // refreshKey forces re-render to refresh data
  switch (activeView) {
    case 'dashboard':
      return <Dashboard key={refreshKey} />
    case 'leads':
      return <LeadsPage key={refreshKey} />
    case 'sales-panel':
      return <SalesPanel key={refreshKey} />
    case 'roleplay':
      return <RoleplayPage key={refreshKey} />
    case 'users':
      return <UsersPage key={refreshKey} />
    case 'courses':
      return <CoursesPage key={refreshKey} />
    case 'interactions':
      return <InteractionsPage key={refreshKey} />
    case 'enrollments':
      return <EnrollmentsPage key={refreshKey} />
    case 'analytics':
      return <AnalyticsPage key={refreshKey} />
    case 'kanban':
      return <KanbanBoard key={refreshKey} />
    case 'calendar':
      return <CalendarPage key={refreshKey} />
    case 'lead-detail':
      return <LeadDetailPage key={refreshKey} />
    case 'settings':
      return <SettingsPage key={refreshKey} />
    case 'teacher-coordination':
      return <TeacherCoordination key={refreshKey} />
    case 'purchase-requests':
      return <PurchaseRequestsPage key={refreshKey} />
    case 'financial-dashboard':
      return <FinancialDashboard key={refreshKey} />
    case 'activity-logs':
      return <ActivityLogsPage key={refreshKey} />
    case 'help':
      return <HelpPage key={refreshKey} />
    default:
      return <Dashboard key={refreshKey} />
  }
}

/* ─── Helper: format relative date ─── */
function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const overdueDays = Math.abs(Math.round(diffMs / (1000 * 60 * 60 * 24)))
    return overdueDays <= 1 ? 'دیروز' : `${overdueDays} روز تأخیر`
  }
  if (diffDays === 0) return 'امروز'
  if (diffDays === 1) return 'فردا'
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} روز دیگر`
  return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(date)
}

/* ─── Main Page ─── */
export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  )
}

function HomeInner() {
  const { activeView, setActiveView, sidebarOpen, setSidebarOpen, isAuthenticated, currentUser, logout } = useCRMStore()
  const { theme, setTheme } = useTheme()
  const searchParams = useSearchParams()
  const resetToken = searchParams.get('resetToken') || undefined
  const [mounted, setMounted] = useState(false)
  const [followups, setFollowups] = useState<Followup[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // Filter nav sections based on user role
  const allowedViews = currentUser ? (roleNavConfig[currentUser.role] || roleNavConfig.ADMIN) : roleNavConfig.ADMIN

  useEffect(() => {
    setMounted(true)
  }, [])

  // Verify the server-side session on mount. The store's auth state is
  // persisted in localStorage, so without this a user with an expired cookie
  // (or a deactivated account) would see the dashboard while every API call
  // returns 401 — and a valid cookie with cleared localStorage would strand
  // the user on the login page.
  useEffect(() => {
    if (!mounted) return
    let cancelled = false
    async function verifySession() {
      try {
        const res = await fetch('/api/auth/me')
        const json = await res.json().catch(() => null)
        if (cancelled) return
        if (res.ok && json?.user) {
          const store = useCRMStore.getState()
          const user = {
            id: json.user.id,
            first_name: json.user.first_name,
            last_name: json.user.last_name,
            role: json.user.role,
            phone_number: json.user.phone_number,
          }
          if (!store.isAuthenticated) {
            store.login(user)
          } else {
            store.setCurrentUser(user)
          }
        } else {
          useCRMStore.getState().logout()
        }
      } catch {
        // Offline / transient failure — leave current state untouched
      }
    }
    verifySession()
    return () => {
      cancelled = true
    }
  }, [mounted])

  // Client-side route guard validation
  useEffect(() => {
    if (isAuthenticated && activeView !== 'login' && !allowedViews.includes(activeView)) {
      setActiveView('dashboard')
    }
  }, [activeView, allowedViews, isAuthenticated, setActiveView])

  // Patch global fetch: real auth uses cookies (httpOnly) so we just forward the
  // credentials.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const originalFetch = window.fetch
    window.fetch = async function (input, init) {
      const headers = new Headers(init?.headers)
      headers.set('credentials', 'include')

      return originalFetch(input, {
        ...init,
        headers,
        credentials: 'include',
      })
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [])

  // Body scroll lock disabled to prevent iOS Safari sub-scroll locking bugs

  // Fetch upcoming followups for notification bell
  useEffect(() => {
    if (!mounted || !isAuthenticated) return
    async function fetchFollowups() {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const json = await res.json()
          setFollowups(json.upcomingFollowups ?? [])
        }
      } catch {
        // silently fail
      }
    }
    fetchFollowups()
  }, [mounted, isAuthenticated, refreshKey])

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // Logout must destroy the httpOnly session cookie server-side too,
  // otherwise the session stays valid for its full TTL after "خروج".
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Even if the network call fails, clear the client state
    }
    logout()
  }, [logout])

  if (!mounted) return null

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <div dir="rtl">
        <LoginPage initialResetToken={resetToken} />
        <Toaster position="top-center" dir="rtl" richColors />
      </div>
    )
  }

  // Poll task reminders app-wide while signed in (toasts at reminder time).
  const taskReminderNotifier = <TaskReminderNotifier />

  // Sales agents see their own working panel; higher roles review agents' status through it
  const isAgentViewingOwnPanel = currentUser?.role === 'SALES_AGENT'
  const salesPanelLabel = isAgentViewingOwnPanel ? 'پنل کارشناس فروش' : 'وضعیت کارشناسان فروش'

  // Filter nav sections based on user role
  const filteredSections = navSections
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => allowedViews.includes(item.key))
        .map((item) => (item.key === 'sales-panel' ? { ...item, label: salesPanelLabel } : item)),
    }))
    .filter((section) => section.items.length > 0)

  const currentInfo = activeView === 'sales-panel'
    ? { ...sectionMap[activeView], label: salesPanelLabel }
    : sectionMap[activeView]
  const allNavItems = filteredSections.flatMap((s) => s.items)
  const currentNav = allNavItems.find((item) => item.key === activeView)

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 right-0 z-50 h-screen w-64 glass-panel border-l border-sidebar-border transition-transform duration-200 lg:sticky lg:top-0 lg:z-30 transform-gpu ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Sidebar Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="bg-foreground p-1.5 rounded-md shrink-0">
                <GraduationCap className="size-4 text-background" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-foreground truncate">آموزش عالی آزاد امین</h1>
                <p className="text-[10px] text-muted-foreground truncate">سامانه مدیریت ارتباط با مشتری</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-7 w-7 text-muted-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Navigation with Sections */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            <nav className="space-y-5">
              {filteredSections.map((section) => (
                <div key={section.title}>
                  <p className="px-2.5 mb-1 text-[11px] font-medium text-muted-foreground/80 tracking-wide">
                    {section.title}
                  </p>
                  <div className="space-y-px">
                    {section.items.map((item) => {
                      const isActive = activeView === item.key
                      return (
                        <button
                          key={item.key}
                          aria-label={item.label}
                          data-testid={`nav-${item.key}`}
                          onClick={() => {
                            setActiveView(item.key)
                            if (window.innerWidth < 1024) setSidebarOpen(false)
                          }}
                          className={`notion-hover w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-sm transition-colors ${
                            isActive
                              ? 'bg-accent text-foreground font-semibold'
                              : 'text-muted-foreground hover:text-foreground font-medium'
                          }`}
                        >
                          <item.icon className={`size-4 shrink-0 ${isActive ? 'text-foreground' : 'text-muted-foreground/80'}`} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-sidebar-border">
            <div className="flex items-center gap-2.5 p-2 rounded-md notion-hover">
              <div className="size-8 rounded-full bg-foreground flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-background">
                  {currentUser?.first_name?.[0] || 'م'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {currentUser?.first_name} {currentUser?.last_name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {{
                    ADMIN: 'ادمین',
                    SALES_MANAGER: 'مدیر فروش',
                    SALES_AGENT: 'کارشناس فروش',
                    STUDENT: 'دانش‌پذیر',
                    EDUCATION_OFFICER: 'مسئول آموزش',
                    FINANCIAL_OFFICER: 'مسئول امور مالی',
                    MENTOR: 'منتور',
                    DEPT_MANAGER: 'مدیر دپارتمان'
                  }[currentUser?.role || 'ADMIN']}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2"
              >
                خروج
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Header — floating HYPERGLASS pill */}
        <div className="sticky top-3 z-20 px-3 sm:px-5 pt-1">
        <header className="glass-panel rounded-full">
          <div className="flex items-center justify-between h-13 px-3 sm:px-5">
            {/* Right side: Menu (mobile) + Breadcrumbs */}
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8 text-muted-foreground"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="size-4.5" />
              </Button>
              {/* Breadcrumbs — Notion-style quiet path */}
              <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm min-w-0">
                {currentInfo?.section && (
                  <>
                    <span className="text-muted-foreground hidden sm:inline">{currentInfo.section}</span>
                    <ChevronLeft className="size-3.5 text-muted-foreground/50 hidden sm:inline shrink-0" />
                  </>
                )}
                <span className="text-foreground font-semibold flex items-center gap-1.5 truncate">
                  {currentNav?.icon && <currentNav.icon className="size-4 text-muted-foreground shrink-0" />}
                  <span className="truncate">{currentInfo?.label || 'داشبورد'}</span>
                </span>
              </nav>
            </div>

            {/* Left side: Actions */}
            <div className="flex items-center gap-1.5">
              {/* Global Search */}
              <GlobalSearch />

              {/* Notification Bell */}
              <DropdownMenu dir="rtl">
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                    <Bell className="size-4 text-muted-foreground" />
                    {followups.length > 0 && (
                      <span className="absolute -top-0.5 -left-0.5 flex items-center justify-center size-4 rounded-full bg-foreground text-[9px] font-bold text-background">
                        {followups.length > 9 ? '۹+' : followups.length.toLocaleString('fa-IR')}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="flex items-center gap-2">
                    <Clock className="size-4 text-foreground" />
                    پیگیری‌های پیش‌رو
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {followups.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      پیگیری پیش‌رویی وجود ندارد
                    </div>
                  ) : (
                    followups.slice(0, 8).map((fu) => (
                      <DropdownMenuItem key={fu.id} className="flex flex-col items-start gap-1 p-3 cursor-default">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-medium">
                            {fu.lead.first_name} {fu.lead.last_name}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {formatRelativeDate(fu.next_followup_date)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate w-full">
                          {fu.content}
                        </p>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                className="h-9 w-9"
                title="بازنشانی"
              >
                <RefreshCw className="size-4 text-muted-foreground" />
              </Button>

              {/* Dark Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="h-9 w-9"
                title={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
              >
                {theme === 'dark' ? (
                  <Sun className="size-4 text-foreground" />
                ) : (
                  <Moon className="size-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </header>
        </div>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <motion.div
              key={activeView + refreshKey}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <ViewRenderer activeView={activeView} refreshKey={refreshKey} />
            </motion.div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-3 px-4 sm:px-6 mt-auto pb-20 lg:pb-3">
          <p className="text-center lg:text-start text-[11px] text-muted-foreground">
            سامانه مدیریت ارتباط با مشتری · آموزش عالی آزاد امین © {new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date())}
          </p>
        </footer>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
        {taskReminderNotifier}
      </div>

      <Toaster position="top-center" dir="rtl" richColors />
    </div>
  )
}
