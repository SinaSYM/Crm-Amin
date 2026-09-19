'use client'

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useCRMStore } from '@/lib/store'
import EmptyState from '@/components/crm/empty-state'
import PaginationFooter from '@/components/crm/pagination-footer'
import {
  UserPlus,
  Pencil,
  Power,
  PowerOff,
  Users,
  Search,
  Shield,
  BarChart3,
  HeadphonesIcon,
  GraduationCap,
  CalendarDays,
  Download,
  AlertTriangle,
  BookOpen,
  Landmark,
  BookMarked,
  Building2,
  StickyNote,
  KeyRound,
  Copy,
} from 'lucide-react'

interface User {
  id: string
  first_name: string
  last_name: string
  phone_number: string
  role: 'ADMIN' | 'SALES_MANAGER' | 'SALES_AGENT' | 'STUDENT' | 'EDUCATION_OFFICER' | 'FINANCIAL_OFFICER' | 'MENTOR' | 'DEPT_MANAGER' | 'PENDING'
  is_active: boolean
  department?: string | null
  admin_notes?: string
  createdAt: string
  updatedAt: string
  _count?: {
    assignedLeads: number
    interactions: number
    enrollments: number
  }
}

const roleLabels: Record<string, string> = {
  ADMIN: 'ادمین',
  SALES_MANAGER: 'مدیر فروش',
  SALES_AGENT: 'کارشناس فروش',
  STUDENT: 'دانش‌پذیر',
  EDUCATION_OFFICER: 'مسئول آموزش',
  FINANCIAL_OFFICER: 'امور مالی',
  MENTOR: 'منتور',
  DEPT_MANAGER: 'مدیر دپارتمان',
  PENDING: 'در انتظار تایید',
}

const departmentLabels: Record<string, string> = {
  MANAGEMENT: 'مدیریت',
  REAL_ESTATE: 'مشاور املاک',
  FINANCE: 'مالی',
  LAW: 'حقوق',
  PROJECT_MANAGEMENT: 'مدیریت پروژه',
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700 border-red-200',
  SALES_MANAGER: 'bg-muted/60 text-foreground border-border',
  SALES_AGENT: 'bg-muted/60 text-foreground border-border',
  STUDENT: 'bg-muted/60 text-foreground border-border',
  EDUCATION_OFFICER: 'bg-muted/60 text-foreground border-border',
  FINANCIAL_OFFICER: 'bg-muted/60 text-foreground border-border',
  MENTOR: 'bg-amber-100 text-amber-700 border-amber-200',
  DEPT_MANAGER: 'bg-muted/60 text-foreground border-border',
  PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

const roleIcons: Record<string, React.ElementType> = {
  ADMIN: Shield,
  SALES_MANAGER: BarChart3,
  SALES_AGENT: HeadphonesIcon,
  STUDENT: GraduationCap,
  EDUCATION_OFFICER: BookOpen,
  FINANCIAL_OFFICER: Landmark,
  MENTOR: BookMarked,
  DEPT_MANAGER: Building2,
}

const roleAvatarColors: Record<string, string> = {
  ADMIN: 'bg-red-500 text-white',
  SALES_MANAGER: 'bg-muted/60 text-foreground',
  SALES_AGENT: 'bg-muted/60 text-foreground',
  STUDENT: 'bg-muted/60 text-foreground',
  EDUCATION_OFFICER: 'bg-muted/60 text-foreground',
  FINANCIAL_OFFICER: 'bg-muted/60 text-foreground',
  MENTOR: 'bg-amber-500 text-white',
  DEPT_MANAGER: 'bg-muted/60 text-foreground',
}

// Role-specific border colors for rows
const roleBorderColors: Record<string, string> = {
  ADMIN: 'border-r-4 border-r-red-500',
  SALES_MANAGER: 'border-r-4 border-r-amber-500',
  SALES_AGENT: 'border-r-4 border-r-neutral-500',
  STUDENT: 'border-r-4 border-r-gray-400',
  EDUCATION_OFFICER: 'border-r-4 border-r-neutral-600',
  FINANCIAL_OFFICER: 'border-r-4 border-r-neutral-400',
  MENTOR: 'border-r-4 border-r-amber-400',
  DEPT_MANAGER: 'border-r-4 border-r-neutral-700',
}

// Last activity relative time helper
function getRelativeTime(dateStr: string): string {
  try {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMinutes < 1) return 'همین الان'
    if (diffMinutes < 60) return `${diffMinutes} دقیقه پیش`
    if (diffHours < 24) return `${diffHours} ساعت پیش`
    if (diffDays < 30) return `${diffDays} روز پیش`
    return new Intl.DateTimeFormat('fa-IR', { month: 'short', day: 'numeric' }).format(date)
  } catch {
    return dateStr
  }
}

