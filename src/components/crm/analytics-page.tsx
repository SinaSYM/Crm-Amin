'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  DollarSign,
  MessageSquare,
  UserCheck,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  GraduationCap,
  ArrowUpRight,
  Users,
  Printer,
  FileDown,
} from 'lucide-react'
import { motion } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LeadFunnel {
  total: number
  new: number
  contacted: number
  inProgress: number
  converted: number
  conversionRate: string
}

interface InteractionDistribution {
  call: number
  note: number
  system: number
  total: number
}

interface AgentPerformance {
  id: string
  name: string
  role: string
  totalAssigned: number
  converted: number
  conversionRate: string
  interactionsCount: number
}

interface CourseAnalytics {
  id: string
  title: string
  price: number
  isActive: boolean
  enrollmentCount: number
  leadCount: number
  revenue: number
  popularity: number
}

interface SourceEffectiveness {
  total: number
  converted: number
  rate: string
}

interface MonthlyTrend {
  month: string
  monthShort: string
  count: number
}

interface PaymentSummary {
  paid: number
  installment: number
  total: number
}

interface AnalyticsData {
  leadFunnel: LeadFunnel
  interactionDistribution: InteractionDistribution
  agentPerformance: AgentPerformance[]
  courseAnalytics: CourseAnalytics[]
  sourceEffectiveness: Record<string, SourceEffectiveness>
  monthlyTrend: MonthlyTrend[]
  paymentSummary: PaymentSummary
  revenueByCourse: CourseAnalytics[]
  totalRevenue: number
}

// ─── Chart Configs ───────────────────────────────────────────────────────────

const funnelChartConfig: ChartConfig = {
  count: { label: 'تعداد', color: 'var(--chart-1)' },
  NEW: { label: 'جدید', color: 'var(--chart-4)' },
  CONTACTED: { label: 'تماس گرفته شده', color: 'var(--chart-5)' },
  IN_PROGRESS: { label: 'در حال پیگیری', color: 'var(--chart-1)' },
  CONVERTED: { label: 'تبدیل شده', color: 'var(--chart-2)' },
}

const sourceChartConfig: ChartConfig = {
  rate: { label: 'نرخ تبدیل (%)', color: 'var(--chart-1)' },
  website: { label: 'وبسایت', color: 'var(--chart-5)' },
  manual: { label: 'دستی', color: 'var(--chart-4)' },
  campaign: { label: 'کمپین', color: 'var(--chart-2)' },
}

const monthlyChartConfig: ChartConfig = {
  count: { label: 'تعداد ثبت‌نام', color: 'var(--chart-1)' },
}

const paymentChartConfig: ChartConfig = {
  paid: { label: 'پرداخت کامل', color: 'var(--chart-1)' },
  installment: { label: 'اقساطی', color: 'var(--chart-5)' },
}

