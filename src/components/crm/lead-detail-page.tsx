'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Phone, FileText, RefreshCw, UserPlus, PhoneCall,
  StickyNote, ChevronDown, CheckCircle2, XCircle, Clock,
  CalendarDays, User, BookOpen, MessageSquare, Sparkles,
  UserRoundCheck, Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

import { useCRMStore } from '@/lib/store'
import { parseStoredDate, formatJalaliDate, sanitizePersianDateInput } from '@/lib/persian-date'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import LeadConvertDialog from '@/components/crm/lead-convert-dialog'

// Types
type LeadStatus = 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'CONVERTED'
type InteractionType = 'CALL' | 'NOTE' | 'SYSTEM'

interface User {
  id: string
  first_name: string
  last_name: string
  role: string
  phone_number?: string
}

interface Course {
  id: string
  title: string
  price: number
}

interface Interaction {
  id: string
  interaction_type: InteractionType
  content: string
  next_followup_date: string | null
  createdAt: string
  agent: { id: string; first_name: string; last_name: string }
}

interface Lead {
  id: string
  phone_number: string
  first_name: string
  last_name: string
  source: string
  status: LeadStatus
  score: number
  notes: string
  assigned_to_id: string | null
  target_course_id: string | null
  createdAt: string
  updatedAt: string
  assigned_to: User | null
  target_course: Course | null
  interactions: Interaction[]
  _count?: { interactions: number }
}

interface ScoreBreakdown {
  hasName: number
  hasPhone: number
  sourceScore: number
  hasAgent: number
  hasCourse: number
  statusScore: number
  interactionScore: number
  hasFollowup: number
  hasNotes: number
  recentActivity: number
  total: number
}

interface ScoreData {
  lead_id: string
  score: number
  breakdown: ScoreBreakdown
}

