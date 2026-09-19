import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ActiveView = 'dashboard' | 'leads' | 'users' | 'courses' | 'interactions' | 'enrollments' | 'sales-panel' | 'analytics' | 'kanban' | 'calendar' | 'login' | 'lead-detail' | 'settings' | 'roleplay' | 'teacher-coordination' | 'purchase-requests' | 'financial-dashboard' | 'activity-logs' | 'help'

export interface CurrentUser {
  id: string
  first_name: string
  last_name: string
  role: string
  phone_number?: string
}

interface CRMStore {
  activeView: ActiveView
  setActiveView: (view: ActiveView) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  currentUser: CurrentUser | null
  setCurrentUser: (user: CurrentUser | null) => void
  isAuthenticated: boolean
  login: (user: CurrentUser) => void
  logout: () => void
  selectedLeadId: string | null
  setSelectedLeadId: (id: string | null) => void
  // One-shot signal: dashboard "افزودن لید" asks LeadsPage to open its create dialog
  pendingLeadCreate: boolean
  setPendingLeadCreate: (open: boolean) => void
}

export const useCRMStore = create<CRMStore>()(
  persist(
    (set) => ({
      activeView: 'dashboard',
      setActiveView: (view) => set({ activeView: view }),
      sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      isAuthenticated: false,
      login: (user) => set({ currentUser: user, isAuthenticated: true, activeView: 'dashboard' }),
      logout: () => set({ currentUser: null, isAuthenticated: false, activeView: 'dashboard' }),
      selectedLeadId: null,
      setSelectedLeadId: (id) => set({ selectedLeadId: id }),
      pendingLeadCreate: false,
      setPendingLeadCreate: (open) => set({ pendingLeadCreate: open }),
    }),
    {
      name: 'crm-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
        selectedLeadId: state.selectedLeadId,
      }),
    }
  )
)

// Role-based navigation filtering — 'help' is available to every role.
export const roleNavConfig: Record<string, ActiveView[]> = {
  STUDENT: ['dashboard', 'courses', 'enrollments', 'settings', 'help'],
  SALES_AGENT: ['dashboard', 'sales-panel', 'roleplay', 'leads', 'kanban', 'calendar', 'interactions', 'lead-detail', 'settings', 'purchase-requests', 'help'],
  SALES_MANAGER: ['dashboard', 'leads', 'kanban', 'calendar', 'sales-panel', 'roleplay', 'users', 'courses', 'interactions', 'enrollments', 'analytics', 'lead-detail', 'settings', 'purchase-requests', 'help'],
  ADMIN: ['dashboard', 'leads', 'kanban', 'calendar', 'sales-panel', 'roleplay', 'users', 'courses', 'interactions', 'enrollments', 'analytics', 'teacher-coordination', 'purchase-requests', 'financial-dashboard', 'activity-logs', 'lead-detail', 'settings', 'help'],
  EDUCATION_OFFICER: ['dashboard', 'courses', 'calendar', 'teacher-coordination', 'purchase-requests', 'settings', 'help'],
  FINANCIAL_OFFICER: ['dashboard', 'enrollments', 'financial-dashboard', 'purchase-requests', 'settings', 'help'],
  MENTOR: ['dashboard', 'leads', 'kanban', 'calendar', 'interactions', 'lead-detail', 'settings', 'help'],
  DEPT_MANAGER: ['dashboard', 'leads', 'kanban', 'calendar', 'sales-panel', 'users', 'courses', 'interactions', 'enrollments', 'analytics', 'lead-detail', 'settings', 'help'],
}
