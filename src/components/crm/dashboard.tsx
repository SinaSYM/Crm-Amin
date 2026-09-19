'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts'
import {
  Users,
  UserPlus,
  PhoneCall,
  Phone,
  MessageCircle,
  TrendingUp,
  GraduationCap,
  BookOpen,
  Clock,
  ArrowLeft,
  Calendar,
  Target,
  Wallet,
  MessageSquare,
  FileText,
  RefreshCw,
  Sparkles,
  PlusCircle,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  Filter,
  X,
  AlertTriangle,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Zap,
} from 'lucide-react'
import { useCRMStore } from '@/lib/store'
import { sanitizePersianDateInput } from '@/lib/persian-date'
import { motion } from 'framer-motion'
import StudentPortal from './student-portal'

interface DashboardData {
  totalLeads: number
  newLeads: number
  contactedLeads: number
  inProgressLeads: number
  convertedLeads: number
  totalUsers: number
  totalCourses: number
  totalEnrollments: number
  totalInteractions: number
  conversionRate: string
  totalRevenue: number
  leadsBySource: Record<string, number>
  recentLeads: Array<{
    id: string
    first_name: string
    last_name: string
    phone_number: string
    source: string
    status: string
    createdAt: string
    assigned_to: { id: string; first_name: string; last_name: string; role: string } | null
    target_course: { id: string; title: string } | null
  }>
  upcomingFollowups: Array<{
    id: string
    content: string
    next_followup_date: string
    lead: { id: string; first_name: string; last_name: string; phone_number: string; status: string }
    agent: { id: string; first_name: string; last_name: string }
  }>
  leadStatusDistribution: Array<{ status: string; count: number }>
  recentActivity: Array<{
    id: string
    type: string
    content: string
    createdAt: string
    lead: { id: string; first_name: string; last_name: string; status: string }
    agent: { id: string; first_name: string; last_name: string }
  }>
  leadsPerAgent: Array<{
    id: string
    name: string
    role: string
    leadsCount: number
    interactionsCount: number
  }>
  enrollmentsPerCourse: Array<{
    id: string
    title: string
    price: number
    enrollmentsCount: number
    leadsCount: number
    revenue: number
  }>
  paymentDistribution: Array<{ status: string; count: number }>
}

const statusLabels: Record<string, string> = {
  NEW: 'جدید',
  CONTACTED: 'تماس گرفته شده',
  IN_PROGRESS: 'در حال پیگیری',
  CONVERTED: 'تبدیل شده',
}

const statusColors: Record<string, string> = {
  NEW: 'bg-amber-100 text-amber-800 border-amber-200',
  CONTACTED: 'bg-muted/60 text-foreground border-border',
  IN_PROGRESS: 'bg-muted/60 text-foreground border-border',
  CONVERTED: 'bg-muted/60 text-foreground border-border',
}

const statusDotColors: Record<string, string> = {
  NEW: 'bg-muted/60 dark:bg-muted/20',
  CONTACTED: 'bg-muted/60 dark:bg-muted/20',
  IN_PROGRESS: 'bg-yellow-500 dark:bg-yellow-400',
  CONVERTED: 'bg-green-500 dark:bg-green-400',
}

const sourceLabels: Record<string, string> = {
  website: 'وبسایت',
  manual: 'دستی',
  campaign: 'کمپین',
  referral: 'معرفی',
}

const sourceColorMap: Record<string, { bg: string; bar: string; text: string }> = {
  website: { bg: 'bg-muted/60 dark:bg-muted/20', bar: 'bg-muted/60', text: 'text-foreground dark:text-foreground' },
  manual: { bg: 'bg-amber-50 dark:bg-amber-950/30', bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  campaign: { bg: 'bg-muted/60 dark:bg-muted/20', bar: 'bg-muted/60', text: 'text-foreground dark:text-foreground' },
  referral: { bg: 'bg-muted/60 dark:bg-muted/20', bar: 'bg-muted/60', text: 'text-foreground dark:text-foreground' },
}

const roleLabels: Record<string, string> = {
  SALES_AGENT: 'کارشناس فروش',
  SALES_MANAGER: 'مدیر فروش',
  ADMIN: 'ادمین',
}

const statusChartConfig: ChartConfig = {
  NEW: { label: 'جدید', color: 'var(--chart-3)' },
  CONTACTED: { label: 'تماس گرفته شده', color: 'var(--chart-5)' },
  IN_PROGRESS: { label: 'در حال پیگیری', color: 'var(--chart-2)' },
  CONVERTED: { label: 'تبدیل شده', color: 'var(--chart-4)' },
}

const enrollmentChartConfig: ChartConfig = {
  count: { label: 'ثبت‌نام', color: 'var(--chart-1)' },
}

const leadsTrendChartConfig: ChartConfig = {
  leads: { label: 'لید', color: 'var(--chart-1)' },
}

const CHART_COLORS = ['var(--chart-4)', 'var(--chart-5)', 'var(--chart-1)', 'var(--chart-2)']

// ─── Contact helpers (shared pattern with leads page) ───
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('98')) return digits
  if (digits.startsWith('0')) return `98${digits.slice(1)}`
  return digits
}

