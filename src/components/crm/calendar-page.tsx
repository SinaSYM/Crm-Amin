'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, ChevronRight, Phone, FileText, Settings2, CalendarDays, Clock, User, Plus, CheckCircle2, Trash2, Bell, Pencil
} from 'lucide-react'
import { toast } from 'sonner'

import { sanitizePersianDateInput, parseStoredDate } from '@/lib/persian-date'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// Types
interface LeadInfo {
  id: string
  first_name: string
  last_name: string
  phone_number?: string
  status?: string
}

type LeadOption = LeadInfo

interface AgentInfo {
  id: string
  first_name: string
  last_name: string
}

interface FollowupEvent {
  id: string
  interaction_type: 'CALL' | 'NOTE' | 'SYSTEM'
  content: string
  next_followup_date: string
  createdAt: string
  lead: LeadInfo
  agent: AgentInfo
}

interface TaskEvent {
  id: string
  title: string
  description?: string | null
  due_date: string
  status: string
  reminder_time?: number | null
  reminder_sent: boolean
  lead?: LeadInfo | null
}

// Interaction type config
const interactionConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string; dotColor: string; icon: React.ElementType }> = {
  CALL: { label: 'تماس', color: 'text-foreground dark:text-foreground', bgColor: 'bg-muted/60 dark:bg-muted/20', borderColor: 'border-border dark:border-border', dotColor: 'bg-muted/60', icon: Phone },
  NOTE: { label: 'یادداشت', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40', borderColor: 'border-amber-300 dark:border-amber-700', dotColor: 'bg-amber-500', icon: FileText },
  SYSTEM: { label: 'سیستم', color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-800/40', borderColor: 'border-slate-300 dark:border-slate-600', dotColor: 'bg-slate-500', icon: Settings2 },
}

// Persian day names for Shamsi calendar (Saturday first)
const persianDayNames = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']

// Persian month names
const persianMonthNames = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
]

// Jalali calendar conversion functions
function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy: number
  if (gy > 1600) {
    jy = 979
    gy -= 1600
  } else {
    jy = 0
    gy -= 621
  }
  const gy2 = gm > 2 ? gy + 1 : gy
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1]
  jy += 33 * Math.floor(days / 12053)
  days %= 12053
  jy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30)
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30)
  return [jy, jm, jd]
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number
  if (jy > 979) {
    gy = 1600
    jy -= 979
  } else {
    gy = 621
  }
  let days = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186)
  gy += 400 * Math.floor(days / 146097)
  days %= 146097
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524)
    days %= 36524
    if (days >= 365) days++
  }
  gy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    gy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  let gd = days + 1
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let gm: number
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm]
  }
  return [gy, gm, gd]
}

function isJalaliLeap(jy: number): boolean {
  const breaks = [1, 5, 9, 13, 17, 22, 26, 30]
  const cycle = jy % 33
  return breaks.includes(cycle)
}

function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return isJalaliLeap(jy) ? 30 : 29
}

// Get the day of week (0=Saturday in our scheme) for the 1st of a Jalali month
function getJalaliFirstDayOfWeek(jy: number, jm: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1)
  const date = new Date(gy, gm - 1, gd)
  // JS: 0=Sunday, 6=Saturday. We want 0=Saturday
  return (date.getDay() + 1) % 7
}

