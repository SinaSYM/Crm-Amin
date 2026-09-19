'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

import { sanitizePersianDateInput } from '@/lib/persian-date'
import { motion, AnimatePresence } from 'framer-motion'
import EmptyState from '@/components/crm/empty-state'
import PaginationFooter from '@/components/crm/pagination-footer'
import {
  Phone,
  FileText,
  Settings,
  PlusCircle,
  MessageSquare,
  CalendarClock,
  Filter,
  ArrowLeft,
  Clock,
  Download,
  BarChart3,
} from 'lucide-react'

interface Interaction {
  id: string
  lead_id: string
  agent_id: string
  interaction_type: 'CALL' | 'NOTE' | 'SYSTEM'
  content: string
  next_followup_date: string | null
  createdAt: string
  updatedAt: string
  lead: {
    id: string
    first_name: string
    last_name: string
    phone_number: string
  }
  agent: {
    id: string
    first_name: string
    last_name: string
  }
}

interface LeadOption {
  id: string
  first_name: string
  last_name: string
  phone_number: string
}

interface AgentOption {
  id: string
  first_name: string
  last_name: string
}

const typeLabels: Record<string, string> = {
  CALL: 'تماس',
  NOTE: 'یادداشت',
  SYSTEM: 'سیستم',
}

const typeIcons: Record<string, React.ElementType> = {
  CALL: Phone,
  NOTE: FileText,
  SYSTEM: Settings,
}

const typeColors: Record<string, { bg: string; border: string; icon: string; text: string; dot: string; gradient: string; leftBorder: string }> = {
  CALL: {
    bg: 'bg-muted/50 dark:bg-muted/20',
    border: 'border-border',
    icon: 'text-foreground',
    text: 'text-foreground',
    dot: 'bg-foreground shadow-neutral-300 dark:shadow-neutral-800',
    gradient: 'from-neutral-700 to-neutral-900',
    leftBorder: 'var(--chart-1)',
  },
  NOTE: {
    bg: 'bg-muted/40 dark:bg-muted/15',
    border: 'border-border',
    icon: 'text-foreground/80',
    text: 'text-foreground',
    dot: 'bg-neutral-500 shadow-neutral-300 dark:shadow-neutral-800',
    gradient: 'from-neutral-400 to-neutral-600',
    leftBorder: 'var(--chart-4)',
  },
  SYSTEM: {
    bg: 'bg-muted/30 dark:bg-muted/10',
    border: 'border-border',
    icon: 'text-muted-foreground',
    text: 'text-muted-foreground',
    dot: 'bg-neutral-400 shadow-neutral-200 dark:shadow-neutral-800',
    gradient: 'from-neutral-300 to-neutral-500',
    leftBorder: 'var(--chart-3)',
  },
}

const getRelativeTime = (dateStr: string): string => {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return 'همین الان'
  if (diffMinutes < 60) return `${diffMinutes.toLocaleString('fa-IR')} دقیقه پیش`
  if (diffHours < 24) return `${diffHours.toLocaleString('fa-IR')} ساعت پیش`
  if (diffDays < 7) return `${diffDays.toLocaleString('fa-IR')} روز پیش`
  return formatPersianDate(dateStr)
}