function whatsappHref(phone: string, name?: string): string {
  const text = encodeURIComponent(
    name ? `سلام ${name}، از آموزش عالی آزاد امین تماس می‌گیریم.` : 'سلام، از آموزش عالی آزاد امین تماس می‌گیریم.'
  )
  return `https://wa.me/${normalizePhone(phone)}?text=${text}`
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'امروز'
  if (diffDays === 1) return 'فردا'
  if (diffDays > 1 && diffDays <= 7) return `${diffDays.toLocaleString('fa-IR')} روز دیگر`
  return formatDate(dateStr)
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'همین الان'
  if (diffMinutes < 60) return `${diffMinutes.toLocaleString('fa-IR')} دقیقه پیش`
  if (diffHours < 24) return `${diffHours.toLocaleString('fa-IR')} ساعت پیش`
  if (diffDays < 7) return `${diffDays.toLocaleString('fa-IR')} روز پیش`
  if (diffDays < 30) return `${Math.floor(diffDays / 7).toLocaleString('fa-IR')} هفته پیش`
  return formatDate(dateStr)
}

function formatPrice(value: number) {
  return value.toLocaleString('fa-IR') + ' تومان'
}

function getInteractionIcon(type: string) {
  switch (type) {
    case 'CALL':
      return <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
    case 'NOTE':
      return <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
    case 'SYSTEM':
      return <RefreshCw className="h-4 w-4 text-gray-500 dark:text-gray-400" />
    default:
      return <MessageSquare className="h-4 w-4 text-foreground dark:text-foreground" />
  }
}

function getInteractionBg(type: string) {
  switch (type) {
    case 'CALL':
      return 'bg-green-100 dark:bg-green-900/40'
    case 'NOTE':
      return 'bg-amber-100 dark:bg-amber-900/40'
    case 'SYSTEM':
      return 'bg-gray-100 dark:bg-gray-800/40'
    default:
      return 'bg-muted/60 dark:bg-muted/20'
  }
}

function getInteractionBgLarge(type: string) {
  switch (type) {
    case 'CALL':
      return 'bg-green-100 dark:bg-green-900/40 ring-2 ring-green-200 dark:ring-green-800/30'
    case 'NOTE':
      return 'bg-amber-100 dark:bg-amber-900/40 ring-2 ring-amber-200 dark:ring-amber-800/30'
    case 'SYSTEM':
      return 'bg-gray-100 dark:bg-gray-800/40 ring-2 ring-gray-200 dark:ring-gray-700/30'
    default:
      return 'bg-muted/60 dark:bg-muted/20 ring-2 ring-foreground/30 dark:ring-foreground/30'
  }
}

export default function Dashboard() {
  const { currentUser } = useCRMStore()

  if (currentUser?.role === 'STUDENT') {
    return <StudentPortal />
  }

  return <AdminDashboard />
}