// Format date in Persian
function formatPersianDate(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatPersianShort(date: Date): string {
  return new Intl.DateTimeFormat('fa-IR', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

// Convert Persian numerals
function toPersianNum(n: number): string {
  return n.toLocaleString('fa-IR')
}

// Main component
export default function CalendarPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<FollowupEvent[]>([])
  const [tasks, setTasks] = useState<TaskEvent[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [selectedDay, setSelectedDay] = useState<[number, number, number] | null>(null)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createDialogDate, setCreateDialogDate] = useState<Date | null>(null)
  const [savingTask, setSavingTask] = useState(false)

  // Task form state
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskHour, setTaskHour] = useState('09')
  const [taskMinute, setTaskMinute] = useState('00')
  const [taskReminder, setTaskReminder] = useState('none')
  const [taskLeadId, setTaskLeadId] = useState('none')

  // Lead Edit form state
  const [editLeadDialogOpen, setEditLeadDialogOpen] = useState(false)
  const [editLeadId, setEditLeadId] = useState<string | null>(null)
  const [editLeadLoading, setEditLeadLoading] = useState(false)
  const [editLeadSaving, setEditLeadSaving] = useState(false)
  const [editLeadForm, setEditLeadForm] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    status: 'NEW',
    notes: '',
    next_followup_date: '',
  })

  // Open Edit Lead dialog
  const handleOpenEditLead = async (leadId: string) => {
    setEditLeadId(leadId)
    setEditLeadLoading(true)
    setEditLeadDialogOpen(true)
    try {
      const res = await fetch(`/api/leads/${leadId}`)
      if (res.ok) {
        const lead = await res.json()
        const latestFollowup = lead.interactions?.find((i: { next_followup_date?: string | null }) => i.next_followup_date)?.next_followup_date
        let formattedFollowup = ''
        if (latestFollowup) {
          try {
            // parseStoredDate repairs legacy rows saved with a Jalali date in
            // a Gregorian-only field (e.g. "1405-06-23").
            const d = parseStoredDate(latestFollowup)
            if (d) {
              const year = d.getFullYear()
              const month = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              const hours = String(d.getHours()).padStart(2, '0')
              const minutes = String(d.getMinutes()).padStart(2, '0')
              formattedFollowup = `${year}-${month}-${day}T${hours}:${minutes}`
            }
          } catch { /* ignore */ }
        }

        setEditLeadForm({
          first_name: lead.first_name || '',
          last_name: lead.last_name || '',
          phone_number: lead.phone_number || '',
          status: lead.status || 'NEW',
          notes: lead.notes || '',
          next_followup_date: formattedFollowup,
        })
      } else {
        toast.error('خطا در بارگذاری اطلاعات لید')
      }
    } catch {
      toast.error('خطا در بارگذاری اطلاعات لید')
    } finally {
      setEditLeadLoading(false)
    }
  }

  // Save Edit Lead
  const handleSaveEditLead = async () => {
    if (!editLeadId) return
    setEditLeadSaving(true)
    try {
      const res = await fetch(`/api/leads/${editLeadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: editLeadForm.first_name,
          last_name: editLeadForm.last_name,
          phone_number: editLeadForm.phone_number,
          status: editLeadForm.status,
          notes: editLeadForm.notes,
          // Sanitize: Persian-locale date pickers emit Jalali year strings
          // (e.g. "1405-06-23") which must be converted before saving.
          next_followup_date: sanitizePersianDateInput(editLeadForm.next_followup_date) || null,
        }),
      })

      if (res.ok) {
        toast.success('اطلاعات لید با موفقیت ویرایش شد')
        setEditLeadDialogOpen(false)
        fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || 'خطا در ویرایش لید')
      }
    } catch {
      toast.error('خطا در ذخیره‌سازی')
    } finally {
      setEditLeadSaving(false)
    }
  }


  // Current displayed month/year (Jalali)
  const today = useMemo(() => {
    const now = new Date()
    const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate())
    return { jy, jm, jd, gregorian: now }
  }, [])

  const [displayYear, setDisplayYear] = useState(today.jy)
  const [displayMonth, setDisplayMonth] = useState(today.jm)
  const [direction, setDirection] = useState<'left' | 'right'>('left')

  // Fetch follow-up events AND tasks
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [interRes, taskRes, leadRes] = await Promise.all([
        fetch('/api/interactions?has_followup=true'),
        fetch('/api/tasks'),
        fetch('/api/leads?limit=100'),
      ])
      if (interRes.ok) {
        const data = await interRes.json()
        setEvents(data.filter((e: FollowupEvent) => e.next_followup_date))
      }
      if (taskRes.ok) {
        const data = await taskRes.json()
        setTasks(Array.isArray(data) ? data : data.tasks || [])
      }
      if (leadRes.ok) {
        const data = await leadRes.json()
        setLeads(Array.isArray(data) ? data : data.leads || [])
      }
    } catch {
      toast.error('خطا در دریافت اطلاعات')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calendar grid computation
  const calendarDays = useMemo(() => {
    const monthDays = getJalaliMonthDays(displayYear, displayMonth)
    const firstDay = getJalaliFirstDayOfWeek(displayYear, displayMonth)

    // Previous month days for padding
    const prevMonth = displayMonth === 1 ? 12 : displayMonth - 1
    const prevYear = displayMonth === 1 ? displayYear - 1 : displayYear
    const prevMonthDays = getJalaliMonthDays(prevYear, prevMonth)

    const days: Array<{ jy: number; jm: number; jd: number; isCurrentMonth: boolean; isToday: boolean; gregorian: Date }> = []

    // Fill previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const jd = prevMonthDays - i
      const [gy, gm, gd] = jalaliToGregorian(prevYear, prevMonth, jd)
      days.push({
        jy: prevYear,
        jm: prevMonth,
        jd,
        isCurrentMonth: false,
        isToday: prevYear === today.jy && prevMonth === today.jm && jd === today.jd,
        gregorian: new Date(gy, gm - 1, gd),
      })
    }

    // Current month
    for (let jd = 1; jd <= monthDays; jd++) {
      const [gy, gm, gd] = jalaliToGregorian(displayYear, displayMonth, jd)
      days.push({
        jy: displayYear,
        jm: displayMonth,
        jd,
        isCurrentMonth: true,
        isToday: displayYear === today.jy && displayMonth === today.jm && jd === today.jd,
        gregorian: new Date(gy, gm - 1, gd),
      })
    }

    // Fill next month padding to complete 6 rows (42 cells)
    const nextMonth = displayMonth === 12 ? 1 : displayMonth + 1
    const nextYear = displayMonth === 12 ? displayYear + 1 : displayYear
    const remaining = 42 - days.length
    for (let jd = 1; jd <= remaining; jd++) {
      const [gy, gm, gd] = jalaliToGregorian(nextYear, nextMonth, jd)
      days.push({
        jy: nextYear,
        jm: nextMonth,
        jd,
        isCurrentMonth: false,
        isToday: nextYear === today.jy && nextMonth === today.jm && jd === today.jd,
        gregorian: new Date(gy, gm - 1, gd),
      })
    }

    return days
  }, [displayYear, displayMonth, today])

  // Local (not UTC) YYYY-MM-DD key — toISOString() shifts the date for
  // timezones ahead of UTC (e.g. Asia/Tehran), placing events on the wrong day.
  const localDateKey = useCallback((d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }, [])

  // Group events by date. Rows saved with a Jalali date string in the
  // Gregorian field (e.g. "1405-06-23") are repaired via parseStoredDate so
  // they land on the correct calendar day instead of never matching.
  const eventsByDate = useMemo(() => {
    const map = new Map<string, FollowupEvent[]>()
    events.forEach((event) => {
      const parsed = parseStoredDate(event.next_followup_date)
      if (!parsed) return
      const dateStr = localDateKey(parsed)
      if (!map.has(dateStr)) { map.set(dateStr, []) }
      map.get(dateStr)!.push(event)
    })
    return map
  }, [events, localDateKey])

  // Group tasks by date (same repair + local-key handling as events).
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskEvent[]>()
    tasks.forEach((task) => {
      const parsed = parseStoredDate(task.due_date)
      if (!parsed) return
      const dateStr = localDateKey(parsed)
      if (!map.has(dateStr)) { map.set(dateStr, []) }
      map.get(dateStr)!.push(task)
    })
    return map
  }, [tasks, localDateKey])

  // Get events for a specific day
  const getEventsForDay = useCallback((gregorian: Date) => {
    return eventsByDate.get(localDateKey(gregorian)) || []
  }, [eventsByDate, localDateKey])

  // Get tasks for a specific day
  const getTasksForDay = useCallback((gregorian: Date) => {
    return tasksByDate.get(localDateKey(gregorian)) || []
  }, [tasksByDate, localDateKey])

  // Upcoming tasks
  const upcomingTasks = useMemo(() => {
    const now = new Date(); now.setHours(0, 0, 0, 0)
    return tasks
      .filter(t => t.status === 'PENDING' && new Date(t.due_date) >= now)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 10)
  }, [tasks])

  // Open create task dialog
  const openCreateDialog = (day: { jy: number; jm: number; jd: number; gregorian: Date }) => {
    const [gy, gm, gd] = jalaliToGregorian(day.jy, day.jm, day.jd)
    setCreateDialogDate(new Date(gy, gm - 1, gd))
    setTaskTitle(''); setTaskDesc(''); setTaskHour('09'); setTaskMinute('00')
    setTaskReminder('none'); setTaskLeadId('none')
    setCreateDialogOpen(true)
  }

  const handleCreateTask = async () => {
    if (!taskTitle.trim() || !createDialogDate) { toast.error('عنوان وظیفه الزامی است'); return }
    setSavingTask(true)
    try {
      const dueDate = new Date(createDialogDate)
      dueDate.setHours(parseInt(taskHour), parseInt(taskMinute), 0, 0)
      const reminderMap: Record<string, number | null> = { 'none': null, '15': 15, '60': 60, '1440': 1440 }
      const body: Record<string, unknown> = {
        title: taskTitle.trim(),
        description: taskDesc.trim() || null,
        due_date: dueDate.toISOString(),
        reminder_time: reminderMap[taskReminder] ?? null,
      }
      if (taskLeadId && taskLeadId !== 'none') body.lead_id = taskLeadId
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'خطا') }
      toast.success('وظیفه ایجاد شد')
      setCreateDialogOpen(false)
      fetchData()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'خطا در ایجاد وظیفه')
    } finally {
      setSavingTask(false)
    }
  }

  const toggleTaskStatus = async (task: TaskEvent) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: task.status === 'PENDING' ? 'COMPLETED' : 'PENDING' }),
      })
      if (!res.ok) throw new Error()
      toast.success(task.status === 'PENDING' ? 'وظیفه تکمیل شد' : 'وضعیت تغییر کرد')
      fetchData()
    } catch { toast.error('خطا در بروزرسانی') }
  }

  const deleteTask = async (id: string) => {
    if (!confirm('آیا از حذف این وظیفه مطمئن هستید؟')) return
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('وظیفه حذف شد')
      fetchData()
    } catch { toast.error('خطا در حذف') }
  }

  // Upcoming follow-ups (sorted by date, future only)
  const upcomingFollowups = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return events
      .filter((e) => new Date(e.next_followup_date) >= now)
      .sort((a, b) => new Date(a.next_followup_date).getTime() - new Date(b.next_followup_date).getTime())
      .slice(0, 20)
  }, [events])


  // Navigation
  const goToPrevMonth = () => {
    setDirection('right')
    if (displayMonth === 1) {
      setDisplayMonth(12)
      setDisplayYear(displayYear - 1)
    } else {
      setDisplayMonth(displayMonth - 1)
    }
  }

  const goToNextMonth = () => {
    setDirection('left')
    if (displayMonth === 12) {
      setDisplayMonth(1)
      setDisplayYear(displayYear + 1)
    } else {
      setDisplayMonth(displayMonth + 1)
    }
  }

  const goToToday = () => {
    setDirection(today.jy > displayYear || (today.jy === displayYear && today.jm > displayMonth) ? 'left' : 'right')
    setDisplayYear(today.jy)
    setDisplayMonth(today.jm)
  }

  // Selected day events
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return []
    const [gy, gm, gd] = jalaliToGregorian(selectedDay[0], selectedDay[1], selectedDay[2])
    const date = new Date(gy, gm - 1, gd)
    return getEventsForDay(date)
  }, [selectedDay, getEventsForDay])

  const slideVariants = {
    enter: (dir: 'left' | 'right') => ({
      x: dir === 'left' ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: 'left' | 'right') => ({
      x: dir === 'left' ? -40 : 40,
      opacity: 0,
    }),
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 42 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="size-6 text-foreground" />
            تقویم پیگیری‌ها
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            مشاهده پیگیری‌های پیش‌رو در تقویم شمسی
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevMonth}
            className="h-9 w-9"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="gap-1.5 text-sm font-semibold min-w-[120px]"
          >
            <CalendarDays className="size-4 text-foreground" />
            {persianMonthNames[displayMonth - 1]} {toPersianNum(displayYear)}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextMonth}
            className="h-9 w-9"
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      </div>

      {/* Calendar + Side Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-3">
          <CardContent className="p-3 sm:p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {persianDayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`${displayYear}-${displayMonth}`}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="grid grid-cols-7 gap-1"
              >
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDay(day.gregorian)
                  const dayTasks = getTasksForDay(day.gregorian)
                  const isToday = day.isToday
                  const isSelected = selectedDay && selectedDay[0] === day.jy && selectedDay[1] === day.jm && selectedDay[2] === day.jd

                  return (
                    <Popover key={index} open={!!isSelected && popoverOpen && (dayEvents.length > 0 || dayTasks.length > 0)} onOpenChange={(open) => {
                      if (!open) {
                        setPopoverOpen(false)
                        setSelectedDay(null)
                      }
                    }}>
                      <PopoverTrigger asChild>
                        <button
                          onClick={() => {
                            if (dayEvents.length > 0 || dayTasks.length > 0) {
                              setSelectedDay([day.jy, day.jm, day.jd])
                              setPopoverOpen(true)
                            } else {
                              setSelectedDay([day.jy, day.jm, day.jd])
                              setPopoverOpen(false)
                            }
                          }}
                          onDoubleClick={() => openCreateDialog(day)}
                          className={`
                            relative min-h-[80px] sm:min-h-[100px] p-1.5 sm:p-2 rounded-lg border text-right transition-all duration-200
                            ${day.isCurrentMonth
                              ? 'bg-card border-border'
                              : 'bg-muted/30 border-transparent'
                            }
                            ${isToday
                              ? 'ring-2 ring-foreground/30 ring-offset-1 ring-offset-background'
                              : ''
                            }
                            ${isSelected && (dayEvents.length > 0 || dayTasks.length > 0)
                              ? 'border-border bg-muted/60 dark:bg-muted/20'
                              : ''
                            }
                            hover:bg-muted/50 dark:hover:bg-muted/50
                          `}
                        >
                          <span className={`
                            text-sm font-medium
                            ${isToday
                              ? 'text-foreground dark:text-foreground font-bold'
                              : day.isCurrentMonth
                                ? 'text-foreground'
                                : 'text-muted-foreground/50'
                            }
                          `}>
                            {toPersianNum(day.jd)}
                          </span>

                          {/* Event/Task dots */}
                          {(dayEvents.length > 0 || dayTasks.length > 0) && (
                            <div className="mt-1 flex flex-wrap gap-0.5">
                              {dayEvents.slice(0, 3).map((event, ei) => {
                                const config = interactionConfig[event.interaction_type]
                                return (
                                  <span
                                    key={ei}
                                    className={`size-2 rounded-full ${config.dotColor}`}
                                    title={config.label}
                                  />
                                )
                              })}
                              {dayTasks.map((_, ti) => (
                                <span key={`t${ti}`} className="size-2 rounded-full bg-muted/60" title="وظیفه" />
                              ))}
                            </div>
                          )}
                        </button>
                      </PopoverTrigger>

                      {/* Day events + tasks popover */}
                      {(dayEvents.length > 0 || dayTasks.length > 0) && (
                        <PopoverContent className="w-80 p-0" align="center" side="bottom">
                          <div className="p-3 border-b bg-muted/30">
                            <p className="font-semibold text-sm">
                              {formatPersianDate(day.gregorian)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {toPersianNum(dayEvents.length + dayTasks.length)} مورد
                            </p>
                          </div>
                          <div className="max-h-64 overflow-y-auto pr-2">
                            <div className="p-2 space-y-1.5">
                              {dayEvents.map((event) => {
                                const config = interactionConfig[event.interaction_type]
                                const Icon = config.icon
                                return (
                                  <div
                                    key={event.id}
                                    className={`p-2.5 rounded-lg border ${config.borderColor} ${config.bgColor} transition-colors`}
                                  >
                                    <div className="flex items-center gap-2 mb-1">
                                      <Icon className={`size-3.5 ${config.color}`} />
                                      <Badge variant="outline" className={`text-[10px] px-1.5 ${config.color} border-current/20`}>
                                        {config.label}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground mr-auto">
                                        {event.lead.first_name} {event.lead.last_name}
                                      </span>
                                    </div>
                                    <p className="text-xs text-foreground/80 line-clamp-2 mb-1">
                                      {event.content}
                                    </p>
                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                                      <User className="size-3" />
                                      <span>{event.agent.first_name} {event.agent.last_name}</span>
                                      {event.lead?.id && (
                                        <button
                                          onClick={() => handleOpenEditLead(event.lead.id)}
                                          className="mr-auto text-foreground hover:text-foreground flex items-center gap-0.5 font-medium transition-colors"
                                          title="ویرایش اطلاعات لید"
                                        >
                                          <Pencil className="size-2.5" />
                                          ویرایش لید
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                              {/* Task items */}
                              {dayTasks.map((task) => (
                                <div key={task.id} className={`p-2.5 rounded-lg border ${task.status === 'COMPLETED' ? 'border-gray-200 bg-gray-50 dark:bg-gray-900/20' : 'border-border bg-muted/60 dark:bg-muted/20'}`}>
                                  <div className="flex items-center gap-2">
                                    <Bell className="size-3.5 text-foreground" />
                                    <span className={`text-xs flex-1 ${task.status === 'COMPLETED' ? 'line-through text-muted-foreground' : 'font-medium'}`}>{task.title}</span>
                                    {task.lead?.id && (
                                      <button
                                        onClick={() => handleOpenEditLead(task.lead!.id)}
                                        className="text-foreground hover:text-foreground p-1 rounded hover:bg-muted/50 transition-colors"
                                        title="ویرایش اطلاعات لید"
                                      >
                                        <Pencil className="size-3" />
                                      </button>
                                    )}
                                    <button onClick={() => toggleTaskStatus(task)} className="text-foreground hover:text-foreground">
                                      <CheckCircle2 className="size-4" />
                                    </button>
                                    <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-700">
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </div>
                                  {task.description && <p className="text-[11px] text-muted-foreground mt-1">{task.description}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        </PopoverContent>
                      )}
                    </Popover>
                  )
                })}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Right Side Panel - Upcoming Follow-ups */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="size-4 text-foreground" />
              پیگیری‌های پیش‌رو
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {upcomingFollowups.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <CalendarDays className="size-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">پیگیری پیش‌رویی وجود ندارد</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto pr-2">
                <div className="p-3 space-y-2">
                  {upcomingFollowups.map((event) => {
                    const config = interactionConfig[event.interaction_type]
                    const Icon = config.icon
                    const followupDate = new Date(event.next_followup_date)
                    const now = new Date()
                    now.setHours(0, 0, 0, 0)
                    const diffMs = followupDate.getTime() - now.getTime()
                    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                    let timeLabel = ''
                    let timeColor = 'text-muted-foreground'
                    if (diffDays <= 0) {
                      timeLabel = 'امروز'
                      timeColor = 'text-foreground font-semibold'
                    } else if (diffDays === 1) {
                      timeLabel = 'فردا'
                      timeColor = 'text-amber-600 font-semibold'
                    } else if (diffDays <= 7) {
                      timeLabel = `${toPersianNum(diffDays)} روز دیگر`
                      timeColor = 'text-muted-foreground'
                    } else {
                      timeLabel = formatPersianShort(followupDate)
                    }

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`p-3 rounded-lg border ${config.borderColor} hover:shadow-md transition-shadow cursor-default`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 p-1.5 rounded-md ${config.bgColor}`}>
                            <Icon className={`size-3.5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-sm font-medium truncate">
                                {event.lead.first_name} {event.lead.last_name}
                              </span>
                              <span className={`text-[10px] whitespace-nowrap ${timeColor}`}>
                                {timeLabel}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                              {event.content}
                            </p>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${config.color} border-current/20`}>
                                {config.label}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <User className="size-2.5" />
                                {event.agent.first_name} {event.agent.last_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks sidebar */}
      {upcomingTasks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="size-4 text-foreground" />
              وظایف پیش‌رو
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="p-3 space-y-2">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/60 dark:bg-muted/20">
                <Bell className="size-4 text-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(task.due_date).toLocaleString('fa-IR')}</p>
                </div>
                <button onClick={() => toggleTaskStatus(task)} className="text-foreground hover:text-foreground flex-shrink-0">
                  <CheckCircle2 className="size-4" />
                </button>
                <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:text-red-700 flex-shrink-0">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create Task Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-foreground" />
              ایجاد وظیفه جدید
            </DialogTitle>
            <DialogDescription>
              {createDialogDate && `تاریخ: ${formatPersianDate(createDialogDate)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>عنوان وظیفه *</Label>
              <Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="مثلاً: تماس با مشتری" />
            </div>
            <div className="space-y-1.5">
              <Label>توضیحات</Label>
              <textarea
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                rows={3}
                placeholder="توضیحات اختیاری..."
                className="w-full rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>ساعت</Label>
                <Select value={taskHour} onValueChange={setTaskHour}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(h => (
                      <SelectItem key={h} value={h}>{toPersianNum(Number(h))}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>دقیقه</Label>
                <Select value={taskMinute} onValueChange={setTaskMinute}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['00', '15', '30', '45'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>یادآور</Label>
              <Select value={taskReminder} onValueChange={setTaskReminder}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون یادآور</SelectItem>
                  <SelectItem value="15">۱۵ دقیقه قبل</SelectItem>
                  <SelectItem value="60">۱ ساعت قبل</SelectItem>
                  <SelectItem value="1440">۲۴ ساعت قبل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>لید مرتبط (اختیاری)</Label>
              <Select value={taskLeadId} onValueChange={setTaskLeadId}>
                <SelectTrigger><SelectValue placeholder="انتخاب لید" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون لید</SelectItem>
                  {leads.slice(0, 50).map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>{lead.first_name} {lead.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={savingTask}>انصراف</Button>
            <Button onClick={handleCreateTask} disabled={savingTask} className="bg-foreground text-background hover:bg-foreground/85 min-w-[100px]">
              {savingTask ? 'در حال ذخیره...' : 'ایجاد وظیفه'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={editLeadDialogOpen} onOpenChange={setEditLeadDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-foreground" />
              ویرایش اطلاعات لید
            </DialogTitle>
            <DialogDescription>
              اطلاعات لید را ویرایش کنید. تغییر تاریخ تماس، یک یادآور جدید در تقویم و سیستم ثبت خواهد کرد.
            </DialogDescription>
          </DialogHeader>

          {editLeadLoading ? (
            <div className="space-y-3 py-6">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>نام</Label>
                  <Input
                    value={editLeadForm.first_name}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, first_name: e.target.value })}
                    placeholder="نام"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>نام خانوادگی</Label>
                  <Input
                    value={editLeadForm.last_name}
                    onChange={(e) => setEditLeadForm({ ...editLeadForm, last_name: e.target.value })}
                    placeholder="نام خانوادگی"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>شماره تماس *</Label>
                <Input
                  value={editLeadForm.phone_number}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, phone_number: e.target.value })}
                  placeholder="شماره تماس"
                  dir="ltr"
                  className="text-right"
                />
              </div>

              <div className="space-y-1.5">
                <Label>وضعیت لید</Label>
                <Select
                  value={editLeadForm.status}
                  onValueChange={(v) => setEditLeadForm({ ...editLeadForm, status: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">جدید</SelectItem>
                    <SelectItem value="CONTACTED">تماس گرفته شده</SelectItem>
                    <SelectItem value="QUALIFIED">تایید صلاحیت شده</SelectItem>
                    <SelectItem value="LOST">ناموفق</SelectItem>
                    <SelectItem value="CONVERTED">ثبت‌نام شده</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>یادداشت‌ها</Label>
                <textarea
                  value={editLeadForm.notes}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, notes: e.target.value })}
                  rows={3}
                  placeholder="یادداشت..."
                  className="w-full rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label>تاریخ و ساعت تماس پیگیری بعدی (شمسی)</Label>
                <Input
                  type="datetime-local"
                  value={editLeadForm.next_followup_date}
                  onChange={(e) => setEditLeadForm({ ...editLeadForm, next_followup_date: sanitizePersianDateInput(e.target.value) ?? '' })}
                  className="text-right"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditLeadDialogOpen(false)} disabled={editLeadSaving}>انصراف</Button>
            <Button onClick={handleSaveEditLead} disabled={editLeadSaving || editLeadLoading} className="bg-foreground text-background hover:bg-foreground/85 min-w-[100px]">
              {editLeadSaving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Legend */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-6 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">راهنما:</span>
            {Object.entries(interactionConfig).map(([key, config]) => {
              const Icon = config.icon
              return (
                <div key={key} className="flex items-center gap-1.5">
                  <span className={`size-2.5 rounded-full ${config.dotColor}`} />
                  <Icon className={`size-3.5 ${config.color}`} />
                  <span className="text-xs text-muted-foreground">{config.label}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full ring-2 ring-foreground/30 ring-offset-1 ring-offset-background" />
              <span className="text-xs text-muted-foreground">امروز</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