const isRecent = (dateStr: string): boolean => {
  const now = new Date()
  const date = new Date(dateStr)
  return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000
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

const INTERACTIONS_PER_PAGE = 15

export default function InteractionsPage() {
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [agents, setAgents] = useState<AgentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Filters
  const [filterLeadId, setFilterLeadId] = useState<string>('all')
  const [filterAgentId, setFilterAgentId] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Form state
  const [formLeadId, setFormLeadId] = useState('')
  const [formType, setFormType] = useState<string>('CALL')
  const [formContent, setFormContent] = useState('')
  const [formFollowupDate, setFormFollowupDate] = useState('')

  // Summary stats
  const stats = useMemo(() => {
    const calls = interactions.filter((i) => i.interaction_type === 'CALL').length
    const notes = interactions.filter((i) => i.interaction_type === 'NOTE').length
    const upcomingFollowups = interactions.filter((i) => {
      if (!i.next_followup_date) return false
      return new Date(i.next_followup_date) > new Date()
    }).length
    return { total: interactions.length, calls, notes, upcomingFollowups }
  }, [interactions])

  useEffect(() => {
    setCurrentPage(1)
  }, [filterLeadId, filterAgentId, filterType])

  const paginatedInteractions = useMemo(
    () => interactions.slice((currentPage - 1) * INTERACTIONS_PER_PAGE, currentPage * INTERACTIONS_PER_PAGE),
    [interactions, currentPage]
  )

  const fetchInteractions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterLeadId && filterLeadId !== 'all') {
        params.set('lead_id', filterLeadId)
      }
      if (filterAgentId && filterAgentId !== 'all') {
        params.set('agent_id', filterAgentId)
      }
      if (filterType && filterType !== 'all') {
        params.set('interaction_type', filterType)
      }
      const res = await fetch(`/api/interactions?${params.toString()}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setInteractions(data)
    } catch {
      toast.error('خطا در بارگذاری تعاملات')
    } finally {
      setLoading(false)
    }
  }, [filterLeadId, filterAgentId, filterType])

  const fetchOptions = useCallback(async () => {
    try {
      const [leadsRes, agentsRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/users?role=SALES_AGENT'),
      ])
      if (leadsRes.ok) {
        const leadsData = await leadsRes.json()
        setLeads(
          leadsData.map((l: { id: string; first_name: string; last_name: string; phone_number: string }) => ({
            id: l.id,
            first_name: l.first_name,
            last_name: l.last_name,
            phone_number: l.phone_number,
          }))
        )
      }
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json()
        setAgents(
          agentsData.map((a: { id: string; first_name: string; last_name: string }) => ({
            id: a.id,
            first_name: a.first_name,
            last_name: a.last_name,
          }))
        )
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  useEffect(() => {
    fetchInteractions()
  }, [fetchInteractions])

  const openCreateDialog = () => {
    setFormLeadId('')
    setFormType('CALL')
    setFormContent('')
    setFormFollowupDate('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formLeadId || !formContent.trim()) {
      toast.error('لطفاً لید و محتوای تعامل را وارد کنید')
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        lead_id: formLeadId,
        interaction_type: formType,
        content: formContent.trim(),
      }
      if (formFollowupDate) {
        payload.next_followup_date = new Date(formFollowupDate).toISOString()
      }

      // Find first available agent as the current agent
      const agentId = agents.length > 0 ? agents[0].id : null
      if (agentId) {
        payload.agent_id = agentId
      }

      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'خطا در ایجاد')
      }
      toast.success('تعامل با موفقیت ثبت شد')
      setDialogOpen(false)
      fetchInteractions()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'خطا در ذخیره‌سازی'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const res = await fetch('/api/interactions/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'interactions.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('فایل CSV با موفقیت دانلود شد')
    } catch {
      toast.error('خطا در دانلود فایل CSV')
    }
  }

  const formatPersianDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date)
    } catch {
      return dateStr
    }
  }

  const formatTimeOnly = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleTimeString('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const typeFilterTabs = [
    { key: 'all', label: 'همه', icon: MessageSquare, iconColor: 'text-foreground' },
    { key: 'CALL', label: 'تماس', icon: Phone, iconColor: 'text-foreground' },
    { key: 'NOTE', label: 'یادداشت', icon: FileText, iconColor: 'text-foreground/80' },
    { key: 'SYSTEM', label: 'سیستم', icon: Settings, iconColor: 'text-slate-500' },
  ] as const

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-foreground text-background shadow-md">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">تاریخچه تعاملات</h1>
            <p className="text-sm text-muted-foreground mt-0.5">مشاهده و ثبت تعاملات با لیدها</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="gap-2 border-border text-foreground hover:bg-muted dark:hover:bg-muted/50"
          >
            <Download className="size-4" />
            خروجی CSV
          </Button>
          <Button onClick={openCreateDialog} className="gap-2 bg-foreground text-background hover:bg-foreground/85 shadow-sm">
            <PlusCircle className="size-4" />
            افزودن تعامل
          </Button>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-center size-10 rounded-lg bg-muted">
            <BarChart3 className="size-5 text-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total.toLocaleString('fa-IR')}</p>
            <p className="text-xs text-muted-foreground">کل تعاملات</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-center size-10 rounded-lg bg-muted">
            <Phone className="size-5 text-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.calls.toLocaleString('fa-IR')}</p>
            <p className="text-xs text-muted-foreground">تماس‌ها</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-center size-10 rounded-lg bg-muted">
            <FileText className="size-5 text-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.notes.toLocaleString('fa-IR')}</p>
            <p className="text-xs text-muted-foreground">یادداشت‌ها</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-center size-10 rounded-lg bg-muted/60 dark:bg-muted/20">
            <Clock className="size-5 text-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground dark:text-foreground">{stats.upcomingFollowups.toLocaleString('fa-IR')}</p>
            <p className="text-xs text-muted-foreground">پیگیری آتی</p>
          </div>
        </div>
      </div>

      {/* Interaction Type Filter Tabs */}
      <div className="flex items-center gap-2">
        {typeFilterTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = filterType === tab.key
          return (
            <Button
              key={tab.key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType(tab.key)}
              className={`gap-1.5 ${isActive ? 'bg-foreground text-background hover:bg-foreground/85' : ''}`}
            >
              <Icon className={`size-3.5 ${!isActive ? tab.iconColor : ''}`} />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-foreground">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
              <Filter className="size-4" />
            </div>
            <span className="text-sm font-semibold">فیلترها</span>
          </div>

          <div className="w-48">
            <Label className="text-xs text-muted-foreground mb-1.5 block">لید</Label>
            <Select value={filterLeadId} onValueChange={setFilterLeadId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="همه لیدها" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه لیدها</SelectItem>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.first_name} {l.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-48">
            <Label className="text-xs text-muted-foreground mb-1.5 block">کارشناس</Label>
            <Select value={filterAgentId} onValueChange={setFilterAgentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="همه کارشناسان" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه کارشناسان</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.first_name} {a.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : interactions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="تعاملی یافت نشد"
          description="هنوز تعاملی در سیستم ثبت نشده است"
        />
      ) : (
        <div className="relative">
          {/* Gradient timeline line */}
          <div className="absolute right-[27px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-neutral-400 via-neutral-300 to-neutral-400 dark:from-neutral-600 dark:via-neutral-500 dark:to-neutral-600 rounded-full" />

          <AnimatePresence mode="popLayout">
            {paginatedInteractions.map((interaction, index) => {
              const IconComp = typeIcons[interaction.interaction_type] || Settings
              const colors = typeColors[interaction.interaction_type] || typeColors.SYSTEM
              const isLast = index === paginatedInteractions.length - 1
              const recent = isRecent(interaction.createdAt)

              return (
                <motion.div
                  key={interaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`relative flex gap-4 ${isLast ? 'pb-0' : 'pb-6'}`}
                >
                  {/* Timeline dot/icon */}
                  <div className="relative z-10 flex items-start pt-1">
                    <div className="relative">
                      {/* Pulse animation for recent items */}
                      {recent && (
                        <span className="absolute inset-0 rounded-full animate-ping bg-foreground/20" />
                      )}
                      <div
                        className={`relative flex size-14 shrink-0 items-center justify-center rounded-full border-2 ${colors.border} ${colors.bg} shadow-lg`}
                        style={{ boxShadow: '0 4px 14px -2px rgba(0,0,0,0.1)' }}
                      >
                        <div className={`flex items-center justify-center size-10 rounded-full bg-gradient-to-br ${colors.gradient} text-white shadow-inner`}>
                          <IconComp className="size-5" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content card with left border */}
                  <div
                    className="flex-1 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5"
                    style={{
                      borderInlineStartColor: colors.leftBorder,
                      borderInlineStartWidth: '4px',
                    }}
                  >
                    <div className={`${colors.bg} rounded-xl p-5`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Type badge and agent */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`${colors.border} ${colors.text} gap-1.5 font-medium`}
                            >
                              <IconComp className="size-3" />
                              {typeLabels[interaction.interaction_type]}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              توسط{' '}
                              <span className="font-semibold text-foreground">
                                {interaction.agent.first_name}{' '}
                                {interaction.agent.last_name}
                              </span>
                            </span>
                          </div>

                          {/* Lead info */}
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <ArrowLeft className="size-3.5 text-foreground" />
                            <span>
                              لید:{' '}
                              <span className="font-semibold text-foreground">
                                {interaction.lead.first_name}{' '}
                                {interaction.lead.last_name}
                              </span>
                            </span>
                          </div>

                          {/* Content */}
                          <div className={`rounded-lg p-3 bg-white/60 dark:bg-black/10 ${colors.text} text-sm leading-relaxed`}>
                            {interaction.content}
                          </div>

                          {/* Follow-up date */}
                          {interaction.next_followup_date && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <CalendarClock className="size-3.5 text-muted-foreground" />
                              <span>
                                پیگیری بعدی:{' '}
                                <span className="font-semibold">
                                  {formatPersianDate(
                                    interaction.next_followup_date
                                  )}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Date + Relative Time */}
                        <div className="shrink-0 text-left space-y-2">
                          {/* Relative time - prominent for recent */}
                          <div className={`text-xs font-semibold px-2 py-1 rounded-md ${
                            recent
                              ? 'bg-muted text-foreground'
                              : 'bg-muted/50 text-muted-foreground'
                          }`}>
                            {getRelativeTime(interaction.createdAt)}
                          </div>
                          <div className="text-xs font-medium text-foreground">
                            {formatPersianDate(interaction.createdAt)}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="size-3" />
                            {formatTimeOnly(interaction.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          <PaginationFooter
            currentPage={currentPage}
            totalItems={interactions.length}
            itemsPerPage={INTERACTIONS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Add Interaction Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl">افزودن تعامل جدید</DialogTitle>
            <DialogDescription>
              اطلاعات تعامل جدید را وارد کنید
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">لید</Label>
              <Select value={formLeadId} onValueChange={setFormLeadId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب لید" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.first_name} {l.last_name} - {l.phone_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">نوع تعامل</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب نوع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CALL">تماس</SelectItem>
                  <SelectItem value="NOTE">یادداشت</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="interaction_content" className="text-sm font-medium">محتوا</Label>
              <Textarea
                id="interaction_content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="متن تعامل را وارد کنید..."
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followup_date" className="text-sm font-medium">تاریخ پیگیری بعدی</Label>
              <Input
                id="followup_date"
                type="date"
                value={formFollowupDate}
                onChange={(e) => setFormFollowupDate(sanitizePersianDateInput(e.target.value) ?? '')}
                dir="ltr"
                className="text-right"
              />
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
              {saving ? 'در حال ذخیره...' : 'ثبت تعامل'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