function AdminDashboard() {
  const { setActiveView, currentUser, setPendingLeadCreate } = useCRMStore()

  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState('')

  // Date filter state
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [activeStartDate, setActiveStartDate] = useState('')
  const [activeEndDate, setActiveEndDate] = useState('')

  const fetchData = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const qs = params.toString()
      const res = await fetch(`/api/dashboard${qs ? `?${qs}` : ''}`)
      if (!res.ok) throw new Error('خطا در دریافت اطلاعات')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای ناشناخته')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(activeStartDate, activeEndDate)
  }, [fetchData, activeStartDate, activeEndDate])

  const handleApplyFilter = () => {
    setActiveStartDate(filterStartDate)
    setActiveEndDate(filterEndDate)
  }

  const handleClearFilter = () => {
    setFilterStartDate('')
    setFilterEndDate('')
    setActiveStartDate('')
    setActiveEndDate('')
  }

  const isFilterActive = !!(activeStartDate || activeEndDate)

  useEffect(() => {
    setCurrentDate(
      new Intl.DateTimeFormat('fa-IR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date())
    )
  }, [])

  // Generate mock leads trend data for last 7 days
  const leadsTrendData = useMemo(() => {
    const days: Array<{ day: string; leads: number }> = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dayName = new Intl.DateTimeFormat('fa-IR', { weekday: 'short' }).format(date)
      // Generate plausible mock values based on total leads
      const base = data?.totalLeads ? Math.floor(data.totalLeads / 14) : 2
      const variance = Math.floor(Math.random() * 3) - 1
      days.push({
        day: dayName,
        leads: Math.max(base + variance, 0),
      })
    }
    return days
  }, [data?.totalLeads])

  // Lead score distribution (mock brackets based on lead status)
  const leadScoreDistribution = useMemo(() => {
    if (!data) return []
    return [
      { bracket: 'بالا (تبدیل شده)', count: data.convertedLeads, color: 'bg-muted/60', textColor: 'text-foreground dark:text-foreground' },
      { bracket: 'متوسط (در حال پیگیری)', count: data.inProgressLeads, color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300' },
      { bracket: 'پایین (تماس شده)', count: data.contactedLeads, color: 'bg-muted/60', textColor: 'text-foreground dark:text-foreground' },
      { bracket: 'جدید', count: data.newLeads, color: 'bg-gray-400', textColor: 'text-gray-700 dark:text-gray-300' },
    ]
  }, [data])

  const maxLeadScore = useMemo(() => {
    return Math.max(...leadScoreDistribution.map((d) => d.count), 1)
  }, [leadScoreDistribution])

  const contactRate = useMemo(() => {
    if (!data) return '0'
    const contactedTotal = (data.contactedLeads || 0) + (data.inProgressLeads || 0) + (data.convertedLeads || 0)
    return data.totalLeads > 0 ? ((contactedTotal / data.totalLeads) * 100).toFixed(1) : '0'
  }, [data])

  const churnRate = useMemo(() => {
    if (!data) return '0'
    const activeOrConverted = (data.inProgressLeads || 0) + (data.convertedLeads || 0)
    const churned = Math.max(data.totalLeads - activeOrConverted, 0)
    return data.totalLeads > 0 ? ((churned / data.totalLeads) * 100).toFixed(1) : '0'
  }, [data])

  const statCards = [
    {
      title: 'کل لیدها',
      subtitle: 'مجموع لیدهای ثبت شده',
      value: data?.totalLeads ?? 0,
      icon: Users,
      gradientClass: 'bg-foreground',
      lightBg: 'bg-muted/60 dark:bg-muted/20',
      iconBg: 'bg-muted/60 dark:bg-muted/20',
      iconColor: 'text-foreground dark:text-foreground',
      trend: '+۱۲٪',
    },
    {
      title: 'نرخ تماس',
      subtitle: 'میزان لیدهای تماس شده',
      value: contactRate,
      suffix: '%',
      icon: PhoneCall,
      gradientClass: 'bg-[#d9730d]',
      lightBg: 'bg-amber-50 dark:bg-amber-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      trend: '+۵٪',
    },
    {
      title: 'در حال پیگیری',
      subtitle: 'لیدهای فعال',
      value: data?.inProgressLeads ?? 0,
      icon: PhoneCall,
      gradientClass: 'bg-[#9065b0]',
      lightBg: 'bg-muted/60 dark:bg-muted/20',
      iconBg: 'bg-muted/60 dark:bg-muted/20',
      iconColor: 'text-foreground dark:text-foreground',
      trend: '+۳٪',
    },
    {
      title: 'تبدیل شده',
      subtitle: 'لیدهای موفق',
      value: data?.convertedLeads ?? 0,
      icon: TrendingUp,
      gradientClass: 'bg-[#0f7b6c]',
      lightBg: 'bg-green-50 dark:bg-green-950/30',
      iconBg: 'bg-green-100 dark:bg-green-900/50',
      iconColor: 'text-green-600 dark:text-green-400',
      trend: '+۸٪',
    },
    {
      title: 'نرخ تبدیل',
      subtitle: 'درصد موفقیت ثبت‌نام',
      value: data?.conversionRate ?? '0',
      suffix: '%',
      icon: Target,
      gradientClass: 'bg-muted/60',
      lightBg: 'bg-muted/60 dark:bg-muted/20',
      iconBg: 'bg-muted/60 dark:bg-muted/20',
      iconColor: 'text-foreground dark:text-foreground',
      trend: '+۲٪',
    },
    {
      title: 'نرخ ریزش',
      subtitle: 'لیدهای غیرفعال شده',
      value: churnRate,
      suffix: '%',
      icon: AlertTriangle,
      gradientClass: 'bg-red-400',
      lightBg: 'bg-red-50 dark:bg-red-950/30',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
      iconColor: 'text-red-600 dark:text-red-400',
      trend: '-۳٪',
    },
    {
      title: 'درآمد کل',
      subtitle: 'درآمد تخمینی',
      value: data?.totalRevenue ?? 0,
      isPrice: true,
      icon: Wallet,
      gradientClass: 'bg-muted/60',
      lightBg: 'bg-muted/60 dark:bg-muted/20',
      iconBg: 'bg-muted/60 dark:bg-muted/20',
      iconColor: 'text-foreground dark:text-foreground',
      trend: '+۱۵٪',
    },
    {
      title: 'ثبت‌نام‌ها',
      subtitle: 'کل ثبت‌نام‌ها',
      value: data?.totalEnrollments ?? 0,
      icon: GraduationCap,
      gradientClass: 'bg-rose-400',
      lightBg: 'bg-rose-50 dark:bg-rose-950/30',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
      iconColor: 'text-rose-600 dark:text-rose-400',
      trend: '+۴٪',
    },
  ]

  const pieData = data?.leadStatusDistribution.map((item) => ({
    status: item.status,
    count: item.count,
    fill: item.status,
  })) ?? []

  const barData = data?.enrollmentsPerCourse.map((item) => ({
    name: item.title.length > 15 ? item.title.substring(0, 15) + '...' : item.title,
    count: item.enrollmentsCount,
    fullName: item.title,
  })) ?? []

  const maxAgentLeads = data?.leadsPerAgent
    ? Math.max(...data.leadsPerAgent.map((a) => a.leadsCount), 1)
    : 1

  const maxSourceCount = data?.leadsBySource
    ? Math.max(...Object.values(data.leadsBySource), 1)
    : 1

  const userName = currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : ''

  // Time-of-day greeting and motivational message
  const getGreeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return { greeting: 'صبح بخیر', message: 'روز پرانرژی‌ای داشته باشید', icon: Sunrise, iconColor: 'text-amber-500' }
    if (hour >= 12 && hour < 18) return { greeting: 'ظهر بخیر', message: 'امیدوارم روز خوبی داشته باشید', icon: Sun, iconColor: 'text-foreground' }
    if (hour >= 18 && hour < 24) return { greeting: 'عصر بخیر', message: 'وقت استراحت نزدیک است', icon: Sunset, iconColor: 'text-foreground' }
    return { greeting: 'شب بخیر', message: 'فردا روز جدیدی است', icon: Moon, iconColor: 'text-slate-400' }
  }, [])

