'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useCRMStore } from '@/lib/store'
import { sanitizePersianDateInput } from '@/lib/persian-date'
import EmptyState from '@/components/crm/empty-state'
import PaginationFooter from '@/components/crm/pagination-footer'
import {
  GraduationCap,
  PlusCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  BookOpen,
  CalendarDays,
  Search,
  Download,
  Users,
  CreditCard,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Wallet,
  ArrowLeft,
  X,
  Plus,
  RefreshCw,
} from 'lucide-react'

interface Enrollment {
  id: string
  student_id: string
  course_id: string
  payment_status: 'PAID' | 'INSTALLMENT'
  enrollment_date: string
  createdAt: string
  updatedAt: string
  student: {
    id: string
    first_name: string
    last_name: string
    phone_number: string
  }
  course: {
    id: string
    title: string
    price: number
  }
}

interface Payment {
  id: string
  enrollment_id: string
  amount: number
  payment_type: 'FULL' | 'INSTALLMENT'
  status: 'PENDING' | 'PAID' | 'OVERDUE'
  due_date: string
  paid_date: string | null
  description: string
  createdAt: string
  updatedAt: string
}

interface PaymentSummary {
  total: number
  paid: number
  pending: number
  overdue: number
  count: number
  paidCount: number
  pendingCount: number
  overdueCount: number
}

interface StudentOption {
  id: string
  first_name: string
  last_name: string
}

interface CourseOption {
  id: string
  title: string
  price: number
}

const paymentLabels: Record<string, string> = {
  PAID: 'پرداخت شده',
  INSTALLMENT: 'اقساطی',
}

const paymentColors: Record<string, string> = {
  PAID: 'bg-muted/60 text-foreground border-border',
  INSTALLMENT: 'bg-amber-100 text-amber-700 border-amber-200',
}

const paymentBgColors: Record<string, string> = {
  PAID: 'bg-muted/60 text-foreground border-border',
  INSTALLMENT: 'bg-amber-50 text-amber-700 border-amber-200',
}

const paymentItemStatusLabels: Record<string, string> = {
  PENDING: 'در انتظار',
  PAID: 'پرداخت شده',
  OVERDUE: 'سررسید شده',
}

const paymentItemStatusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  PAID: 'bg-muted/60 text-foreground border-border',
  OVERDUE: 'bg-red-100 text-red-700 border-red-200',
}

const paymentItemStatusDot: Record<string, string> = {
  PENDING: 'bg-amber-500',
  PAID: 'bg-muted/60',
  OVERDUE: 'bg-red-500',
}

type PaymentFilter = 'ALL' | 'PAID' | 'INSTALLMENT'

const ENROLLMENTS_PER_PAGE = 10

const filterLabels: Record<PaymentFilter, string> = {
  ALL: 'همه',
  PAID: 'پرداخت شده',
  INSTALLMENT: 'اقساطی',
}