const USERS_PER_PAGE = 10

export default function UsersPage() {
  const { currentUser } = useCRMStore()

  const [users, setUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [adminNotesDialog, setAdminNotesDialog] = useState<User | null>(null)
  const [adminNotesValue, setAdminNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const canEditAdminNotes = currentUser?.role === 'ADMIN' || currentUser?.role === 'DEPT_MANAGER'

  const [resetLinkDialog, setResetLinkDialog] = useState<{ user: User; url: string } | null>(null)
  const [generatingResetLink, setGeneratingResetLink] = useState<string | null>(null)



  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Form state
  const [formFirstName, setFormFirstName] = useState('')
  const [formLastName, setFormLastName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formRole, setFormRole] = useState<string>('SALES_AGENT')
  const [formDepartment, setFormDepartment] = useState<string>('')
  const [formIsActive, setFormIsActive] = useState(true)

  const fetchUsers = useCallback(async () => {
    if (!currentUser || currentUser.role === 'SALES_AGENT' || currentUser.role === 'STUDENT') {
      return
    }
    setLoading(true)
    try {
      if (activeTab === 'pending') {
        const res = await fetch('/api/auth/signup-approve')
        if (!res.ok) throw new Error()
        const data = await res.json()
        setUsers((data.items || []).map((item: any) => ({
          id: item.id,
          first_name: item.first_name,
          last_name: item.last_name,
          phone_number: item.phone_number,
          role: 'PENDING',
          is_active: false,
          department: item.desired_department,
          createdAt: item.createdAt,
          updatedAt: item.createdAt,
        })))
      } else {
        const params = new URLSearchParams()
        if (activeTab !== 'all') {
          params.set('role', activeTab)
        }
        const res = await fetch(`/api/users?${params.toString()}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setUsers(data)
      }
    } catch {
      toast.error('خطا در بارگذاری کاربران')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  const fetchPendingCount = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/signup-approve')
      if (res.ok) {
        const data = await res.json()
        setPendingCount(data.items?.length || 0)
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  // Independent from `users` (which only holds the active tab's rows) so tab badge
  // counts stay stable no matter which tab is currently selected.
  const fetchAllUsersForCounts = useCallback(async () => {
    if (!currentUser || currentUser.role === 'SALES_AGENT' || currentUser.role === 'STUDENT') {
      return
    }
    try {
      const res = await fetch('/api/users')
      if (res.ok) setAllUsers(await res.json())
    } catch (err) {
      console.error(err)
    }
  }, [currentUser])

  useEffect(() => {
    fetchUsers()
    fetchAllUsersForCounts()
    if (currentUser?.role === 'ADMIN') {
      fetchPendingCount()
    }
  }, [fetchUsers, fetchAllUsersForCounts, fetchPendingCount, currentUser])

  const handleApproveReject = async (signupId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/auth/signup-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signup_id: signupId, action }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'خطا در بررسی درخواست')
      }
      toast.success(action === 'APPROVE' ? 'درخواست عضویت تایید شد' : 'درخواست عضویت رد شد')
      fetchUsers()
      fetchPendingCount()
      fetchAllUsersForCounts()
    } catch (err: any) {
      toast.error(err.message || 'خطا در بررسی درخواست')
    }
  }

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users
    const q = searchQuery.trim().toLowerCase()
    return users.filter(
      (u) =>
        u.first_name.toLowerCase().includes(q) ||
        u.last_name.toLowerCase().includes(q) ||
        u.phone_number.includes(q)
    )
  }, [users, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery])

  const paginatedUsers = useMemo(
    () => filteredUsers.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE),
    [filteredUsers, currentPage]
  )

  const openCreateDialog = () => {
    setEditingUser(null)
    setFormFirstName('')
    setFormLastName('')
    setFormPhone('')
    setFormRole('SALES_AGENT')
    setFormDepartment('')
    setFormIsActive(true)
    setDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormFirstName(user.first_name)
    setFormLastName(user.last_name)
    setFormPhone(user.phone_number)
    setFormRole(user.role)
    setFormDepartment(user.department || '')
    setFormIsActive(user.is_active)
    setDialogOpen(true)
  }

  const openAdminNotesDialog = (user: User) => {
    setAdminNotesDialog(user)
    setAdminNotesValue(user.admin_notes || '')
  }

  const generateResetLink = async (user: User) => {
    setGeneratingResetLink(user.id)
    try {
      const res = await fetch('/api/auth/password-reset/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const json = await res.json()
      if (res.ok) {
        setResetLinkDialog({ user, url: json.resetUrl })
      } else {
        toast.error(json.error || 'خطا در ساخت لینک بازیابی')
      }
    } catch {
      toast.error('ارتباط با سرور برقرار نشد')
    } finally {
      setGeneratingResetLink(null)
    }
  }

  const saveAdminNotes = async () => {
    if (!adminNotesDialog) return
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/users/${adminNotesDialog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotesValue }),
      })
      if (!res.ok) throw new Error()
      toast.success('یادداشت ذخیره شد')
      setAdminNotesDialog(null)
      fetchUsers()
    } catch {
      toast.error('خطا در ذخیره یادداشت')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSave = async () => {
    if (!formFirstName.trim() || !formLastName.trim() || !formPhone.trim()) {
      toast.error('لطفاً تمام فیلدهای ضروری را پر کنید')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        first_name: formFirstName.trim(),
        last_name: formLastName.trim(),
        phone_number: formPhone.trim(),
        role: formRole,
        is_active: formIsActive,
      }
      if (formDepartment) payload.department = formDepartment

      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'خطا در ویرایش')
        }
        toast.success('کاربر با موفقیت ویرایش شد')
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'خطا در ایجاد')
        }
        toast.success('کاربر جدید با موفقیت ایجاد شد')
      }

      setDialogOpen(false)
      fetchUsers()
      fetchAllUsersForCounts()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطا در ذخیره‌سازی'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      })
      if (!res.ok) throw new Error()
      toast.success(user.is_active ? 'کاربر غیرفعال شد' : 'کاربر فعال شد')
      fetchUsers()
      fetchAllUsersForCounts()
    } catch {
      toast.error('خطا در تغییر وضعیت')
    }
  }

  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  const handleToggleActiveClick = (user: User) => {
    if (user.is_active) {
      setDeactivateTarget(user)
    } else {
      toggleActive(user)
    }
  }

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return
    setDeactivating(true)
    try {
      await toggleActive(deactivateTarget)
      setDeactivateTarget(null)
    } finally {
      setDeactivating(false)
    }
  }

  const formatPersianDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
  }

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/users/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('فایل CSV با موفقیت دانلود شد')
    } catch {
      toast.error('خطا در خروجی CSV')
    }
  }

  if (currentUser?.role === 'SALES_AGENT' || currentUser?.role === 'STUDENT') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-card border rounded-xl shadow-sm">
        <AlertTriangle className="size-12 text-amber-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold mb-2">دسترسی غیرمجاز</h3>
        <p className="text-sm text-muted-foreground">شما سطح دسترسی کافی برای مشاهده این صفحه را ندارید.</p>
      </div>
    )
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 text-white shadow-md shadow-neutral-400/30 dark:shadow-neutral-400/30">
            <Users className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">مدیریت کاربران</h1>
            <p className="text-sm text-muted-foreground mt-0.5">مشاهده و مدیریت کاربران سیستم</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="gap-2"
          >
            <Download className="size-4" />
            خروجی CSV
          </Button>
          <Button onClick={openCreateDialog} className="gap-2 bg-foreground text-background hover:bg-foreground/85 shadow-sm">
            <UserPlus className="size-4" />
            افزودن کاربر جدید
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted/40 p-1 gap-1">
          <TabsTrigger value="all" className="gap-1.5 data-[state=active]:bg-muted/60 data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            همه
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1 data-[state=active]:bg-white/20 data-[state=active]:text-white">
              {allUsers.length}
            </Badge>
          </TabsTrigger>
          {currentUser?.role === 'ADMIN' && (
            <Fragment>
              <TabsTrigger value="ADMIN" className="gap-1.5 data-[state=active]:bg-muted/60 data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <Shield className="size-3" />
                مدیران
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                  {allUsers.filter((u) => u.role === 'ADMIN').length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="SALES_MANAGER" className="gap-1.5 data-[state=active]:bg-muted/60 data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                <BarChart3 className="size-3" />
                مدیران فروش
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                  {allUsers.filter((u) => u.role === 'SALES_MANAGER').length}
                </Badge>
              </TabsTrigger>
            </Fragment>
          )}
          <TabsTrigger value="SALES_AGENT" className="gap-1.5 data-[state=active]:bg-muted/60 data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <HeadphonesIcon className="size-3" />
            کارشناسان
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
              {allUsers.filter((u) => u.role === 'SALES_AGENT').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="STUDENT" className="gap-1.5 data-[state=active]:bg-muted/60 data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <GraduationCap className="size-3" />
            دانش‌پذیران
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
              {allUsers.filter((u) => u.role === 'STUDENT').length}
            </Badge>
          </TabsTrigger>
          {currentUser?.role === 'ADMIN' && (
            <TabsTrigger value="pending" className="gap-1.5 data-[state=active]:bg-muted/60 data-[state=active]:text-foreground data-[state=active]:shadow-sm">
              <Power className="size-3" />
              درخواست‌های تایید نشده
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                {pendingCount}
              </Badge>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="جستجو بر اساس نام یا شماره تماس..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 w-full max-w-sm"
            />
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="کاربری یافت نشد"
              description={searchQuery ? 'نتیجه‌ای برای جستجوی شما پیدا نشد' : 'هنوز کاربری به سیستم اضافه نشده است'}
            />
          ) : (
            <div className="rounded-xl border bg-card overflow-x-auto shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-right">ردیف</TableHead>
                    <TableHead className="text-right">کاربر</TableHead>
                    <TableHead className="text-right">شماره تماس</TableHead>
                    <TableHead className="text-right">نقش</TableHead>
                    <TableHead className="text-right">دپارتمان</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    <TableHead className="text-right">تاریخ عضویت</TableHead>
                    <TableHead className="text-right">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {paginatedUsers.map((user, index) => {
                      const RoleIcon = roleIcons[user.role] || Users
                      return (
                        <motion.tr
                          key={user.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2, delay: index * 0.03 }}
                          className={`premium-row-hover border-b last:border-b-0 ${roleBorderColors[user.role] || ''}`}
                        >
                          <TableCell className="text-muted-foreground">
                            {((currentPage - 1) * USERS_PER_PAGE + index + 1).toLocaleString('fa-IR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="size-9 border-2 border-background shadow-sm">
                                  <AvatarFallback
                                    className={roleAvatarColors[user.role] || 'bg-muted/60 text-foreground'}
                                  >
                                    <span className="text-xs font-bold">
                                      {getInitials(user.first_name, user.last_name)}
                                    </span>
                                  </AvatarFallback>
                                </Avatar>
                                {/* Activity indicator dot */}
                                <span className={`absolute -bottom-0.5 -left-0.5 size-3 rounded-full border-2 border-background ${
                                  user.is_active
                                    ? 'bg-muted/60 shadow-sm shadow-neutral-400/30 dark:shadow-neutral-400/30'
                                    : 'bg-gray-400'
                                }`} />
                              </div>
                              <div>
                                <p className="font-medium text-foreground leading-tight">
                                  {user.first_name} {user.last_name}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  آخرین فعالیت: {getRelativeTime(user.updatedAt)}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell dir="ltr" className="text-right font-mono text-sm">
                            {user.phone_number}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`gap-1.5 ${roleColors[user.role] || ''}`}
                            >
                              <RoleIcon className="size-3" />
                              {roleLabels[user.role] || user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.department ? (
                              <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                                {departmentLabels[user.department] || user.department}
                              </span>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`size-2.5 rounded-full shadow-sm ${
                                  user.is_active ? 'bg-muted/60 shadow-neutral-400/30' : 'bg-red-400 shadow-red-200'
                                }`}
                              />
                              <span className="text-sm font-medium">
                                {user.is_active ? 'فعال' : 'غیرفعال'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <CalendarDays className="size-3.5" />
                              {formatPersianDate(user.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.role === 'PENDING' ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApproveReject(user.id, 'APPROVE')}
                                  className="gap-1 text-foreground hover:text-foreground hover:bg-muted/50 font-medium"
                                >
                                  تایید عضویت
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApproveReject(user.id, 'REJECT')}
                                  className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 font-medium"
                                >
                                  رد عضویت
                                </Button>
                              </div>
                            ) : (() => {
                              const isActionRestricted = currentUser?.role === 'SALES_MANAGER' && 
                                (user.role === 'ADMIN' || (user.role === 'SALES_MANAGER' && user.id !== currentUser.id))
                              
                              if (isActionRestricted) return <span className="text-xs text-muted-foreground">بدون دسترسی ویرایش</span>

                              return (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditDialog(user)}
                                    className="gap-1 text-foreground hover:text-foreground hover:bg-muted/50"
                                  >
                                    <Pencil className="size-3.5" />
                                    ویرایش
                                  </Button>
                                  {canEditAdminNotes && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openAdminNotesDialog(user)}
                                      className="gap-1 text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                                    >
                                      <StickyNote className="size-3.5" />
                                      یادداشت
                                    </Button>
                                  )}
                                  {currentUser?.role === 'ADMIN' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => generateResetLink(user)}
                                      disabled={generatingResetLink === user.id}
                                      className="gap-1 text-foreground hover:text-foreground hover:bg-muted/50"
                                    >
                                      <KeyRound className="size-3.5" />
                                      {generatingResetLink === user.id ? 'در حال ساخت...' : 'لینک بازیابی رمز'}
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleActiveClick(user)}
                                    className={`gap-1 ${
                                      user.is_active
                                        ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                        : 'text-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                                  >
                                    {user.is_active ? (
                                      <>
                                        <PowerOff className="size-3.5" />
                                        تغییر وضعیت
                                      </>
                                    ) : (
                                      <>
                                        <Power className="size-3.5" />
                                        تغییر وضعیت
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )
                            })()}
                          </TableCell>
                        </motion.tr>
                      )
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && filteredUsers.length > 0 && (
            <PaginationFooter
              currentPage={currentPage}
              totalItems={filteredUsers.length}
              itemsPerPage={USERS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl">
              {editingUser ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'اطلاعات کاربر را ویرایش کنید'
                : 'اطلاعات کاربر جدید را وارد کنید'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label htmlFor="first_name" className="text-sm font-medium">نام</Label>
              <Input
                id="first_name"
                value={formFirstName}
                onChange={(e) => setFormFirstName(e.target.value)}
                placeholder="نام"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className="text-sm font-medium">نام خانوادگی</Label>
              <Input
                id="last_name"
                value={formLastName}
                onChange={(e) => setFormLastName(e.target.value)}
                placeholder="نام خانوادگی"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_number" className="text-sm font-medium">شماره تماس</Label>
              <Input
                id="phone_number"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">نقش</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب نقش" />
                </SelectTrigger>
                <SelectContent>
                  {currentUser?.role === 'ADMIN' && (
                    <Fragment>
                      <SelectItem value="ADMIN">ادمین</SelectItem>
                      <SelectItem value="SALES_MANAGER">مدیر فروش</SelectItem>
                      <SelectItem value="EDUCATION_OFFICER">مسئول آموزش</SelectItem>
                      <SelectItem value="FINANCIAL_OFFICER">امور مالی</SelectItem>
                      <SelectItem value="MENTOR">منتور</SelectItem>
                      <SelectItem value="DEPT_MANAGER">مدیر دپارتمان</SelectItem>
                    </Fragment>
                  )}
                  <SelectItem value="SALES_AGENT">کارشناس فروش</SelectItem>
                  <SelectItem value="STUDENT">دانش‌پذیر</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">دپارتمان (اختیاری)</Label>
              <Select value={formDepartment || 'none'} onValueChange={(v) => setFormDepartment(v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب دپارتمان" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون دپارتمان</SelectItem>
                  <SelectItem value="MANAGEMENT">مدیریت</SelectItem>
                  <SelectItem value="REAL_ESTATE">مشاور املاک</SelectItem>
                  <SelectItem value="FINANCE">مالی</SelectItem>
                  <SelectItem value="LAW">حقوق</SelectItem>
                  <SelectItem value="PROJECT_MANAGEMENT">مدیریت پروژه</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
              <Label htmlFor="is_active" className="cursor-pointer font-medium">
                وضعیت کاربر
              </Label>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${formIsActive ? 'text-foreground' : 'text-red-500'}`}>
                  {formIsActive ? 'فعال' : 'غیرفعال'}
                </span>
                <Switch
                  id="is_active"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              انصراف
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-foreground text-background hover:bg-foreground/85 min-w-[100px]"
            >
              {saving ? 'در حال ذخیره...' : editingUser ? 'ویرایش' : 'ایجاد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Notes Dialog */}
      <Dialog open={!!adminNotesDialog} onOpenChange={(open) => { if (!open) setAdminNotesDialog(null) }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <StickyNote className="size-5 text-amber-600" />
              یادداشت مدیریتی
            </DialogTitle>
            <DialogDescription>
              یادداشت مربوط به {adminNotesDialog?.first_name} {adminNotesDialog?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <textarea
              value={adminNotesValue}
              onChange={(e) => setAdminNotesValue(e.target.value)}
              rows={6}
              placeholder="یادداشت خود را اینجا بنویسید..."
              className="w-full rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAdminNotesDialog(null)} disabled={savingNotes}>انصراف</Button>
            <Button onClick={saveAdminNotes} disabled={savingNotes} className="bg-amber-600 hover:bg-amber-700 min-w-[100px]">
              {savingNotes ? 'در حال ذخیره...' : 'ذخیره یادداشت'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Link Dialog */}
      <Dialog open={!!resetLinkDialog} onOpenChange={(open) => { if (!open) setResetLinkDialog(null) }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <KeyRound className="size-5 text-foreground" />
              لینک بازیابی رمز عبور
            </DialogTitle>
            <DialogDescription>
              این لینک فقط تا ۱ ساعت معتبر است و فقط یک‌بار قابل استفاده است. آن را از طریق تماس یا پیامک شخصی برای{' '}
              {resetLinkDialog?.user.first_name} {resetLinkDialog?.user.last_name} ارسال کنید — سیستم پیامی خودکار ارسال نمی‌کند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="flex items-center gap-2">
              <Input readOnly value={resetLinkDialog?.url || ''} className="text-xs" dir="ltr" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (resetLinkDialog) {
                    navigator.clipboard.writeText(resetLinkDialog.url)
                    toast.success('لینک کپی شد')
                  }
                }}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetLinkDialog(null)}>بستن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Confirmation Dialog */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={(open) => { if (!open) setDeactivateTarget(null) }}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <PowerOff className="size-5" />
              تأیید غیرفعال‌سازی کاربر
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  آیا از غیرفعال کردن{' '}
                  <strong className="text-red-600">
                    {deactivateTarget?.first_name} {deactivateTarget?.last_name}
                  </strong>{' '}
                  اطمینان دارید؟
                </p>
                <p className="text-sm text-muted-foreground">
                  این کاربر پس از غیرفعال شدن نمی‌تواند وارد سیستم شود، اما هر زمان می‌توانید دوباره فعالش کنید.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={deactivating}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeactivate}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deactivating}
            >
              {deactivating ? 'در حال پردازش...' : 'غیرفعال کن'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