const revenueCourseChartConfig: ChartConfig = {
  revenue: { label: 'درآمد (تومان)', color: 'var(--chart-1)' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sourceLabels: Record<string, string> = {
  website: 'وبسایت',
  manual: 'دستی',
  campaign: 'کمپین',
  referral: 'معرفی',
}

function formatPersianNumber(value: number): string {
  return value.toLocaleString('fa-IR')
}

function formatPrice(value: number): string {
  return value.toLocaleString('fa-IR') + ' تومان'
}

function getConversionRateColor(rate: number): string {
  if (rate > 30) return 'text-foreground dark:text-foreground'
  if (rate > 15) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getConversionRateBg(rate: number): string {
  if (rate > 30) return 'bg-muted/60 text-foreground border-border dark:bg-muted/20 dark:text-foreground dark:border-border'
  if (rate > 15) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
  return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800'
}

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

// Section slide variants for different directions
const slideFromRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const slideFromLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

const slideFromBottom = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const res = await fetch('/api/analytics')
        if (!res.ok) throw new Error('خطا در دریافت اطلاعات')
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطای ناشناخته')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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

  // ─── Derived Data ────────────────────────────────────────────────────────

  const funnelData = data
    ? [
        { stage: 'جدید', count: data.leadFunnel.new, status: 'NEW' },
        { stage: 'تماس گرفته شده', count: data.leadFunnel.contacted, status: 'CONTACTED' },
        { stage: 'در حال پیگیری', count: data.leadFunnel.inProgress, status: 'IN_PROGRESS' },
        { stage: 'تبدیل شده', count: data.leadFunnel.converted, status: 'CONVERTED' },
      ]
    : []

  const funnelColors: Record<string, string> = {
    NEW: 'var(--chart-4)',
    CONTACTED: 'var(--chart-5)',
    IN_PROGRESS: 'var(--chart-1)',
    CONVERTED: 'var(--chart-2)',
  }

  const sourceData = data
    ? Object.entries(data.sourceEffectiveness).map(([key, val]) => ({
        source: sourceLabels[key] || key,
        sourceKey: key,
        rate: parseFloat(val.rate),
        total: val.total,
        converted: val.converted,
      }))
    : []

  const paymentData = data
    ? [
        { type: 'پرداخت کامل', value: data.paymentSummary.paid, key: 'paid' },
        { type: 'اقساطی', value: data.paymentSummary.installment, key: 'installment' },
      ]
    : []

  const paymentColors: Record<string, string> = {
    paid: 'var(--chart-1)',
    installment: 'var(--chart-5)',
  }

  const revenueByCourseData = data
    ? data.revenueByCourse.map((c) => ({
        title: c.title,
        revenue: c.revenue,
      }))
    : []

  const maxCourseRevenue = data
    ? Math.max(...data.courseAnalytics.map((c) => c.revenue), 1)
    : 1

  const maxPopularity = data
    ? Math.max(...data.courseAnalytics.map((c) => c.popularity), 1)
    : 1

  const sortedCourses = data
    ? [...data.courseAnalytics].sort((a, b) => b.revenue - a.revenue)
    : []

  // ─── Stat Cards Config ───────────────────────────────────────────────────

  const statCards = [
    {
      title: 'نرخ تبدیل',
      value: data ? `${data.leadFunnel.conversionRate}٪` : '—',
      icon: TrendingUp,
      gradient: 'from-neutral-500 to-neutral-800',
      lightBg: 'bg-muted/60 dark:bg-muted/20',
      iconBg: 'bg-muted/60 dark:bg-muted/20',
      iconColor: 'text-foreground dark:text-foreground',
    },
    {
      title: 'درآمد کل',
      value: data ? formatPrice(data.totalRevenue) : '—',
      icon: DollarSign,
      gradient: 'from-neutral-500 to-neutral-800',
      lightBg: 'bg-muted/60 dark:bg-muted/20',
      iconBg: 'bg-muted/60 dark:bg-muted/20',
      iconColor: 'text-foreground dark:text-foreground',
    },
    {
      title: 'تعداد تعاملات',
      value: data ? formatPersianNumber(data.interactionDistribution.total) : '—',
      icon: MessageSquare,
      gradient: 'from-amber-500 to-neutral-800',
      lightBg: 'bg-amber-50 dark:bg-amber-950/30',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'ثبت‌نام‌های فعال',
      value: data ? formatPersianNumber(data.paymentSummary.total) : '—',
      icon: UserCheck,
      gradient: 'from-neutral-500 to-neutral-800',
      lightBg: 'bg-muted/60 dark:bg-muted/20',
      iconBg: 'bg-muted/60 dark:bg-muted/20',
      iconColor: 'text-foreground dark:text-foreground',
    },
  ]

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-muted/60 dark:bg-muted/20">
              <BarChart3 className="h-5 w-5 text-foreground dark:text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">گزارش‌ها و تحلیل</h1>
              <p className="text-muted-foreground text-sm">تحلیل جامع عملکرد فروش و ثبت‌نام</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => window.print()}
            >
              <Printer className="size-4" />
              چاپ گزارش
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                const el = document.querySelector('[data-analytics-content]')
                if (el) {
                  const text = el.innerHTML
                  const blob = new Blob([text], { type: 'text/html' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.html`
                  a.click()
                  URL.revokeObjectURL(url)
                }
              }}
            >
              <FileDown className="size-4" />
              خروجی گزارش
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Key Metrics Row ──────────────────────────────────────────────── */}
      <motion.div variants={slideFromBottom}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border-0 card-hover-lift"
            >
              <div className={`absolute inset-0 ${card.lightBg} opacity-50`} />
              <div className={`absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l ${card.gradient} gradient-border-animated`} />
              <CardContent className="relative p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    {loading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p className="text-2xl font-bold tabular-nums count-animate">{card.value}</p>
                    )}
                  </div>
                  <div className={`${card.iconBg} p-3 rounded-xl transition-transform duration-300 group-hover:scale-110`}>
                    <card.icon className={`h-6 w-6 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>

      {/* ── Lead Funnel ──────────────────────────────────────────────────── */}
      <motion.div variants={slideFromRight}>
        <Card className="border-0 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-amber-400 via-neutral-400 to-neutral-800 gradient-border-animated" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-foreground" />
              قیف لیدها
              {data && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">
                  {formatPersianNumber(data.leadFunnel.total)} لید
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : funnelData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mb-3 opacity-30" />
                <p>داده‌ای برای نمایش قیف لیدها وجود ندارد</p>
              </div>
            ) : (
              <ChartContainer config={funnelChartConfig} className="h-64 w-full">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tickFormatter={(v: number) => v.toLocaleString('fa-IR')} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" width={120} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={40}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`funnel-${index}`} fill={funnelColors[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Agent Performance + Source Effectiveness ─────────────────────── */}
      <motion.div variants={slideFromLeft}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Performance Table */}
          <Card className="border-0 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-neutral-500 to-neutral-800 gradient-border-animated" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-foreground" />
                عملکرد کارشناسان
                {data && data.agentPerformance.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">
                    {formatPersianNumber(data.agentPerformance.length)} نفر
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : !data?.agentPerformance || data.agentPerformance.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mb-3 opacity-30" />
                  <p>کارشناسی یافت نشد</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">نام</TableHead>
                        <TableHead className="text-right">لیدهای اختصاصی</TableHead>
                        <TableHead className="text-right">تبدیل شده</TableHead>
                        <TableHead className="text-right">نرخ تبدیل</TableHead>
                        <TableHead className="text-right">تعاملات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.agentPerformance.map((agent) => {
                        const rate = parseFloat(agent.conversionRate)
                        return (
                          <TableRow key={agent.id}>
                            <TableCell className="font-medium">{agent.name}</TableCell>
                            <TableCell>{formatPersianNumber(agent.totalAssigned)}</TableCell>
                            <TableCell>{formatPersianNumber(agent.converted)}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={getConversionRateBg(rate)}
                              >
                                {agent.conversionRate}٪
                              </Badge>
                            </TableCell>
                            <TableCell>{formatPersianNumber(agent.interactionsCount)}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Source Effectiveness */}
          <Card className="border-0 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-neutral-500 to-amber-400 gradient-border-animated" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5 text-foreground" />
                اثربخشی منابع لید
                {data && sourceData.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">
                    {formatPersianNumber(sourceData.length)} منبع
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Skeleton className="h-56 w-full rounded-lg" />
                </div>
              ) : sourceData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <ArrowUpRight className="h-12 w-12 mb-3 opacity-30" />
                  <p>داده‌ای برای نمایش منابع لید وجود ندارد</p>
                </div>
              ) : (
                <ChartContainer config={sourceChartConfig} className="h-72 w-full">
                  <BarChart data={sourceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="source" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v: number) => v.toLocaleString('fa-IR')} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {sourceData.map((entry, index) => {
                        const colorMap: Record<string, string> = {
                          website: 'var(--chart-5)',
                          manual: 'var(--chart-4)',
                          campaign: 'var(--chart-2)',
                          referral: 'var(--chart-1)',
                        }
                        return (
                          <Cell
                            key={`source-${index}`}
                            fill={colorMap[entry.sourceKey] || 'var(--chart-1)'}
                          />
                        )
                      })}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Course Analytics ─────────────────────────────────────────────── */}
      <motion.div variants={slideFromRight}>
        <Card className="border-0 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-neutral-500 to-neutral-800 gradient-border-animated" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-foreground" />
              تحلیل دوره‌ها
              {data && sortedCourses.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">
                  {formatPersianNumber(sortedCourses.length)} دوره
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-xl" />
                ))}
              </div>
            ) : sortedCourses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mb-3 opacity-30" />
                <p>دوره‌ای برای نمایش وجود ندارد</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedCourses.map((course) => {
                  const popularityPercent = Math.round(
                    (course.popularity / maxPopularity) * 100
                  )
                  return (
                    <div
                      key={course.id}
                      className="p-4 rounded-xl border border-border/50 bg-card hover:border-border dark:hover:border-border transition-all duration-200 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-sm leading-tight line-clamp-2">
                          {course.title}
                        </h3>
                        <Badge
                          variant={course.isActive ? 'default' : 'secondary'}
                          className="text-[10px] mr-2 shrink-0"
                        >
                          {course.isActive ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">قیمت</span>
                          <span className="font-medium">{formatPrice(course.price)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">ثبت‌نام</span>
                          <span className="font-medium">{formatPersianNumber(course.enrollmentCount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">لیدها</span>
                          <span className="font-medium">{formatPersianNumber(course.leadCount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">درآمد</span>
                          <span className="font-bold text-foreground dark:text-foreground">
                            {formatPrice(course.revenue)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>محبوبیت</span>
                          <span>{formatPersianNumber(popularityPercent)}٪</span>
                        </div>
                        <Progress
                          value={popularityPercent}
                          className="h-2 bg-muted/60 dark:bg-muted/20"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Monthly Enrollment Trend + Payment Distribution ──────────────── */}
      <motion.div variants={slideFromBottom}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Enrollment Trend */}
          <Card className="border-0 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-neutral-500 to-neutral-800 gradient-border-animated" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-foreground" />
                روند ماهانه ثبت‌نام
                {data && data.monthlyTrend.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">
                    {formatPersianNumber(data.monthlyTrend.length)} ماه
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Skeleton className="h-56 w-full rounded-lg" />
                </div>
              ) : !data?.monthlyTrend || data.monthlyTrend.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mb-3 opacity-30" />
                  <p>داده‌ای برای نمایش روند ماهانه وجود ندارد</p>
                </div>
              ) : (
                <ChartContainer config={monthlyChartConfig} className="h-72 w-full">
                  <LineChart data={data.monthlyTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthShort" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v: number) => v.toLocaleString('fa-IR')} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="var(--chart-1)"
                      strokeWidth={2.5}
                      dot={{ fill: 'var(--chart-1)', r: 5, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: 'var(--chart-1)', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {/* Payment Distribution */}
          <Card className="border-0 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-neutral-500 to-neutral-800 gradient-border-animated" />
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-foreground" />
                توزیع نوع پرداخت
                {data && data.paymentSummary.total > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">
                    {formatPersianNumber(data.paymentSummary.total)} پرداخت
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Skeleton className="h-56 w-56 rounded-full" />
                </div>
              ) : paymentData.length === 0 || (paymentData[0]?.value === 0 && paymentData[1]?.value === 0) ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <PieChartIcon className="h-12 w-12 mb-3 opacity-30" />
                  <p>داده‌ای برای نمایش توزیع پرداخت وجود ندارد</p>
                </div>
              ) : (
                <ChartContainer config={paymentChartConfig} className="h-72 w-full">
                  <PieChart>
                    <Pie
                      data={paymentData}
                      dataKey="value"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      strokeWidth={2}
                      stroke="var(--background)"
                    >
                      {paymentData.map((entry, index) => (
                        <Cell key={`payment-${index}`} fill={paymentColors[entry.key] || 'var(--chart-1)'} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )}
              {/* Payment summary stats */}
              {data && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="text-center p-3 rounded-lg bg-muted/60 dark:bg-muted/20">
                    <p className="text-lg font-bold text-foreground dark:text-foreground tabular-nums">
                      {formatPersianNumber(data.paymentSummary.paid)}
                    </p>
                    <p className="text-xs text-muted-foreground">پرداخت کامل</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/60 dark:bg-muted/20">
                    <p className="text-lg font-bold text-foreground dark:text-foreground tabular-nums">
                      {formatPersianNumber(data.paymentSummary.installment)}
                    </p>
                    <p className="text-xs text-muted-foreground">اقساطی</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* ── Revenue by Course ────────────────────────────────────────────── */}
      <motion.div variants={slideFromLeft}>
        <Card className="border-0 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-neutral-500 to-neutral-800 gradient-border-animated" />
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-foreground" />
              درآمد به تفکیک دوره
              {data && revenueByCourseData.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">
                  {formatPersianNumber(revenueByCourseData.length)} دوره
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : revenueByCourseData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mb-3 opacity-30" />
                <p>داده‌ای برای نمایش درآمد دوره‌ها وجود ندارد</p>
              </div>
            ) : (
              <ChartContainer config={revenueCourseChartConfig} className="h-80 w-full">
                <BarChart data={revenueByCourseData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickFormatter={(v: number) => v.toLocaleString('fa-IR')}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={140}
                    tick={{ fontSize: 11 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatPrice(value as number)}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="revenue" fill="var(--chart-1)" radius={[0, 6, 6, 0]} maxBarSize={32}>
                    {revenueByCourseData.map((_, index) => (
                      <Cell
                        key={`rev-${index}`}
                        fill={`url(#emeraldGradient)`}
                      />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