// Status config
const statusConfig: Record<LeadStatus, { label: string; className: string; color: string }> = {
  NEW: { label: 'جدید', className: 'bg-muted/60 text-foreground border-border', color: 'blue' },
  CONTACTED: { label: 'تماس گرفته شده', className: 'bg-muted/60 text-foreground border-border', color: 'orange' },
  IN_PROGRESS: { label: 'در حال پیگیری', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', color: 'yellow' },
  CONVERTED: { label: 'تبدیل شده', className: 'bg-muted/60 text-foreground border-border', color: 'emerald' },
}

const sourceLabels: Record<string, string> = {
  manual: 'دستی',
  website: 'سایت',
  campaign: 'کمپین',
}

const interactionTypeConfig: Record<InteractionType, { label: string; icon: React.ElementType; color: string; bgClass: string; borderClass: string }> = {
  CALL: { label: 'تماس', icon: PhoneCall, color: 'emerald', bgClass: 'bg-muted/60 dark:bg-muted/20', borderClass: 'border-border dark:border-border' },
  NOTE: { label: 'یادداشت', icon: StickyNote, color: 'amber', bgClass: 'bg-amber-50 dark:bg-amber-950/30', borderClass: 'border-amber-300 dark:border-amber-700' },
  SYSTEM: { label: 'سیستم', icon: RefreshCw, color: 'slate', bgClass: 'bg-slate-50 dark:bg-slate-900/30', borderClass: 'border-slate-300 dark:border-slate-700' },
}

function formatDate(dateStr: string) {
  // parseStoredDate repairs legacy rows saved with a Jalali date string in a
  // Gregorian-only field, then formats in the Persian (Jalali) calendar.
  const d = parseStoredDate(dateStr)
  if (!d) return dateStr
  return formatJalaliDate(d)
}

function formatDateTime(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('fa-IR') + ' ' + d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

function getRelativeTime(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'همین الان'
  if (diffMins < 60) return `${diffMins.toLocaleString('fa-IR')} دقیقه پیش`
  if (diffHours < 24) return `${diffHours.toLocaleString('fa-IR')} ساعت پیش`
  if (diffDays < 30) return `${diffDays.toLocaleString('fa-IR')} روز پیش`
  return formatDate(dateStr)
}

function getScoreColor(score: number): { text: string; bg: string; stroke: string; ring: string } {
  if (score <= 30) return { text: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950/40', stroke: 'stroke-red-500', ring: 'ring-red-200' }
  if (score <= 60) return { text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-950/40', stroke: 'stroke-amber-500', ring: 'ring-amber-200' }
  return { text: 'text-foreground', bg: 'bg-muted/60 dark:bg-muted/20', stroke: 'stroke-foreground', ring: 'ring-foreground/30' }
}

function getScoreLabel(score: number): string {
  if (score <= 30) return 'ضعیف'
  if (score <= 60) return 'متوسط'
  return 'عالی'
}

// Score breakdown criteria labels
const breakdownLabels: Record<string, { label: string; maxScore: number }> = {
  hasName: { label: 'نام و نام خانوادگی', maxScore: 10 },
  hasPhone: { label: 'شماره تماس', maxScore: 5 },
  sourceScore: { label: 'کیفیت منبع', maxScore: 30 },
  hasAgent: { label: 'کارشناس اختصاصی', maxScore: 10 },
  hasCourse: { label: 'دوره هدف', maxScore: 10 },
  statusScore: { label: 'وضعیت لید', maxScore: 20 },
  interactionScore: { label: 'تعداد تعاملات', maxScore: 15 },
  hasFollowup: { label: 'پیگیری برنامه‌ریزی شده', maxScore: 5 },
  hasNotes: { label: 'یادداشت', maxScore: 5 },
  recentActivity: { label: 'فعالیت اخیر', maxScore: 5 },
}

// Circular Score Indicator
function CircularScore({ score, size = 120 }: { score: number; size?: number }) {
  const colors = getScoreColor(score)
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const [animatedProgress, setAnimatedProgress] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100)
    return () => clearTimeout(timer)
  }, [progress])

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={colors.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - animatedProgress}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${colors.text}`}>
          {score.toLocaleString('fa-IR')}
        </span>
        <span className="text-[10px] text-muted-foreground">از ۱۰۰</span>
      </div>
    </div>
  )
}

export default function LeadDetailPage({ leadId: leadIdProp }: { leadId?: string }) {
  const { selectedLeadId, setActiveView, setSelectedLeadId, currentUser } = useCRMStore()
  const leadId = leadIdProp || selectedLeadId

  // Data states
  const [lead, setLead] = useState<Lead | null>(null)
  const [scoreData, setScoreData] = useState<ScoreData | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [agents, setAgents] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState<LeadStatus>('NEW')

  // Interaction form
  const [interactionForm, setInteractionForm] = useState({
    interaction_type: 'CALL' as 'CALL' | 'NOTE',
    content: '',
    next_followup_date: '',
  })
  const [submittingInteraction, setSubmittingInteraction] = useState(false)

  // Fetch lead data
  const fetchLead = useCallback(async () => {
    if (!leadId) return
    setLoading(true)
    try {
      const [leadRes, scoreRes, interactionsRes, agentsRes] = await Promise.all([
        fetch(`/api/leads/${leadId}`),
        fetch(`/api/leads/${leadId}/score`),
        fetch(`/api/interactions?lead_id=${leadId}`),
        fetch('/api/users?role=SALES_AGENT'),
      ])

      if (leadRes.ok) {
        const leadData = await leadRes.json()
        setLead(leadData)
        setNewStatus(leadData.status)
      }
      if (scoreRes.ok) setScoreData(await scoreRes.json())
      if (interactionsRes.ok) setInteractions(await interactionsRes.json())
      if (agentsRes.ok) setAgents(await agentsRes.json())
    } catch {
      toast.error('خطا در دریافت اطلاعات لید')
    } finally {
      setLoading(false)
    }
  }, [leadId])

  useEffect(() => {
    fetchLead()
  }, [fetchLead])

  // Handle add interaction
  const handleAddInteraction = async () => {
    if (!lead || !interactionForm.content.trim()) {
      toast.error('محتوای تعامل را وارد کنید')
      return
    }

    const agentId = lead.assigned_to_id || agents[0]?.id || currentUser?.id
    if (!agentId) {
      toast.error('کارشناس فروش تعیین نشده است')
      return
    }

    setSubmittingInteraction(true)
    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: lead.id,
          agent_id: agentId,
          interaction_type: interactionForm.interaction_type,
          content: interactionForm.content,
          next_followup_date: interactionForm.next_followup_date || null,
        }),
      })

      if (res.ok) {
        toast.success('تعامل با موفقیت ثبت شد')
        setInteractionForm({ interaction_type: 'CALL', content: '', next_followup_date: '' })
        // Refresh all data
        fetchLead()
      } else {
        const data = await res.json()
        toast.error(data.error || 'خطا در ثبت تعامل')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    } finally {
      setSubmittingInteraction(false)
    }
  }

  // Handle status change
  const handleChangeStatus = async () => {
    if (!lead) return
    try {
      const res = await fetch(`/api/leads/${lead.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        toast.success('وضعیت لید با موفقیت تغییر کرد')
        setStatusDialogOpen(false)
        fetchLead()
      } else {
        const data = await res.json()
        toast.error(data.error || 'خطا در تغییر وضعیت')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    }
  }

  // Back navigation
  const handleBack = () => {
    setSelectedLeadId(null)
    setActiveView('leads')
  }

  if (!leadId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <div className="text-center space-y-4">
          <User className="size-16 mx-auto text-muted-foreground/40" />
          <p className="text-lg text-muted-foreground">لیدی انتخاب نشده است</p>
          <Button onClick={handleBack} variant="outline" className="gap-2">
            <ArrowRight className="size-4" />
            بازگشت به لیست لیدها
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        {/* Header skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        {/* Timeline skeleton */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" dir="rtl">
        <div className="text-center space-y-4">
          <XCircle className="size-16 mx-auto text-red-400" />
          <p className="text-lg text-muted-foreground">لید یافت نشد</p>
          <Button onClick={handleBack} variant="outline" className="gap-2">
            <ArrowRight className="size-4" />
            بازگشت به لیست لیدها
          </Button>
        </div>
      </div>
    )
  }

  const scoreColors = getScoreColor(lead.score ?? scoreData?.score ?? 0)

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="mt-1 h-9 w-9 shrink-0"
            title="بازگشت"
          >
            <ArrowRight className="size-5" />
          </Button>
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">
                {lead.first_name} {lead.last_name}
              </h1>
              <Badge variant="outline" className={statusConfig[lead.status].className}>
                {statusConfig[lead.status].label}
              </Badge>
              {/* Score badge */}
              <Badge className={`${scoreColors.bg} ${scoreColors.text} border-0`}>
                <Sparkles className="size-3 ml-1" />
                امتیاز: {(lead.score ?? scoreData?.score ?? 0).toLocaleString('fa-IR')} — {getScoreLabel(lead.score ?? scoreData?.score ?? 0)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="size-3.5" />
              <span dir="ltr">{lead.phone_number}</span>
              {lead.source && (
                <>
                  <span className="text-muted-foreground/40">|</span>
                  <span>منبع: {sourceLabels[lead.source] || lead.source}</span>
                </>
              )}
              <span className="text-muted-foreground/40">|</span>
              <span>ثبت: {formatDate(lead.createdAt)}</span>
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap mr-13 sm:mr-0">
          <Button
            onClick={() => setInteractionForm({ interaction_type: 'CALL', content: '', next_followup_date: '' })}
      className="bg-foreground text-background hover:bg-foreground/85 gap-2"
            size="sm"
          >
            <PhoneCall className="size-4" />
            ثبت تماس
          </Button>
          <Button
            onClick={() => setInteractionForm({ interaction_type: 'NOTE', content: '', next_followup_date: '' })}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <StickyNote className="size-4" />
            افزودن یادداشت
          </Button>
          <Button
            onClick={() => {
              setNewStatus(lead.status)
              setStatusDialogOpen(true)
            }}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <RefreshCw className="size-4" />
            تغییر وضعیت
          </Button>
          {lead.status !== 'CONVERTED' && (
            <Button
              onClick={() => setConvertDialogOpen(true)}
              variant="outline"
              className="gap-2 text-foreground border-border hover:bg-muted/50 dark:text-foreground dark:border-border dark:hover:bg-muted/50"
              size="sm"
            >
              <UserRoundCheck className="size-4" />
              تبدیل
            </Button>
          )}
        </div>
      </motion.div>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Personal Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <User className="size-4 text-foreground" />
                اطلاعات شخصی
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">نام</span>
                <span className="text-sm font-medium">{lead.first_name || '—'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">نام خانوادگی</span>
                <span className="text-sm font-medium">{lead.last_name || '—'}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">شماره تماس</span>
                <span className="text-sm font-medium font-mono" dir="ltr">{lead.phone_number}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">منبع</span>
                <Badge variant="outline" className="text-xs">
                  {sourceLabels[lead.source] || lead.source}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">تاریخ ثبت</span>
                <span className="text-sm font-medium">{formatDate(lead.createdAt)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assignment Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <UserPlus className="size-4 text-foreground" />
                تخصیص و دوره
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted/60 dark:bg-muted/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-foreground dark:text-foreground">
                    {lead.assigned_to
                      ? `${lead.assigned_to.first_name[0]}${lead.assigned_to.last_name[0]}`
                      : '—'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {lead.assigned_to
                      ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}`
                      : 'تخصیص داده نشده'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lead.assigned_to ? 'کارشناس فروش' : 'هنوز کارشناسی تعیین نشده'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-muted/60 dark:bg-muted/20 flex items-center justify-center shrink-0">
                  <BookOpen className="size-4 text-foreground dark:text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {lead.target_course?.title || 'دوره‌ای انتخاب نشده'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {lead.target_course
                      ? `${lead.target_course.price.toLocaleString('fa-IR')} تومان`
                      : '—'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">وضعیت فعلی</span>
                <Badge variant="outline" className={statusConfig[lead.status].className}>
                  {statusConfig[lead.status].label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">تعداد تعاملات</span>
                <span className="text-sm font-medium">
                  {interactions.length.toLocaleString('fa-IR')}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Score Visualization Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border-0 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-foreground" />
                امتیاز لید
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <CircularScore score={lead.score ?? scoreData?.score ?? 0} size={120} />
                <div className="text-center">
                  <p className={`text-lg font-bold ${scoreColors.text}`}>
                    {getScoreLabel(lead.score ?? scoreData?.score ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    کیفیت لید بر اساس اطلاعات و تعاملات
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Score Breakdown Card */}
      {scoreData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-foreground" />
                جزئیات امتیاز
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {Object.entries(breakdownLabels).map(([key, config]) => {
                  const value = scoreData.breakdown[key as keyof ScoreBreakdown] as number
                  const isZero = value === 0
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                        isZero
                          ? 'border-muted bg-muted/30'
                          : 'border-border dark:border-border bg-muted/60 dark:bg-muted/20'
                      }`}
                    >
                      {isZero ? (
                        <XCircle className="size-4 text-muted-foreground shrink-0" />
                      ) : (
                        <CheckCircle2 className="size-4 text-foreground shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground truncate">{config.label}</p>
                        <p className={`text-sm font-bold ${isZero ? 'text-muted-foreground' : 'text-foreground dark:text-foreground'}`}>
                          {value.toLocaleString('fa-IR')} / {config.maxScore.toLocaleString('fa-IR')}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Notes Card */}
      {lead.notes && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          {lead.source === 'diagnostic_bot' ? (
            <Card className="border-0 shadow-md bg-gradient-to-br from-neutral-500 via-background to-neutral-800 dark:from-neutral-500 dark:to-neutral-800 border-r-4 border-r-foreground">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-foreground dark:text-foreground flex items-center gap-2">
                  <Sparkles className="size-5 text-foreground dark:text-foreground" />
                  گزارش ارزیابی و عارضه‌یاب هوشمند کسب‌وکار
                </CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert prose-indigo max-w-none text-sm leading-relaxed">
                <div className="bg-background/80 dark:bg-background/40 backdrop-blur-sm p-5 rounded-xl border border-border dark:border-border shadow-inner">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-base font-bold text-foreground dark:text-foreground mt-4 mb-2 border-b pb-1 flex items-center gap-2" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-sm font-bold text-foreground dark:text-foreground mt-3 mb-2" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2.5 text-foreground/90 whitespace-pre-wrap" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pr-5 mb-3 space-y-1 text-foreground/80" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pr-5 mb-3 space-y-1 text-foreground/80" {...props} />,
                      li: ({node, ...props}) => <li className="text-sm" {...props} />,
                    }}
                  >
                    {lead.notes.replace(/--- گزارش عارضه‌یاب کسب‌وکار.*---/, '').trim()}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <FileText className="size-4 text-amber-600" />
                  یادداشت‌ها
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{lead.notes}</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Interaction Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <MessageSquare className="size-4 text-foreground" />
                تاریخچه تعاملات
                <Badge variant="secondary" className="text-xs">
                  {interactions.length.toLocaleString('fa-IR')}
                </Badge>
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add New Interaction Form */}
            <div className="p-4 rounded-xl border-2 border-dashed border-border dark:border-border bg-muted/60 dark:bg-muted/20 space-y-3">
              <div className="flex items-center gap-2">
                <Plus className="size-4 text-foreground" />
                <p className="text-sm font-semibold text-foreground dark:text-foreground">ثبت تعامل جدید</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select
                  value={interactionForm.interaction_type}
                  onValueChange={(val) => setInteractionForm({ ...interactionForm, interaction_type: val as 'CALL' | 'NOTE' })}
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">
                      <div className="flex items-center gap-2">
                        <PhoneCall className="size-3.5 text-foreground" />
                        تماس
                      </div>
                    </SelectItem>
                    <SelectItem value="NOTE">
                      <div className="flex items-center gap-2">
                        <StickyNote className="size-3.5 text-amber-600" />
                        یادداشت
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1">
                  <Textarea
                    placeholder="محتوای تعامل را وارد کنید..."
                    value={interactionForm.content}
                    onChange={(e) => setInteractionForm({ ...interactionForm, content: e.target.value })}
                    className="min-h-[60px] resize-none"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <CalendarDays className="size-4 text-muted-foreground" />
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">پیگیری بعدی:</Label>
                  <Input
                    type="date"
                    value={interactionForm.next_followup_date}
                    onChange={(e) => setInteractionForm({ ...interactionForm, next_followup_date: sanitizePersianDateInput(e.target.value) ?? '' })}
                    className="w-auto"
                    dir="ltr"
                  />
                </div>
                <Button
                  onClick={handleAddInteraction}
                  disabled={submittingInteraction || !interactionForm.content.trim()}
         className="bg-foreground text-background hover:bg-foreground/85 gap-2"
                  size="sm"
                >
                  {submittingInteraction ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  ثبت تعامل
                </Button>
              </div>
            </div>

            {/* Timeline */}
            {interactions.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="size-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">هنوز تعاملی ثبت نشده است</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto pr-2">
                <div className="space-y-1 pr-2">
                  <AnimatePresence mode="popLayout">
                    {interactions.map((interaction, index) => {
                      const typeConfig = interactionTypeConfig[interaction.interaction_type]
                      const TypeIcon = typeConfig.icon
                      return (
                        <motion.div
                          key={interaction.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.25, delay: index * 0.03 }}
                          className="relative flex gap-4 pb-4"
                        >
                          {/* Timeline connector */}
                          <div className="flex flex-col items-center">
                            <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${typeConfig.bgClass} border-2 ${typeConfig.borderClass}`}>
                              <TypeIcon className={`size-4 text-${typeConfig.color}-600`} />
                            </div>
                            {index < interactions.length - 1 && (
                              <div className="w-0.5 flex-1 bg-gradient-to-b from-muted to-transparent mt-1" />
                            )}
                          </div>

                          {/* Content */}
                          <div className={`flex-1 rounded-lg border ${typeConfig.borderClass} ${typeConfig.bgClass} p-3 min-w-0`}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                                  interaction.interaction_type === 'CALL'
                                    ? 'border-border text-foreground dark:text-foreground'
                                    : interaction.interaction_type === 'NOTE'
                                    ? 'border-amber-300 text-amber-700 dark:text-amber-400'
                                    : 'border-slate-300 text-slate-600 dark:text-slate-400'
                                }`}>
                                  {typeConfig.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {interaction.agent.first_name} {interaction.agent.last_name}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {getRelativeTime(interaction.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{interaction.content}</p>
                            {interaction.next_followup_date && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-foreground dark:text-foreground">
                                <Clock className="size-3" />
                                <span>پیگیری: {formatDate(interaction.next_followup_date)}</span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تغییر وضعیت لید</DialogTitle>
            <DialogDescription>
              وضعیت جدید را برای {lead.first_name} {lead.last_name} انتخاب کنید
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>وضعیت فعلی</Label>
              <Badge variant="outline" className={statusConfig[lead.status].className}>
                {statusConfig[lead.status].label}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label>وضعیت جدید</Label>
              <Select value={newStatus} onValueChange={(val) => setNewStatus(val as LeadStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(statusConfig) as LeadStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusConfig[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>انصراف</Button>
      <Button onClick={handleChangeStatus} className="bg-foreground text-background hover:bg-foreground/85 ">
              ذخیره تغییرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <LeadConvertDialog
        open={convertDialogOpen}
        onOpenChange={setConvertDialogOpen}
        lead={lead}
        onConverted={() => {
          setConvertDialogOpen(false)
          fetchLead()
        }}
      />
    </div>
  )
}
