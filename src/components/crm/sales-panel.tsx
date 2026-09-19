'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Phone, FileText, RefreshCw, Clock, ChevronDown, ChevronUp,
  UserCheck, UserPlus, PhoneCall, StickyNote, CalendarDays, AlertCircle,
  TrendingUp, PhoneCall as PhoneCallIcon, Sparkles, Loader2, CheckCircle2,
  PlusCircle
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import { useCRMStore } from '@/lib/store'
import { sanitizePersianDateInput } from '@/lib/persian-date'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

// Types
type LeadStatus = 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'CONVERTED'

interface User {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface Course {
  id: string
  title: string
  price: number
}

interface Interaction {
  id: string
  interaction_type: 'CALL' | 'NOTE' | 'SYSTEM'
  content: string
  next_followup_date: string | null
  createdAt: string
  agent: { id: string; first_name: string; last_name: string }
  lead?: { id: string; first_name: string; last_name: string; phone_number: string; status: string }
}

interface Lead {
  id: string
  phone_number: string
  first_name: string
  last_name: string
  source: string
  status: LeadStatus
  notes: string
  score: number
  assigned_to_id: string | null
  target_course_id: string | null
  createdAt: string
  updatedAt: string
  assigned_to: User | null
  target_course: Course | null
  interactions: Interaction[]
  _count: { interactions: number }
}

// Status config
const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  NEW: { label: 'جدید', className: 'bg-muted/60 text-foreground border-border hover:bg-muted/50' },
  CONTACTED: { label: 'تماس گرفته شده', className: 'bg-muted/60 text-foreground border-border hover:bg-muted/50' },
  IN_PROGRESS: { label: 'در حال پیگیری', className: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100' },
  CONVERTED: { label: 'تبدیل شده', className: 'bg-muted/60 text-foreground border-border hover:bg-muted/50' },
}

const sourceLabels: Record<string, string> = {
  manual: 'دستی',
  website: 'سایت',
  campaign: 'کمپین',
}

const interactionTypeLabels: Record<string, string> = {
  CALL: 'تماس',
  NOTE: 'یادداشت',
  SYSTEM: 'سیستم',
}

// Status gradient border colors
const statusGradientColors: Record<LeadStatus, string> = {
  NEW: 'from-amber-400 to-amber-500',
  CONTACTED: 'from-neutral-500 to-neutral-800',
  IN_PROGRESS: 'from-neutral-500 to-neutral-800',
  CONVERTED: 'from-neutral-500 to-neutral-800',
}

// Score dot color helper
function getScoreDotInfo(score: number) {
  if (score >= 61) return { dotColor: 'bg-muted/60', textColor: 'text-foreground dark:text-foreground' }
  if (score >= 31) return { dotColor: 'bg-amber-500', textColor: 'text-amber-600 dark:text-amber-400' }
  return { dotColor: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400' }
}

function StatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('fa-IR')
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string) {
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

export default function SalesPanel() {
  // Data
  const { currentUser } = useCRMStore()
  const [leads, setLeads] = useState<Lead[]>([])
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentAgent, setCurrentAgent] = useState<User | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [availableAgents, setAvailableAgents] = useState<User[]>([])

  // UI State
  const [expandedLead, setExpandedLead] = useState<string | null>(null)
  const [leadInteractions, setLeadInteractions] = useState<Record<string, Interaction[]>>({})

  // Dialogs
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  // Form state
  const [interactionForm, setInteractionForm] = useState({
    interaction_type: 'NOTE' as 'CALL' | 'NOTE',
    content: '',
    next_followup_date: '' as string,
  })
  const [newStatus, setNewStatus] = useState<LeadStatus>('NEW')

  // AI Sales Coach State
  const [coachingAdvice, setCoachingAdvice] = useState<Record<string, string>>({})
  const [loadingCoach, setLoadingCoach] = useState<Record<string, boolean>>({})

  // Tasks State
  const [tasks, setTasks] = useState<any[]>([])
  const [newTaskDialogOpen, setNewTaskDialogOpen] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: '',
    due_date: '',
    lead_id: '',
  })
  const [submittingTask, setSubmittingTask] = useState(false)

  // Fetch tasks for agent
  const fetchTasks = useCallback(async (agentId: string) => {
    try {
      const res = await fetch(`/api/tasks?agent_id=${agentId}`)
      if (res.ok) {
        setTasks(await res.json())
      }
    } catch {
      // silent
    }
  }, [])

  // Fetch AI Coaching suggestions
  const handleFetchCoaching = async (leadId: string) => {
    setLoadingCoach((prev) => ({ ...prev, [leadId]: true }))
    try {
      const res = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      })
      if (res.ok) {
        const json = await res.json()
        setCoachingAdvice((prev) => ({ ...prev, [leadId]: json.text }))
      } else {
        toast.error('خطا در دریافت راهنمایی هوش مصنوعی')
      }
    } catch {
      toast.error('عدم اتصال به سرور هوش مصنوعی')
    } finally {
      setLoadingCoach((prev) => ({ ...prev, [leadId]: false }))
    }
  }

  // Toggle Task Status
  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'PENDING' ? 'COMPLETED' : 'PENDING'
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (res.ok) {
        toast.success('وضعیت تسک با موفقیت تغییر کرد')
        if (currentAgent) {
          fetchTasks(currentAgent.id)
        }
      } else {
        toast.error('خطا در تغییر وضعیت تسک')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    }
  }

  // Create Task
  const handleCreateTask = async () => {
    if (!currentAgent) return
    if (!taskForm.title.trim() || !taskForm.due_date) {
      toast.error('لطفاً عنوان و تاریخ تسک را وارد کنید')
      return
    }

    setSubmittingTask(true)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: currentAgent.id,
          lead_id: taskForm.lead_id || null,
          title: taskForm.title,
          due_date: new Date(taskForm.due_date).toISOString(),
        }),
      })

      if (res.ok) {
        toast.success('تسک با موفقیت ایجاد شد')
        setNewTaskDialogOpen(false)
        setTaskForm({ title: '', due_date: '', lead_id: '' })
        fetchTasks(currentAgent.id)
      } else {
        toast.error('خطا در ایجاد تسک')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    } finally {
      setSubmittingTask(false)
    }
  }

  // Whether the current user is an admin/manager viewing someone else's panel
  const isViewingOtherAgent = currentUser?.role !== 'SALES_AGENT'

  // Fetch current agent — use logged-in user if SALES_AGENT, otherwise first available
  const fetchCurrentAgent = useCallback(async () => {
    try {
      // If the logged-in user is a sales agent, use their ID
      if (currentUser?.role === 'SALES_AGENT' && currentUser.id) {
        setCurrentAgent({
          id: currentUser.id,
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          role: 'SALES_AGENT',
        })
        return currentUser.id
      }
      // Otherwise, fetch all SALES_AGENTs and default to first
      const res = await fetch('/api/users?role=SALES_AGENT')
      if (res.ok) {
        const agents: User[] = await res.json()
        setAvailableAgents(agents)
        if (agents.length > 0) {
          setCurrentAgent(agents[0])
          return agents[0].id
        }
      }
    } catch {
      // silent
    }
    return null
  }, [currentUser])

  // Fetch leads for agent
  const fetchLeads = useCallback(async (agentId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leads?assigned_to_id=${agentId}`)
      if (res.ok) {
        const data: Lead[] = await res.json()
        setLeads(data)
      }
    } catch {
      toast.error('خطا در دریافت لیدها')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch all interactions for agent
  const fetchInteractions = useCallback(async (agentId: string) => {
    try {
      const res = await fetch(`/api/interactions?agent_id=${agentId}`)
      if (res.ok) {
        const data: Interaction[] = await res.json()
        setInteractions(data)
      }
    } catch {
      // silent
    }
  }, [])

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/courses')
      if (res.ok) {
        setCourses(await res.json())
      }
    } catch {
      // silent
    }
  }, [])

  // Initialize
  useEffect(() => {
    const init = async () => {
      const agentId = await fetchCurrentAgent()
      if (agentId) {
        await Promise.all([
          fetchLeads(agentId),
          fetchInteractions(agentId),
          fetchTasks(agentId),
        ])
      }
      await fetchCourses()
    }
    init()
  }, [fetchCurrentAgent, fetchLeads, fetchInteractions, fetchTasks, fetchCourses])

  // Toggle expanded lead
  const toggleExpandLead = async (leadId: string) => {
    if (expandedLead === leadId) {
      setExpandedLead(null)
      return
    }
    setExpandedLead(leadId)

    // Fetch interactions if not cached
    if (!leadInteractions[leadId]) {
      try {
        const res = await fetch(`/api/interactions?lead_id=${leadId}`)
        if (res.ok) {
          const data = await res.json()
          setLeadInteractions((prev) => ({ ...prev, [leadId]: data }))
        }
      } catch {
        // silent
      }
    }
  }

  // Open interaction dialog
  const handleOpenInteraction = (lead: Lead, type: 'CALL' | 'NOTE') => {
    setSelectedLead(lead)
    setInteractionForm({
      interaction_type: type,
      content: '',
      next_followup_date: '',
    })
    setInteractionDialogOpen(true)
  }

  // Open status dialog
  const handleOpenStatus = (lead: Lead) => {
    setSelectedLead(lead)
    setNewStatus(lead.status)
    setStatusDialogOpen(true)
  }

  // Submit interaction
  const handleSubmitInteraction = async () => {
    if (!selectedLead || !currentAgent || !interactionForm.content.trim()) {
      toast.error('محتوای تعامل را وارد کنید')
      return
    }

    try {
      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          agent_id: currentAgent.id,
          interaction_type: interactionForm.interaction_type,
          content: interactionForm.content,
          next_followup_date: interactionForm.next_followup_date || null,
        }),
      })

      if (res.ok) {
        toast.success('تعامل با موفقیت ثبت شد')
        setInteractionDialogOpen(false)
        setInteractionForm({ interaction_type: 'NOTE', content: '', next_followup_date: '' })
        // Refresh data
        await Promise.all([
          fetchLeads(currentAgent.id),
          fetchInteractions(currentAgent.id),
        ])
        // Refresh cached interactions for this lead
        const intRes = await fetch(`/api/interactions?lead_id=${selectedLead.id}`)
        if (intRes.ok) {
          const data = await intRes.json()
          setLeadInteractions((prev) => ({ ...prev, [selectedLead.id]: data }))
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'خطا در ثبت تعامل')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    }
  }

  // Change status
  const handleChangeStatus = async () => {
    if (!selectedLead || !currentAgent) return

    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        toast.success('وضعیت لید با موفقیت تغییر کرد')
        setStatusDialogOpen(false)
        await Promise.all([
          fetchLeads(currentAgent.id),
          fetchInteractions(currentAgent.id),
        ])
      } else {
        const data = await res.json()
        toast.error(data.error || 'خطا در تغییر وضعیت')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    }
  }

  // Switch to a different agent (for admin/manager)
  const handleAgentSwitch = useCallback(async (agentId: string) => {
    const agent = availableAgents.find((a) => a.id === agentId)
    if (agent) {
      setCurrentAgent(agent)
      setLoading(true)
      await Promise.all([
        fetchLeads(agentId),
        fetchInteractions(agentId),
        fetchTasks(agentId),
      ])
    }
  }, [availableAgents, fetchLeads, fetchInteractions, fetchTasks])

  // Stats
  const myLeadsCount = leads.length
  const newLeadsCount = leads.filter((l) => l.status === 'NEW').length
  const convertedCount = leads.filter((l) => l.status === 'CONVERTED').length
  const needFollowupCount = interactions.filter(
    (i) => i.next_followup_date && new Date(i.next_followup_date) > new Date()
  ).length

  // Upcoming follow-ups
  const upcomingFollowups = interactions
    .filter((i) => i.next_followup_date && new Date(i.next_followup_date) > new Date())
    .sort((a, b) => new Date(a.next_followup_date!).getTime() - new Date(b.next_followup_date!).getTime())

  // Stats cards data
  const pendingFollowups = leads.filter((l) => l.status === 'CONTACTED' || l.status === 'IN_PROGRESS').length

  // Performance metrics
  const leadsConvertedThisMonth = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return leads.filter((l) => l.status === 'CONVERTED' && new Date(l.updatedAt) >= monthStart).length
  }, [leads])

  const totalCallsThisMonth = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return interactions.filter((i) => i.interaction_type === 'CALL' && new Date(i.createdAt) >= monthStart).length
  }, [interactions])

  const conversionTarget = 10 // Monthly target placeholder
  const conversionProgress = Math.min((leadsConvertedThisMonth / conversionTarget) * 100, 100)

  const statsCards = [
    {
      title: isViewingOtherAgent ? 'لیدهای کارشناس' : 'لیدهای من',
      value: myLeadsCount,
      icon: Users,
      color: 'text-foreground',
      bgColor: 'bg-muted/60 dark:bg-muted/20',
      gradient: 'from-neutral-500 to-neutral-800',
    },
    {
      title: 'تبدیل شده',
      value: convertedCount,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      gradient: 'from-neutral-500 to-green-500',
    },
    {
      title: 'در انتظار پیگیری',
      value: pendingFollowups,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      gradient: 'from-amber-500 to-neutral-800',
    },
    {
      title: 'لیدهای جدید',
      value: newLeadsCount,
      icon: UserPlus,
      color: 'text-foreground',
      bgColor: 'bg-muted/60 dark:bg-muted/20',
      gradient: 'from-neutral-500 to-neutral-800',
    },
  ]

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isViewingOtherAgent ? 'وضعیت کارشناسان فروش' : 'پنل کارشناس فروش'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {currentAgent
              ? isViewingOtherAgent
                ? `مشاهده پنل ${currentAgent.first_name} ${currentAgent.last_name}`
                : `خوش آمدید، ${currentAgent.first_name} ${currentAgent.last_name}`
              : 'در حال بارگذاری...'}
          </p>
        </div>
        {/* Agent Selector for Admin/Manager */}
        {isViewingOtherAgent && availableAgents.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">مشاهده پنل:</span>
            <Select value={currentAgent?.id || ''} onValueChange={handleAgentSwitch}>
              <SelectTrigger className="w-52 border-border dark:border-border focus:ring-foreground/30">
                <SelectValue placeholder="انتخاب کارشناس" />
              </SelectTrigger>
              <SelectContent>
                {availableAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.first_name} {agent.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Performance Metrics Section - عملکرد من */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-neutral-500 via-neutral-400 to-neutral-800" />
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="size-5 text-foreground" />
            {isViewingOtherAgent ? 'عملکرد کارشناس' : 'عملکرد من'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Leads converted this month */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 dark:from-neutral-500 dark:to-neutral-800 border border-border dark:border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-muted/60 dark:bg-muted/20">
                    <UserCheck className="size-4 text-foreground dark:text-foreground" />
                  </div>
                  <span className="text-xs font-medium text-foreground dark:text-foreground">لیدهای تبدیل شده</span>
                </div>
                <span className="text-lg font-bold text-foreground dark:text-foreground tabular-nums">
                  {leadsConvertedThisMonth.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-foreground dark:text-foreground">هدف ماهانه: {conversionTarget.toLocaleString('fa-IR')}</span>
                  <span className="text-foreground dark:text-foreground">{Math.round(conversionProgress)}٪</span>
                </div>
                <div className="h-2 bg-muted/60 dark:bg-muted/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-l from-neutral-500 to-neutral-800 rounded-full transition-all duration-700"
                    style={{ width: `${conversionProgress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Total calls made */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 dark:from-neutral-500 dark:to-neutral-800 border border-border dark:border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-muted/60 dark:bg-muted/20">
                    <PhoneCall className="size-4 text-foreground dark:text-foreground" />
                  </div>
                  <span className="text-xs font-medium text-foreground dark:text-foreground">تماس‌های این ماه</span>
                </div>
                <span className="text-lg font-bold text-foreground dark:text-foreground tabular-nums">
                  {totalCallsThisMonth.toLocaleString('fa-IR')}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Phone className="size-3 text-foreground" />
                <span className="text-[10px] text-foreground dark:text-foreground">میانگین پاسخ‌دهی: مناسب</span>
              </div>
            </div>

            {/* Average response time placeholder */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border border-amber-200/50 dark:border-amber-800/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center size-8 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">میانگین زمان پاسخ</span>
                </div>
                <span className="text-lg font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                  ۲ ساعت
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Clock className="size-3 text-amber-500" />
                <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">سرعت پاسخ‌دهی: خوب</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="card-hover-lift relative overflow-hidden">
              <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-l ${stat.gradient || 'from-neutral-500 to-neutral-800'}`} />
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1 count-animate">{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-3 rounded-xl`}>
                    <stat.icon className={`size-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* My Leads Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isViewingOtherAgent ? 'لیدهای کارشناس' : 'لیدهای من'}
            <Badge variant="secondary" className="text-xs">
              {leads.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            {isViewingOtherAgent
              ? 'لیست لیدهای اختصاص داده شده به این کارشناس'
              : 'لیست لیدهای اختصاص داده شده به شما'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="size-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="inline-flex items-center justify-center size-20 rounded-full bg-gradient-to-br from-neutral-500 to-neutral-800 dark:from-neutral-500 dark:to-neutral-800 mb-4">
                <Users className="size-10 opacity-30" />
              </div>
              <p className="text-lg font-medium">لیدی اختصاص داده نشده</p>
              <p className="text-sm mt-1">هنوز لیدی به شما اختصاص داده نشده است</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {leads.map((lead) => (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    layout
                    className="border rounded-lg overflow-hidden relative"
                  >
                    {/* Gradient top border based on status */}
                    <div className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-l ${statusGradientColors[lead.status]}`} />
                    {/* Lead Header Row */}
                    <div
                      className="flex items-center gap-3 p-4 hover:bg-muted/50 dark:hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => toggleExpandLead(lead.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">
                            {lead.first_name} {lead.last_name}
                          </span>
                          {/* Lead score indicator */}
                          {(() => {
                            const scoreInfo = getScoreDotInfo(lead.score || 0)
                            return (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${scoreInfo.textColor}`}>
                                <span className={`size-2 rounded-full ${scoreInfo.dotColor}`} />
                                {lead.score || 0}
                              </span>
                            )
                          })()}
                          <StatusBadge status={lead.status} />
                          {lead.target_course && (
                            <Badge variant="outline" className="text-xs">
                              {lead.target_course.title}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 font-mono" dir="ltr">
                          {lead.phone_number}
                        </p>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Quick Dial Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info(`تماس با ${lead.first_name} ${lead.last_name}...`)}
                          title="تماس"
                          className="h-8 w-8 p-0 text-foreground hover:text-foreground hover:bg-muted/50"
                        >
                          <Phone className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenInteraction(lead, 'CALL')}
                          title="ثبت تماس"
                          className="h-8 w-8 p-0 text-foreground hover:text-foreground hover:bg-muted/50"
                        >
                          <PhoneCall className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenInteraction(lead, 'NOTE')}
                          title="افزودن یادداشت"
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <StickyNote className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenStatus(lead)}
                          title="تغییر وضعیت"
                          className="h-8 w-8 p-0 text-foreground hover:text-foreground hover:bg-muted/50"
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                      </div>

                      {/* Expand/Collapse */}
                      <div className="mr-1">
                        {expandedLead === lead.id ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {expandedLead === lead.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t bg-muted/30 p-4 space-y-3">
                            {/* Lead Details */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">منبع</p>
                                <p>{sourceLabels[lead.source] || lead.source}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">تاریخ ثبت</p>
                                <p>{formatDate(lead.createdAt)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">تعداد تعاملات</p>
                                <p>{lead._count?.interactions || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">دوره هدف</p>
                                <p>{lead.target_course?.title || '—'}</p>
                              </div>
                            </div>

                            {lead.notes && (
                              <div className="text-sm">
                                <p className="text-xs text-muted-foreground mb-1">
                                  {lead.source === 'diagnostic_bot' ? 'تحلیل عارضه‌یاب هوشمند کسب‌وکار' : 'یادداشت'}
                                </p>
                                {lead.source === 'diagnostic_bot' ? (
                                  <div className="bg-muted/60 dark:bg-muted/20 p-4 rounded-xl border border-border dark:border-border text-foreground dark:text-foreground">
                                    <div className="text-[10px] font-semibold text-foreground dark:text-foreground mb-2 flex items-center gap-1">
                                      <Sparkles className="size-3.5 animate-pulse" />
                                      عارضه‌یاب هوشمند (هوش مصنوعی جمینی)
                                    </div>
                                    <div className="prose dark:prose-invert max-w-none text-xs leading-relaxed text-foreground/90 space-y-1">
                                      <ReactMarkdown
                                        components={{
                                          h1: ({node, ...props}) => <h1 className="text-xs font-bold text-foreground dark:text-foreground mt-2 mb-1 border-b pb-0.5" {...props} />,
                                          h2: ({node, ...props}) => <h2 className="text-[11px] font-bold text-foreground dark:text-foreground mt-1.5 mb-1" {...props} />,
                                          p: ({node, ...props}) => <p className="mb-1 text-xs" {...props} />,
                                          ul: ({node, ...props}) => <ul className="list-disc pr-4 mb-1.5 space-y-0.5" {...props} />,
                                          ol: ({node, ...props}) => <ol className="list-decimal pr-4 mb-1.5 space-y-0.5" {...props} />,
                                          li: ({node, ...props}) => <li className="text-[11px]" {...props} />,
                                        }}
                                      >
                                        {lead.notes.replace(/--- گزارش عارضه‌یاب کسب‌وکار.*---/, '').trim()}
                                      </ReactMarkdown>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="bg-muted p-2 rounded mt-1 whitespace-pre-wrap">{lead.notes}</p>
                                )}
                              </div>
                            )}

                            <Separator />

                            {/* Interaction History */}
                            <div>
                              <h5 className="text-sm font-medium mb-2">تاریخچه تعاملات</h5>
                              {leadInteractions[lead.id] ? (
                                leadInteractions[lead.id].length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-2">
                                    تعاملی ثبت نشده
                                  </p>
                                ) : (
                                  <div className="max-h-48 scroll-container pr-2">
                                    <div className="scroll-indicator-top" />
                                    <div className="space-y-2">
                                      {leadInteractions[lead.id].map((int) => (
                                        <div
                                          key={int.id}
                                          className="flex items-start gap-2 p-2 rounded bg-background text-sm"
                                        >
                                          <div className="mt-0.5">
                                            {int.interaction_type === 'CALL' ? (
                                              <Phone className="size-3.5 text-foreground" />
                                            ) : int.interaction_type === 'NOTE' ? (
                                              <FileText className="size-3.5 text-amber-600" />
                                            ) : (
                                              <RefreshCw className="size-3.5 text-gray-500" />
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                              <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                {interactionTypeLabels[int.interaction_type]}
                                              </Badge>
                                              <span className="text-[10px] text-muted-foreground" dir="ltr">
                                                {formatDateTime(int.createdAt)}
                                              </span>
                                            </div>
                                            <p className="text-xs break-words">{int.content}</p>
                                            {int.next_followup_date && (
                                              <p className="text-[10px] text-foreground mt-0.5">
                                                پیگیری: {formatDate(int.next_followup_date)}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="scroll-indicator-bottom" />
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center justify-center py-3">
                                  <RefreshCw className="size-4 animate-spin text-muted-foreground" />
                                </div>
                              )}
                            </div>

                            <Separator />

                            {/* AI Sales Coach section */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h5 className="text-sm font-semibold text-foreground flex items-center gap-1">
                                  <Sparkles className="size-4 text-foreground" />
                                  راهنمای هوش مصنوعی (AI Sales Coach)
                                </h5>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs border-border hover:bg-muted/50 text-foreground"
                                  onClick={() => handleFetchCoaching(lead.id)}
                                  disabled={loadingCoach[lead.id]}
                                >
                                  {loadingCoach[lead.id] ? (
                                    <>
                                      <Loader2 className="size-3 animate-spin mr-1" />
                                      تحلیل...
                                    </>
                                  ) : coachingAdvice[lead.id] ? (
                                    <>
                                      <RefreshCw className="size-3 mr-1" />
                                      بروزرسانی تحلیل
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="size-3 mr-1" />
                                      تحلیل پرونده و مشاوره
                                    </>
                                  )}
                                </Button>
                              </div>

                              {coachingAdvice[lead.id] ? (
                                <div className="p-3.5 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 dark:from-neutral-500 dark:to-neutral-800 border border-border dark:border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                                  {coachingAdvice[lead.id]}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  با کلیک روی دکمه بالا، هوش مصنوعی پرونده لید و تاریخچه مکالمات او را تحلیل کرده و راهنمای آموزشی ۳ گام به همراه گام بعدی پیشنهادی را ارائه می‌کند.
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2-Column Section: Follow-ups + Daily Tasks Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Follow-ups */}
        <Card className="h-[400px] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="size-5 text-amber-600" />
              پیگیری‌های پیش رو
            </CardTitle>
            <CardDescription>لیست پیگیری‌هایی که در آینده برنامه‌ریزی شده‌اند</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            {upcomingFollowups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarDays className="size-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">پیگیری پیش رو وجود ندارد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingFollowups.map((followup) => (
                  <motion.div
                    key={followup.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      <AlertCircle className="size-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {followup.lead?.first_name || '—'} {followup.lead?.last_name || ''}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {interactionTypeLabels[followup.interaction_type]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 break-words">
                        {followup.content}
                      </p>
                      <p className="text-xs text-foreground mt-1 font-medium">
                        تاریخ پیگیری: {formatDate(followup.next_followup_date!)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Task Scheduler (Daily Checklist) */}
        <Card className="h-[400px] flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="size-5 text-foreground" />
                لیست کارهای روزانه
              </CardTitle>
              <CardDescription>برنامه یادآوری تماس و فعالیت‌های روز کارشناس</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setTaskForm({ title: '', due_date: '', lead_id: '' })
                setNewTaskDialogOpen(true)
              }}
       className="bg-foreground text-background hover:bg-foreground/85 gap-1 h-8"
            >
              <PlusCircle className="size-3.5" /> افزودن کار
            </Button>
          </CardHeader>
          <CardContent className="flex-1 scroll-container min-h-0">
            <div className="scroll-indicator-top" />
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="size-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">کار روزانه‌ای برنامه‌ریزی نشده است</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isCompleted = task.status === 'COMPLETED'
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
                        isCompleted
                          ? 'bg-muted/60 border-border dark:bg-muted/20 dark:border-border opacity-60'
                          : 'hover:border-border hover:bg-muted/50'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleTaskStatus(task.id, task.status)}
                        className={`mt-0.5 rounded-full size-5 border flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-muted/60 border-border text-foreground'
                            : 'border-muted-foreground/40 hover:border-border'
                        }`}
                      >
                        {isCompleted && <CheckCircle2 className="size-3" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {task.title}
                        </span>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">
                            مهلت: {formatDate(task.due_date)}
                          </span>
                          {task.lead && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              لید: {task.lead.first_name} {task.lead.last_name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
            <div className="scroll-indicator-bottom" />
          </CardContent>
        </Card>
      </div>

      {/* Add Interaction Dialog */}
      <Dialog open={interactionDialogOpen} onOpenChange={setInteractionDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {interactionForm.interaction_type === 'CALL' ? (
                <>
                  <PhoneCall className="size-5 text-foreground" />
                  ثبت تماس
                </>
              ) : (
                <>
                  <StickyNote className="size-5 text-amber-600" />
                  افزودن یادداشت
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              برای لید {selectedLead?.first_name} {selectedLead?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>نوع تعامل</Label>
              <Select
                value={interactionForm.interaction_type}
                onValueChange={(val) =>
                  setInteractionForm({ ...interactionForm, interaction_type: val as 'CALL' | 'NOTE' })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">تماس</SelectItem>
                  <SelectItem value="NOTE">یادداشت</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="int-content">محتوا *</Label>
              <Textarea
                id="int-content"
                value={interactionForm.content}
                onChange={(e) => setInteractionForm({ ...interactionForm, content: e.target.value })}
                placeholder={interactionForm.interaction_type === 'CALL' ? 'خلاصه تماس...' : 'یادداشت...'}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>تاریخ پیگیری بعدی</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 text-right"
                  >
                    <CalendarDays className="size-4" />
                    {interactionForm.next_followup_date
                      ? formatDate(interactionForm.next_followup_date)
                      : 'انتخاب تاریخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      interactionForm.next_followup_date
                        ? new Date(interactionForm.next_followup_date)
                        : undefined
                    }
                    onSelect={(date) =>
                      setInteractionForm({
                        ...interactionForm,
                        next_followup_date: date ? date.toISOString() : '',
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setInteractionDialogOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleSubmitInteraction}
       className="bg-foreground text-background hover:bg-foreground/85 gap-2"
              disabled={!interactionForm.content.trim()}
            >
              {interactionForm.interaction_type === 'CALL' ? (
                <PhoneCall className="size-4" />
              ) : (
                <StickyNote className="size-4" />
              )}
              ثبت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>تغییر وضعیت لید</DialogTitle>
            <DialogDescription>
              وضعیت لید {selectedLead?.first_name} {selectedLead?.last_name} را تغییر دهید
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>وضعیت فعلی</Label>
              <div>{selectedLead && <StatusBadge status={selectedLead.status} />}</div>
            </div>
            <div className="space-y-2">
              <Label>وضعیت جدید</Label>
              <Select
                value={newStatus}
                onValueChange={(val) => setNewStatus(val as LeadStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleChangeStatus}
       className="bg-foreground text-background hover:bg-foreground/85 "
            >
              تغییر وضعیت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={newTaskDialogOpen} onOpenChange={setNewTaskDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>افزودن کار روزانه جدید</DialogTitle>
            <DialogDescription>یک فعالیت یادآور برای خود ثبت کنید تا در برنامه کاری شما قرار گیرد.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="task-title">عنوان کار *</Label>
              <Input
                id="task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="مثال: تماس پیگیری ثبت‌نام نهایی"
              />
            </div>
            <div className="space-y-2">
              <Label>لید مرتبط (اختیاری)</Label>
              <Select
                value={taskForm.lead_id}
                onValueChange={(val) => setTaskForm({ ...taskForm, lead_id: val === 'none' ? '' : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب لید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">هیچکدام</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.first_name} {l.last_name} ({l.phone_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-date">تاریخ و زمان مهلت *</Label>
              <Input
                id="task-date"
                type="datetime-local"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm({ ...taskForm, due_date: sanitizePersianDateInput(e.target.value) ?? '' })}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setNewTaskDialogOpen(false)} disabled={submittingTask}>
              انصراف
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={submittingTask}
       className="bg-foreground text-background hover:bg-foreground/85 gap-1.5"
            >
              {submittingTask && <Loader2 className="size-3.5 animate-spin" />}
              ایجاد تسک
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