// Count today's follow-ups
const todayFollowups = useMemo(() => {
  if (!data?.upcomingFollowups) return []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return data.upcomingFollowups.filter((f) => {
    const d = new Date(f.next_followup_date)
    return d >= today && d < tomorrow
  })
}, [data?.upcomingFollowups])

// Follow-ups missed before today — the ones most at risk of being forgotten.
const overdueFollowups = useMemo(() => {
  if (!data?.upcomingFollowups) return []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return data.upcomingFollowups.filter((f) => new Date(f.next_followup_date) < today)
}, [data?.upcomingFollowups])

  const pendingTasksToday = todayFollowups.length

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md border-destructive/50">
          <CardContent className="p-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-muted-foreground text-sm mt-2">لطفاً صفحه را مجدداً بارگذاری کنید</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-2xl bg-gradient-to-l from-neutral-500 via-neutral-400 to-transparent dark:from-neutral-500 dark:via-neutral-400 dark:to-transparent p-5 border border-border dark:border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              {getGreeting.greeting}{userName ? `، ${userName}` : ''}
              <Sparkles className="h-5 w-5 text-foreground dark:text-foreground" />
            </h2>
            <p className="text-sm text-foreground dark:text-foreground mt-1 font-medium">
              {getGreeting.message}
            </p>
            {currentDate && (
              <p className="text-sm text-muted-foreground mt-1">{currentDate}</p>
            )}
            {pendingTasksToday > 0 && !loading && (
              <div className="flex items-center gap-1.5 mt-2">
                <Zap className="size-3.5 text-amber-500" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  {pendingTasksToday.toLocaleString('fa-IR')} پیگیری برای امروز
                </span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 dark:from-neutral-500 dark:to-neutral-800 flex items-center justify-center shadow-lg shadow-neutral-400/30 dark:shadow-neutral-400/30">
            <getGreeting.icon className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="mt-3 h-1 w-28 rounded-full bg-gradient-to-l from-neutral-500 to-neutral-800 dark:from-neutral-500 dark:to-neutral-800" />
      </div>

      {/* Date Range Filter */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3 flex-wrap"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="size-4 text-foreground" />
          فیلتر تاریخ
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(sanitizePersianDateInput(e.target.value) ?? '')}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-foreground/30 focus:border-border"
              dir="ltr"
            />
          </div>
          <span className="text-xs text-muted-foreground">تا</span>
          <div className="relative">
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(sanitizePersianDateInput(e.target.value) ?? '')}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-2 focus:ring-foreground/30 focus:border-border"
              dir="ltr"
            />
          </div>
          <Button
            size="sm"
            onClick={handleApplyFilter}
            disabled={!filterStartDate && !filterEndDate}
            className="gap-1.5 bg-foreground text-background hover:bg-foreground/85 h-9 text-xs"
          >
            اعمال
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearFilter}
            disabled={!isFilterActive}
            className="gap-1.5 h-9 text-xs"
          >
            همه
          </Button>
        </div>
        {isFilterActive && (
          <Badge className="bg-muted/60 text-foreground border-border dark:bg-muted/20 dark:text-foreground dark:border-border gap-1.5 text-xs">
            <span className="size-1.5 rounded-full bg-muted/60 animate-pulse" />
            فیلتر فعال
            <button onClick={handleClearFilter} className="hover:text-foreground dark:hover:text-foreground">
              <X className="size-3" />
            </button>
          </Badge>
        )}
      </motion.div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => {
            setPendingLeadCreate(true)
            setActiveView('leads')
          }}
          className="group flex items-center gap-3 p-3.5 rounded-xl glass-surface border border-border/70 hover:border-foreground/15 hover:shadow-[0_6px_20px_-4px_rgba(15,15,15,0.12)] hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="flex items-center justify-center size-10 rounded-lg bg-muted text-foreground group-hover:scale-110 transition-transform duration-200">
            <PlusCircle className="size-5" />
          </div>
          <span className="text-sm font-medium text-foreground">افزودن لید</span>
        </button>

        <button
          onClick={() => setActiveView('interactions')}
          className="group flex items-center gap-3 p-3.5 rounded-xl glass-surface border border-border/70 hover:border-foreground/15 hover:shadow-[0_6px_20px_-4px_rgba(15,15,15,0.12)] hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="flex items-center justify-center size-10 rounded-lg bg-muted/60 text-foreground dark:text-foreground group-hover:scale-110 transition-transform duration-200">
            <PhoneCall className="size-5" />
          </div>
          <span className="text-sm font-medium text-foreground">ثبت تماس</span>
        </button>

        <button
          onClick={() => setActiveView('calendar')}
          className="group flex items-center gap-3 p-3.5 rounded-xl glass-surface border border-border/70 hover:border-foreground/15 hover:shadow-[0_6px_20px_-4px_rgba(15,15,15,0.12)] hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="flex items-center justify-center size-10 rounded-lg bg-[#d9730d]/10 text-[#d9730d] dark:text-[#e8a04c] group-hover:scale-110 transition-transform duration-200">
            <CalendarDays className="size-5" />
          </div>
          <span className="text-sm font-medium text-foreground">مشاهده تقویم</span>
        </button>

        <button
          onClick={() => setActiveView('analytics')}
          className="group flex items-center gap-3 p-3.5 rounded-xl glass-surface border border-border/70 hover:border-foreground/15 hover:shadow-[0_6px_20px_-4px_rgba(15,15,15,0.12)] hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="flex items-center justify-center size-10 rounded-lg bg-[#0f7b6c]/10 text-[#0f7b6c] dark:text-[#46a997] group-hover:scale-110 transition-transform duration-200">
            <BarChart3 className="size-5" />
          </div>
          <span className="text-sm font-medium text-foreground">گزارش‌ها</span>
        </button>
      </div>

      {/* Today's & Overdue Follow-ups Section */}
      {(todayFollowups.length > 0 || overdueFollowups.length > 0) && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border border-border bg-gradient-to-l from-muted/60 to-transparent dark:from-muted/30 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-foreground" />
                  پیگیری‌های نیازمند اقدام
                  <Badge className="bg-muted text-foreground border-border text-[10px] gap-1">
                    <span className="size-1.5 rounded-full bg-foreground animate-pulse" />
                    {(overdueFollowups.length + todayFollowups.length).toLocaleString('fa-IR')} مورد
                  </Badge>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView('calendar')}
                  className="text-xs text-primary hover:text-primary/80 gap-1"
                >
                  مشاهده همه
                  <ChevronLeft className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[...overdueFollowups, ...todayFollowups].map((followup) => {
                  const isOverdue = new Date(followup.next_followup_date) < new Date()
                  return (
                    <div
                      key={followup.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isOverdue
                          ? 'border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20 hover:border-red-300 dark:hover:border-red-700'
                          : 'border-border bg-card hover:border-foreground/15'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex items-center justify-center h-9 w-9 rounded-lg shrink-0 ${
                          isOverdue
                            ? 'bg-red-100 dark:bg-red-900/40'
                            : 'bg-muted dark:bg-muted/50'
                        }`}>
                          {isOverdue ? (
                            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                          ) : (
                            getInteractionIcon(followup.lead?.status === 'CONVERTED' ? 'CALL' : 'NOTE')
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {followup.lead.first_name} {followup.lead.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {followup.agent.first_name} {followup.agent.last_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOverdue && (
                          <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800 text-[9px]">
                            تأخیر
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(followup.next_followup_date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <a
                          href={`tel:+${normalizePhone(followup.lead.phone_number)}`}
                          title="تماس تلفنی"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted/50 dark:hover:bg-muted/50"
                        >
                          <Phone className="size-3.5" />
                        </a>
                        <a
                          href={whatsappHref(followup.lead.phone_number, `${followup.lead.first_name} ${followup.lead.last_name}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="پیام واتساپ"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-950/40"
                        >
                          <MessageCircle className="size-3.5" />
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Section Label: General Statistics */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-primary" />
        <h3 className="text-sm font-semibold text-muted-foreground">آمار کلی</h3>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => {
          // Calculate sparkline-like progress percentage for the stat card
          const maxVal = Math.max(
            ...statCards
              .filter((c) => !c.isPrice && !c.suffix)
              .map((c) => c.value as number),
            1
          )
          const cardValue = card.isPrice || card.suffix ? 50 : (card.value as number)
          const progressPercent = Math.max((cardValue / maxVal) * 100, 5)

          return (
            <Card
              key={index}
              className="group relative overflow-hidden border shadow-sm bg-card transition-colors hover:border-foreground/15 dark:hover:border-white/20"
            >
              <div className={`absolute top-0 right-0 left-0 h-[3px] ${card.gradientClass}`} />
              <CardContent className="relative p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground truncate">{card.title}</p>
                    {loading ? (
                      <Skeleton className="h-7 w-16" />
                    ) : (
                      <p className="text-2xl font-bold tabular-nums leading-tight animate-count-up">
                        {card.isPrice
                          ? formatPrice(card.value as number)
                          : card.suffix
                            ? Number(card.value).toLocaleString('fa-IR') + card.suffix
                            : (card.value as number).toLocaleString('fa-IR')}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/70 truncate">{card.subtitle}</p>
                    {/* Sparkline-like progress bar */}
                    {!loading && !card.isPrice && (
                      <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden mt-1.5">
                        <div
                          className={`h-full ${card.gradientClass} rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    )}
                    {card.trend && !loading && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-foreground dark:text-foreground bg-muted/60 dark:bg-muted/20 px-1.5 py-0.5 rounded-full mt-0.5">
                        {card.trend} ↑
                      </span>
                    )}
                  </div>
                  <div className={`${card.iconBg} p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110 shrink-0`}>
                    <card.icon className={`h-5 w-5 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Performance Overview - Leads Trend */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-foreground" />
            روند لیدها — ۷ روز اخیر
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          ) : (
            <ChartContainer config={leadsTrendChartConfig} className="h-40 w-full">
              <AreaChart data={leadsTrendData} margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="leads"
                  stroke="var(--chart-1)"
                  strokeWidth={2.5}
                  fill="url(#leadsGradient)"
                  dot={{ r: 4, fill: 'var(--chart-1)', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: 'var(--chart-1)', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px bg-gradient-to-l from-border via-border to-transparent" />
        <div className="h-2 w-2 rounded-full bg-muted/60 dark:bg-muted/20 shrink-0" />
        <div className="flex-1 h-px bg-gradient-to-r from-border via-border to-transparent" />
      </div>

      {/* Section Label: Charts */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-1 rounded-full bg-muted/60 dark:bg-muted/20" />
        <h3 className="text-sm font-semibold text-muted-foreground">نمودارها</h3>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Lead Status Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">توزیع وضعیت لیدها</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Skeleton className="h-56 w-56 rounded-full" />
              </div>
            ) : pieData.length > 0 ? (
              <div className="relative">
                <ChartContainer config={statusChartConfig} className="h-72 w-full">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      strokeWidth={2}
                      stroke="var(--background)"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-12">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {(data?.totalLeads ?? 0).toLocaleString('fa-IR')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">کل لیدها</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-30" />
                <p>داده‌ای برای نمایش وجود ندارد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Enrollments per Course */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-foreground" />
              ثبت‌نام به ازای دوره
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-md" />
                ))}
              </div>
            ) : barData.length > 0 ? (
              <ChartContainer config={enrollmentChartConfig} className="h-72 w-full">
                <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    domain={[0, (dataMax: number) => Math.max(dataMax, 4)]}
                    tickFormatter={(v) => v.toLocaleString('fa-IR')}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => (v.length > 16 ? v.slice(0, 16) + '…' : v)}
                  />
                  <Bar dataKey="count" radius={[0, 5, 5, 0]} barSize={18}>
                    {barData.map((entry, index) => (
                      <Cell
                        key={`bar-${index}`}
                        fill={entry.count === Math.max(...barData.map((d) => d.count)) ? 'var(--chart-2)' : 'var(--chart-1)'}
                      />
                    ))}
                  </Bar>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name, item) => (
                          <span className="font-bold">
                            {(value as number).toLocaleString('fa-IR')} ثبت‌نام
                          </span>
                        )}
                        labelFormatter={(label, payload) => {
                          const item = payload?.[0]?.payload
                          return item?.fullName || label
                        }}
                      />
                    }
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mb-3 opacity-30" />
                <p>دوره‌ای برای نمایش وجود ندارد</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Middle Row - Recent Leads & Enhanced Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowLeft className="h-5 w-5 text-foreground" />
              لیدهای اخیر
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : data?.recentLeads && data.recentLeads.length > 0 ? (
              <div className="h-72 overflow-y-auto pr-2">
                <div className="space-y-2">
                  {data.recentLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-muted/60 dark:bg-muted/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-foreground dark:text-foreground">
                            {lead.first_name?.[0] || lead.last_name?.[0] || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${statusDotColors[lead.status] || 'bg-gray-500 dark:bg-gray-400'}`} />
                            <p className="text-sm font-medium truncate">
                              {lead.first_name} {lead.last_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                              {lead.phone_number}
                            </p>
                            {lead.target_course && (
                              <span className="text-[10px] text-muted-foreground/70 truncate">
                                — {lead.target_course.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] ${statusColors[lead.status] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {statusLabels[lead.status] || lead.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Users className="h-12 w-12 mb-3 opacity-30" />
                <p>لیدی یافت نشد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Recent Activity Feed */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-foreground" />
                فعالیت‌های اخیر
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('interactions')}
                className="text-xs text-foreground hover:text-foreground gap-1"
              >
                مشاهده همه
                <ChevronLeft className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : data?.recentActivity && data.recentActivity.length > 0 ? (
              <div className="h-72 overflow-y-auto pr-2">
                <div className="relative pr-8">
                  {/* Timeline line */}
                  <div className="absolute right-3 top-2 bottom-2 w-px bg-gradient-to-b from-neutral-500 via-neutral-400 to-neutral-800 dark:from-neutral-500 dark:via-neutral-400 dark:to-neutral-800" />
                  <div className="space-y-5">
                    {data.recentActivity.map((activity) => (
                      <div key={activity.id} className="relative flex gap-3">
                        {/* Timeline dot - larger colored circle */}
                        <div className={`absolute -right-[22px] top-1 h-8 w-8 rounded-full flex items-center justify-center ${getInteractionBgLarge(activity.type)}`}>
                          {getInteractionIcon(activity.type)}
                        </div>
                        <div className="flex-1 mr-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Agent avatar with initials */}
                              <div className="size-6 rounded-full bg-muted/60 dark:bg-muted/20 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-foreground dark:text-foreground">
                                  {activity.agent.first_name?.[0]}{activity.agent.last_name?.[0]}
                                </span>
                              </div>
                              <span className="text-xs font-medium truncate">
                                {activity.agent.first_name} {activity.agent.last_name}
                              </span>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                ← {activity.lead.first_name} {activity.lead.last_name}
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
                              {formatRelativeTime(activity.createdAt)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {activity.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
                <p>فعالیتی ثبت نشده است</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - Upcoming Follow-ups & Lead Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Follow-ups */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-foreground" />
              پیگیری‌های پیش‌رو
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : data?.upcomingFollowups && data.upcomingFollowups.length > 0 ? (
              <div className="h-72 overflow-y-auto pr-2">
                <div className="space-y-2">
                  {data.upcomingFollowups.map((followup) => (
                    <div
                      key={followup.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border dark:hover:border-border transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted/60 dark:bg-muted/20 shrink-0">
                          <Clock className="h-5 w-5 text-foreground dark:text-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {followup.lead.first_name} {followup.lead.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {followup.content}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Badge variant="outline" className="text-[10px]">
                          {formatRelativeDate(followup.next_followup_date)}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {followup.agent.first_name} {followup.agent.last_name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-3 opacity-30" />
                <p>پیگیری پیش‌رویی وجود ندارد</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Score Distribution */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-foreground" />
              توزیع امتیاز لیدها
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : leadScoreDistribution.length > 0 ? (
              <div className="space-y-3">
                {leadScoreDistribution.map((item, index) => {
                  const progressPercent = Math.max((item.count / maxLeadScore) * 100, 2)
                  return (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">{item.bracket}</span>
                        <span className={`text-sm font-bold tabular-nums ${item.textColor}`}>
                          {item.count.toLocaleString('fa-IR')}
                        </span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full transition-all duration-700`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Target className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">داده‌ای موجود نیست</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Agents */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-500" />
            عامل‌های برتر
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : data?.leadsPerAgent && data.leadsPerAgent.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.leadsPerAgent
                .sort((a, b) => b.leadsCount - a.leadsCount)
                .map((agent) => {
                  const progressPercent = Math.max((agent.leadsCount / maxAgentLeads) * 100, 2)
                  return (
                    <div
                      key={agent.id}
                      className="p-3 rounded-lg border border-border/50 hover:border-amber-200 dark:hover:border-amber-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-white">
                            {agent.name?.[0] || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{agent.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {roleLabels[agent.role] || agent.role}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-[10px]">
                            {agent.interactionsCount.toLocaleString('fa-IR')} تعامل
                          </Badge>
                          <span className="text-sm font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                            {agent.leadsCount.toLocaleString('fa-IR')} لید
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-amber-400 to-amber-600 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Users className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">عاملی یافت نشد</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Source Distribution */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-foreground" />
            منابع لیدها
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : data?.leadsBySource && Object.keys(data.leadsBySource).length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(data.leadsBySource).map(([source, count]) => {
                const colors = sourceColorMap[source] || {
                  bg: 'bg-gray-50 dark:bg-gray-950/30',
                  bar: 'bg-gray-500',
                  text: 'text-gray-700 dark:text-gray-300',
                }
                const progressPercent = Math.max((count / maxSourceCount) * 100, 2)
                return (
                  <div
                    key={source}
                    className={`p-4 rounded-xl ${colors.bg} hover:shadow-sm transition-all`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {sourceLabels[source] || source}
                      </p>
                      <p className={`text-lg font-bold tabular-nums ${colors.text}`}>
                        {count.toLocaleString('fa-IR')}
                      </p>
                    </div>
                    <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Target className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">منبعی یافت نشد</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