export default function EnrollmentsPage() {
  const { currentUser } = useCRMStore()
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [students, setStudents] = useState<StudentOption[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // Payment management dialog
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentEnrollment, setPaymentEnrollment] = useState<Enrollment | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null)
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  // Installment dialog
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false)
  const [installmentCount, setInstallmentCount] = useState<3 | 6>(3)
  const [creatingInstallments, setCreatingInstallments] = useState(false)

  // Add single payment form
  const [addPaymentFormOpen, setAddPaymentFormOpen] = useState(false)
  const [formPayAmount, setFormPayAmount] = useState('')
  const [formPayDueDate, setFormPayDueDate] = useState('')
  const [formPayDescription, setFormPayDescription] = useState('')
  const [formPayType, setFormPayType] = useState<string>('FULL')
  const [addingPayment, setAddingPayment] = useState(false)

  // Form state
  const [formStudentId, setFormStudentId] = useState('')
  const [formCourseId, setFormCourseId] = useState('')
  const [formPaymentStatus, setFormPaymentStatus] = useState<string>('PAID')

  const fetchEnrollments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/enrollments')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEnrollments(data)
    } catch {
      toast.error('خطا در بارگذاری ثبت‌نام‌ها')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOptions = useCallback(async () => {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        fetch('/api/users?role=STUDENT'),
        fetch('/api/courses'),
      ])
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json()
        setStudents(
          studentsData.map((s: { id: string; first_name: string; last_name: string }) => ({
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
          }))
        )
      }
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json()
        setCourses(
          coursesData.map((c: { id: string; title: string; price: number }) => ({
            id: c.id,
            title: c.title,
            price: c.price,
          }))
        )
      }
    } catch {
      // silently fail - options will be empty
    }
  }, [])

  useEffect(() => {
    fetchEnrollments()
    fetchOptions()
  }, [fetchEnrollments, fetchOptions])

  // Fetch payments for an enrollment
  const fetchPayments = useCallback(async (enrollmentId: string) => {
    setPaymentsLoading(true)
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/payments`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPayments(data.payments || [])
      setPaymentSummary(data.summary || null)
    } catch {
      toast.error('خطا در بارگذاری پرداخت‌ها')
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  // Open payment management dialog
  const openPaymentDialog = (enrollment: Enrollment) => {
    setPaymentEnrollment(enrollment)
    setPaymentDialogOpen(true)
    setInstallmentDialogOpen(false)
    setAddPaymentFormOpen(false)
    fetchPayments(enrollment.id)
  }

  // Mark payment as paid
  const handleMarkAsPaid = async (paymentId: string) => {
    setMarkingPaid(paymentId)
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      })
      if (!res.ok) throw new Error()
      toast.success('پرداخت با موفقیت تأیید شد')
      if (paymentEnrollment) {
        fetchPayments(paymentEnrollment.id)
        fetchEnrollments()
      }
    } catch {
      toast.error('خطا در تأیید پرداخت')
    } finally {
      setMarkingPaid(null)
    }
  }

  // Create installments
  const handleCreateInstallments = async () => {
    if (!paymentEnrollment) return
    setCreatingInstallments(true)
    try {
      const res = await fetch(`/api/enrollments/${paymentEnrollment.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installments: installmentCount }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'خطا در ایجاد اقساط')
      }
      toast.success(`${installmentCount.toLocaleString('fa-IR')} قسط با موفقیت ایجاد شد`)
      setInstallmentDialogOpen(false)
      fetchPayments(paymentEnrollment.id)
      fetchEnrollments()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطا در ایجاد اقساط'
      toast.error(message)
    } finally {
      setCreatingInstallments(false)
    }
  }

  // Add single payment
  const handleAddPayment = async () => {
    if (!paymentEnrollment || !formPayAmount || !formPayDueDate) {
      toast.error('لطفاً مبلغ و تاریخ سررسید را وارد کنید')
      return
    }
    setAddingPayment(true)
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollment_id: paymentEnrollment.id,
          amount: parseFloat(formPayAmount),
          due_date: formPayDueDate,
          description: formPayDescription || `پرداخت ${formPayType === 'FULL' ? 'کامل' : 'قسط'} - ${paymentEnrollment.course.title}`,
          payment_type: formPayType,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'خطا در ایجاد پرداخت')
      }
      toast.success('پرداخت جدید با موفقیت ایجاد شد')
      setAddPaymentFormOpen(false)
      setFormPayAmount('')
      setFormPayDueDate('')
      setFormPayDescription('')
      setFormPayType('FULL')
      fetchPayments(paymentEnrollment.id)
      fetchEnrollments()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطا در ایجاد پرداخت'
      toast.error(message)
    } finally {
      setAddingPayment(false)
    }
  }

  // Calculate summary statistics
  const stats = useMemo(() => {
    const total = enrollments.length
    const paid = enrollments.filter((e) => e.payment_status === 'PAID').length
    const installment = enrollments.filter((e) => e.payment_status === 'INSTALLMENT').length
    const revenue = enrollments.reduce((sum, e) => {
      if (e.payment_status === 'PAID') return sum + (e.course.price || 0)
      if (e.payment_status === 'INSTALLMENT') return sum + Math.floor((e.course.price || 0) / 2)
      return sum
    }, 0)
    return { total, paid, installment, revenue }
  }, [enrollments])

  const filteredEnrollments = useMemo(() => {
    let result = enrollments
    if (paymentFilter !== 'ALL') {
      result = result.filter((e) => e.payment_status === paymentFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (e) =>
          e.student.first_name.toLowerCase().includes(q) ||
          e.student.last_name.toLowerCase().includes(q) ||
          e.course.title.toLowerCase().includes(q)
      )
    }
    return result
  }, [enrollments, searchQuery, paymentFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, paymentFilter])

  const paginatedEnrollments = useMemo(
    () => filteredEnrollments.slice((currentPage - 1) * ENROLLMENTS_PER_PAGE, currentPage * ENROLLMENTS_PER_PAGE),
    [filteredEnrollments, currentPage]
  )

  const tableRevenue = useMemo(() => {
    return filteredEnrollments.reduce((sum, e) => {
      if (e.payment_status === 'PAID') return sum + (e.course.price || 0)
      if (e.payment_status === 'INSTALLMENT') return sum + Math.floor((e.course.price || 0) / 2)
      return sum
    }, 0)
  }, [filteredEnrollments])

  const openCreateDialog = () => {
    setEditingEnrollment(null)
    setFormStudentId('')
    setFormCourseId('')
    setFormPaymentStatus('PAID')
    setDialogOpen(true)
  }

  const openEditDialog = (enrollment: Enrollment) => {
    setEditingEnrollment(enrollment)
    setFormStudentId(enrollment.student_id)
    setFormCourseId(enrollment.course_id)
    setFormPaymentStatus(enrollment.payment_status)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formStudentId || !formCourseId) {
      toast.error('لطفاً دانش‌پذیر و دوره را انتخاب کنید')
      return
    }

    setSaving(true)
    try {
      const payload = {
        student_id: formStudentId,
        course_id: formCourseId,
        payment_status: formPaymentStatus,
      }

      if (editingEnrollment) {
        const res = await fetch(`/api/enrollments/${editingEnrollment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'خطا در ویرایش')
        }
        toast.success('ثبت‌نام با موفقیت ویرایش شد')
      } else {
        const res = await fetch('/api/enrollments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'خطا در ایجاد')
        }
        toast.success('ثبت‌نام جدید با موفقیت ایجاد شد')
      }

      setDialogOpen(false)
      fetchEnrollments()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطا در ذخیره‌سازی'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (enrollmentId: string) => {
    setDeleting(enrollmentId)
    setDeleteConfirmId(null)
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error()
      toast.success('ثبت‌نام با موفقیت حذف شد')
      fetchEnrollments()
    } catch {
      toast.error('خطا در حذف ثبت‌نام')
    } finally {
      setDeleting(null)
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

  const formatPrice = (value: number) => {
    return value.toLocaleString('fa-IR') + ' تومان'
  }

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffSeconds < 60) return 'همین الان'
    if (diffMinutes < 60) return `${diffMinutes.toLocaleString('fa-IR')} دقیقه پیش`
    if (diffHours < 24) return `${diffHours.toLocaleString('fa-IR')} ساعت پیش`
    if (diffDays < 7) return `${diffDays.toLocaleString('fa-IR')} روز پیش`
    if (diffMonths < 1) return `${diffDays.toLocaleString('fa-IR')} روز پیش`
    if (diffMonths < 12) return `${diffMonths.toLocaleString('fa-IR')} ماه پیش`
    const diffYears = Math.floor(diffMonths / 12)
    return `${diffYears.toLocaleString('fa-IR')} سال پیش`
  }

  const getInitials = (firstName: string, lastName: string) => {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
  }

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/enrollments/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `enrollments-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('فایل CSV با موفقیت دانلود شد')
    } catch {
      toast.error('خطا در خروجی CSV')
    }
  }

  const statCards = [
    {
      title: 'کل ثبت‌نام‌ها',
      value: stats.total,
      icon: Users,
      colorClass: 'text-foreground dark:text-foreground',
      bgClass: 'bg-muted/60 dark:bg-muted/20',
      borderClass: 'border-border dark:border-border',
      gradientClass: 'from-neutral-500 to-neutral-800',
    },
    {
      title: 'پرداخت شده',
      value: stats.paid,
      icon: CheckCircle2,
      colorClass: 'text-foreground dark:text-foreground',
      bgClass: 'bg-muted/60 dark:bg-muted/20',
      borderClass: 'border-border dark:border-border',
      gradientClass: 'from-neutral-500 to-neutral-800',
    },
    {
      title: 'اقساطی',
      value: stats.installment,
      icon: CreditCard,
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-950/30',
      borderClass: 'border-amber-200 dark:border-amber-800',
      gradientClass: 'from-amber-400 to-amber-600',
    },
    {
      title: 'درآمد کل',
      value: stats.revenue,
      icon: DollarSign,
      colorClass: 'text-foreground dark:text-foreground',
      bgClass: 'bg-muted/60 dark:bg-muted/20',
      borderClass: 'border-border dark:border-border',
      gradientClass: 'from-neutral-500 to-neutral-800',
      isPrice: true,
    },
  ]

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 text-white shadow-md shadow-neutral-400/30 dark:shadow-neutral-400/30">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">مدیریت ثبت‌نام‌ها</h1>
            <p className="text-sm text-muted-foreground mt-0.5">مدیریت ثبت‌نام دانش‌پذیران در دوره‌ها</p>
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
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SALES_MANAGER') && (
            <Button onClick={openCreateDialog} className="gap-2 bg-foreground text-background hover:bg-foreground/85 shadow-sm">
              <PlusCircle className="size-4" />
              ثبت‌نام جدید
            </Button>
          )}
        </div>
      </div>

      {/* Summary Statistics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
          >
            <Card className={`overflow-hidden border ${card.borderClass} hover:shadow-md transition-all duration-300`}>
              <div className={`h-1 bg-gradient-to-l ${card.gradientClass}`} />
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{card.title}</p>
                    <div className={`text-2xl font-bold mt-1 tabular-nums ${card.colorClass}`}>
                      {loading ? (
                        <Skeleton className="h-7 w-16" />
                      ) : card.isPrice ? (
                        formatPrice(card.value)
                      ) : (
                        card.value.toLocaleString('fa-IR')
                      )}
                    </div>
                  </div>
                  <div className={`p-2.5 rounded-xl ${card.bgClass}`}>
                    <card.icon className={`size-5 ${card.colorClass}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Search + Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative max-w-sm flex-1 w-full sm:w-auto">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="جستجو بر اساس نام دانش‌پذیر یا دوره..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
          {(['ALL', 'PAID', 'INSTALLMENT'] as PaymentFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setPaymentFilter(filter)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                paymentFilter === filter
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {filterLabels[filter]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="ثبت‌نامی یافت نشد"
          description={searchQuery || paymentFilter !== 'ALL' ? 'نتیجه‌ای برای جستجوی شما پیدا نشد' : 'هنوز ثبت‌نامی در سیستم انجام نشده است'}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto shadow-sm relative">
          {/* Gradient top border */}
          <div className="h-1 bg-gradient-to-l from-neutral-500 via-neutral-400 to-neutral-800" />
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-right">ردیف</TableHead>
                <TableHead className="text-right">نام دانش‌پذیر</TableHead>
                <TableHead className="text-right">دوره</TableHead>
                <TableHead className="text-right">مبلغ دوره</TableHead>
                <TableHead className="text-right">وضعیت پرداخت</TableHead>
                <TableHead className="text-right">تاریخ ثبت‌نام</TableHead>
                <TableHead className="text-right">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {paginatedEnrollments.map((enrollment, index) => (
                  <motion.tr
                    key={enrollment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.03 }}
                    className={`group hover:bg-muted/50 dark:hover:bg-muted/50 transition-all duration-200 border-b last:border-b-0 border-r-2 border-r-transparent hover:border-r-foreground dark:hover:border-r-foreground`}
                  >
                    <TableCell className="text-muted-foreground">
                      {((currentPage - 1) * ENROLLMENTS_PER_PAGE + index + 1).toLocaleString('fa-IR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9 border-2 border-background shadow-sm">
                          <AvatarFallback className="bg-muted/60 text-foreground">
                            <span className="text-xs font-bold">
                              {getInitials(enrollment.student.first_name, enrollment.student.last_name)}
                            </span>
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-foreground">
                            {enrollment.student.first_name}{' '}
                            {enrollment.student.last_name}
                          </span>
                          <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                            {enrollment.student.phone_number}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-foreground">
                        <BookOpen className="size-4 text-foreground" />
                        <span>{enrollment.course.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="size-3.5 text-foreground" />
                        <span className="text-sm font-medium text-foreground">
                          {formatPrice(enrollment.course.price)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Badge
                          variant="outline"
                          className={`gap-1.5 w-fit ${paymentBgColors[enrollment.payment_status] || ''}`}
                        >
                          {enrollment.payment_status === 'PAID' ? (
                            <CheckCircle2 className="size-3" />
                          ) : (
                            <Clock className="size-3" />
                          )}
                          {paymentLabels[enrollment.payment_status] ||
                            enrollment.payment_status}
                        </Badge>
                        {/* Payment progress bar */}
                        <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              enrollment.payment_status === 'PAID'
                                ? 'bg-gradient-to-l from-neutral-500 to-neutral-800 w-full'
                                : 'bg-gradient-to-l from-amber-400 to-amber-600'
                            }`}
                            style={{ width: enrollment.payment_status === 'PAID' ? '100%' : '50%' }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <CalendarDays className="size-3.5" />
                          {formatPersianDate(enrollment.enrollment_date)}
                        </div>
                        <Badge variant="secondary" className="text-[10px] w-fit px-1.5 py-0">
                          {getRelativeTime(enrollment.createdAt)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPaymentDialog(enrollment)}
                          className="gap-1 text-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-muted/50"
                        >
                          <Wallet className="size-3.5" />
                          پرداخت‌ها
                        </Button>
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SALES_MANAGER') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(enrollment)}
                              className="gap-1 text-foreground hover:text-foreground hover:bg-muted/50"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirmId(enrollment.id)}
                              disabled={deleting === enrollment.id}
                              className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>

          {/* Revenue Summary Row */}
          <div className="border-t bg-muted/20 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-foreground" />
                <span className="text-sm font-medium text-muted-foreground">مجموع درآمد (فیلتر شده):</span>
              </div>
              <span className="text-sm font-bold text-foreground dark:text-foreground tabular-nums">
                {formatPrice(tableRevenue)}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{filteredEnrollments.length.toLocaleString('fa-IR')} ثبت‌نام</span>
              <span>{filteredEnrollments.filter((e) => e.payment_status === 'PAID').length.toLocaleString('fa-IR')} پرداختی</span>
              <span>{filteredEnrollments.filter((e) => e.payment_status === 'INSTALLMENT').length.toLocaleString('fa-IR')} اقساطی</span>
            </div>
          </div>
          <div className="px-6 pb-2">
            <PaginationFooter
              currentPage={currentPage}
              totalItems={filteredEnrollments.length}
              itemsPerPage={ENROLLMENTS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      )}

      {/* Payment Management Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Wallet className="size-5 text-foreground" />
              مدیریت پرداخت‌ها
            </DialogTitle>
            <DialogDescription>
              {paymentEnrollment && (
                <span>
                  {paymentEnrollment.student.first_name} {paymentEnrollment.student.last_name} — {paymentEnrollment.course.title}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Payment Summary Cards */}
          {paymentSummary && (
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-muted/60 dark:bg-muted/20 p-3 text-center">
                <p className="text-[10px] text-muted-foreground font-medium">کل مبلغ</p>
                <p className="text-sm font-bold text-foreground dark:text-foreground mt-1">{formatPrice(paymentSummary.total)}</p>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground font-medium">پرداخت شده</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-400 mt-1">{formatPrice(paymentSummary.paid)}</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground font-medium">در انتظار</p>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400 mt-1">{formatPrice(paymentSummary.pending)}</p>
              </div>
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground font-medium">سررسید شده</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-400 mt-1">{formatPrice(paymentSummary.overdue)}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setInstallmentDialogOpen(true)
                setAddPaymentFormOpen(false)
              }}
              disabled={payments.length > 0}
              className="gap-1.5 bg-foreground text-background hover:bg-foreground/85 text-xs"
            >
              <CreditCard className="size-3.5" />
              ایجاد اقساط
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setAddPaymentFormOpen(!addPaymentFormOpen)
                setInstallmentDialogOpen(false)
              }}
              className="gap-1.5 text-xs"
            >
              <Plus className="size-3.5" />
              افزودن پرداخت
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => paymentEnrollment && fetchPayments(paymentEnrollment.id)}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="size-3.5" />
              بروزرسانی
            </Button>
            {payments.length > 0 && (
              <span className="text-[10px] text-muted-foreground mr-auto">
                برای این ثبت‌نام قبلاً پرداخت ثبت شده است
              </span>
            )}
          </div>

          {/* Installment Sub-Dialog */}
          <AnimatePresence>
            {installmentDialogOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="size-4 text-foreground" />
                    ایجاد اقساط
                  </h4>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs font-medium whitespace-nowrap">تعداد اقساط:</Label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInstallmentCount(3)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          installmentCount === 3
                            ? 'bg-muted/60 text-foreground shadow-sm'
                            : 'bg-background border hover:border-border'
                        }`}
                      >
                        ۳ اقساط
                      </button>
                      <button
                        onClick={() => setInstallmentCount(6)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          installmentCount === 6
                            ? 'bg-muted/60 text-foreground shadow-sm'
                            : 'bg-background border hover:border-border'
                        }`}
                      >
                        ۶ اقساط
                      </button>
                    </div>
                  </div>
                  {paymentEnrollment && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>مبلغ دوره: {formatPrice(paymentEnrollment.course.price)}</span>
                      <span>مبلغ هر قسط: {formatPrice(Math.ceil(paymentEnrollment.course.price / installmentCount))}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleCreateInstallments}
                      disabled={creatingInstallments}
                      className="bg-foreground text-background hover:bg-foreground/85 gap-1.5"
                    >
                      {creatingInstallments ? (
                        <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle2 className="size-3.5" />
                      )}
                      {creatingInstallments ? 'در حال ایجاد...' : 'تأیید و ایجاد'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setInstallmentDialogOpen(false)}
                    >
                      انصراف
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add Single Payment Form */}
          <AnimatePresence>
            {addPaymentFormOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Plus className="size-4 text-foreground" />
                    افزودن پرداخت جدید
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">مبلغ (تومان)</Label>
                      <Input
                        type="number"
                        value={formPayAmount}
                        onChange={(e) => setFormPayAmount(e.target.value)}
                        placeholder="مثال: ۵۰۰۰۰۰۰"
                        dir="ltr"
                        className="text-right text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">تاریخ سررسید</Label>
                      <Input
                        type="date"
                        value={formPayDueDate}
                        onChange={(e) => setFormPayDueDate(sanitizePersianDateInput(e.target.value) ?? '')}
                        dir="ltr"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">نوع پرداخت</Label>
                      <Select value={formPayType} onValueChange={setFormPayType}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL">کامل</SelectItem>
                          <SelectItem value="INSTALLMENT">قسط</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">توضیحات</Label>
                      <Input
                        value={formPayDescription}
                        onChange={(e) => setFormPayDescription(e.target.value)}
                        placeholder="توضیحات (اختیاری)"
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddPayment}
                      disabled={addingPayment}
                      className="bg-foreground text-background hover:bg-foreground/85 gap-1.5"
                    >
                      {addingPayment ? (
                        <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <PlusCircle className="size-3.5" />
                      )}
                      {addingPayment ? 'در حال ایجاد...' : 'ایجاد پرداخت'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddPaymentFormOpen(false)}
                    >
                      انصراف
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Separator />

          {/* Payments List */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ArrowLeft className="size-4 text-foreground" />
              لیست پرداخت‌ها
              {paymentSummary && (
                <Badge variant="secondary" className="text-[10px]">
                  {paymentSummary.count.toLocaleString('fa-IR')} پرداخت
                </Badge>
              )}
            </h4>
            {paymentsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Wallet className="size-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">هنوز پرداختی ثبت نشده است</p>
                <p className="text-xs mt-1">از دکمه «ایجاد اقساط» یا «افزودن پرداخت» استفاده کنید</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto pr-2">
                <div className="space-y-2">
                  <AnimatePresence>
                    {payments.map((payment, index) => (
                      <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border dark:hover:border-border transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {/* Status dot */}
                          <div className={`size-3 rounded-full shrink-0 ${paymentItemStatusDot[payment.status]}`} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">
                                {payment.description || `پرداخت ${index + 1}`}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 ${paymentItemStatusColors[payment.status]}`}
                              >
                                {paymentItemStatusLabels[payment.status]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>سررسید: {formatPersianDate(payment.due_date)}</span>
                              {payment.paid_date && (
                                <span className="text-foreground dark:text-foreground">
                                  پرداخت: {formatPersianDate(payment.paid_date)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {formatPrice(payment.amount)}
                          </span>
                          {payment.status !== 'PAID' && (currentUser?.role === 'ADMIN' || currentUser?.role === 'SALES_MANAGER') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsPaid(payment.id)}
                              disabled={markingPaid === payment.id}
                              className="gap-1 text-xs border-border text-foreground hover:bg-muted/50 dark:border-border dark:text-foreground dark:hover:bg-muted/50"
                            >
                              {markingPaid === payment.id ? (
                                <span className="size-3 border-2 border-border border-t-foreground rounded-full animate-spin" />
                              ) : (
                                <CheckCircle2 className="size-3" />
                              )}
                              تأیید پرداخت
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl">
              {editingEnrollment ? 'ویرایش ثبت‌نام' : 'ثبت‌نام جدید'}
            </DialogTitle>
            <DialogDescription>
              {editingEnrollment
                ? 'اطلاعات ثبت‌نام را ویرایش کنید'
                : 'اطلاعات ثبت‌نام جدید را وارد کنید'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">دانش‌پذیر</Label>
              <Select value={formStudentId} onValueChange={setFormStudentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب دانش‌پذیر" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.first_name} {s.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">دوره</Label>
              <Select value={formCourseId} onValueChange={setFormCourseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب دوره" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} — {formatPrice(c.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">وضعیت پرداخت</Label>
              <Select value={formPaymentStatus} onValueChange={setFormPaymentStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">پرداخت شده</SelectItem>
                  <SelectItem value="INSTALLMENT">اقساطی</SelectItem>
                </SelectContent>
              </Select>
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
              {saving ? 'در حال ذخیره...' : editingEnrollment ? 'ویرایش' : 'ایجاد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-2">
              <AlertTriangle className="size-7 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-center">تأیید حذف ثبت‌نام</DialogTitle>
            <DialogDescription className="text-center">
              آیا از حذف این ثبت‌نام اطمینان دارید؟ این عملیات غیرقابل بازگشت است.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-center mt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleting !== null}
            >
              انصراف
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) handleDelete(deleteConfirmId)
              }}
              disabled={deleting !== null}
              className="gap-2 min-w-[100px]"
            >
              {deleting ? (
                <>
                  <span className="size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  در حال حذف...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  حذف
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
