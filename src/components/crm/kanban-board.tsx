'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Search,
  UserPlus,
  Phone,
  Clock,
  CheckCircle2,
  MoreHorizontal,
  Eye,
  PhoneCall,
  Inbox,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCRMStore } from '@/lib/store'

// ─── Types ───────────────────────────────────────────────────────────────────

type LeadStatus = 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'CONVERTED'

interface Lead {
  id: string
  phone_number: string
  first_name: string
  last_name: string
  source: string
  status: LeadStatus
  notes: string
  assigned_to_id: string | null
  target_course_id: string | null
  createdAt: string
  updatedAt: string
  assigned_to: { id: string; first_name: string; last_name: string; role: string } | null
  target_course: { id: string; title: string } | null
  _count: { interactions: number }
}

interface Agent {
  id: string
  first_name: string
  last_name: string
  role: string
}

interface Course {
  id: string
  title: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLUMN_CONFIG: Record<LeadStatus, {
  label: string
  icon: React.ElementType
  headerBg: string
  headerText: string
  headerBorder: string
  columnBg: string
  cardAccent: string
  countBg: string
  countText: string
  emptyIcon: string
}> = {
  NEW: {
    label: 'جدید',
    icon: UserPlus,
    headerBg: 'bg-muted/60 dark:bg-muted/20',
    headerText: 'text-foreground dark:text-foreground',
    headerBorder: 'border-border dark:border-border',
    columnBg: 'bg-muted/60 dark:bg-muted/20',
    cardAccent: 'border-r-neutral-400 dark:border-r-neutral-500',
    countBg: 'bg-muted/60 dark:bg-muted/20',
    countText: 'text-foreground dark:text-foreground',
    emptyIcon: 'text-foreground dark:text-foreground',
  },
  CONTACTED: {
    label: 'تماس گرفته شده',
    icon: Phone,
    headerBg: 'bg-amber-50 dark:bg-amber-950/40',
    headerText: 'text-amber-700 dark:text-amber-300',
    headerBorder: 'border-amber-200 dark:border-amber-800',
    columnBg: 'bg-amber-50/40 dark:bg-amber-950/20',
    cardAccent: 'border-r-amber-400 dark:border-r-amber-500',
    countBg: 'bg-amber-100 dark:bg-amber-900/60',
    countText: 'text-amber-700 dark:text-amber-300',
    emptyIcon: 'text-amber-300 dark:text-amber-700',
  },
  IN_PROGRESS: {
    label: 'در حال پیگیری',
    icon: Clock,
    headerBg: 'bg-yellow-50 dark:bg-yellow-950/40',
    headerText: 'text-yellow-700 dark:text-yellow-300',
    headerBorder: 'border-yellow-200 dark:border-yellow-800',
    columnBg: 'bg-yellow-50/40 dark:bg-yellow-950/20',
    cardAccent: 'border-r-yellow-400 dark:border-r-yellow-500',
    countBg: 'bg-yellow-100 dark:bg-yellow-900/60',
    countText: 'text-yellow-700 dark:text-yellow-300',
    emptyIcon: 'text-yellow-300 dark:text-yellow-700',
  },
  CONVERTED: {
    label: 'تبدیل شده',
    icon: CheckCircle2,
    headerBg: 'bg-muted/60 dark:bg-muted/20',
    headerText: 'text-foreground dark:text-foreground',
    headerBorder: 'border-border dark:border-border',
    columnBg: 'bg-muted/60 dark:bg-muted/20',
    cardAccent: 'border-r-foreground dark:border-r-neutral-300',
    countBg: 'bg-muted/60 dark:bg-muted/20',
    countText: 'text-foreground dark:text-foreground',
    emptyIcon: 'text-foreground dark:text-foreground',
  },
}

const COLUMNS: LeadStatus[] = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'CONVERTED']

const SOURCE_LABELS: Record<string, string> = {
  manual: 'دستی',
  website: 'سایت',
  campaign: 'کمپین',
  referral: 'معرفی',
}

const SOURCE_COLORS: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  website: 'bg-muted/60 text-foreground dark:bg-muted/20 dark:text-foreground',
  campaign: 'bg-muted/60 text-foreground dark:bg-muted/20 dark:text-foreground',
  referral: 'bg-muted/60 text-foreground dark:bg-muted/20 dark:text-foreground',
}

// ─── Droppable Column Wrapper ────────────────────────────────────────────────

function DroppableColumn({ status, children }: { status: LeadStatus; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
    data: { type: 'column', status },
  })

  return (
    <div
      ref={setNodeRef}
      className={`transition-colors duration-200 ${isOver ? 'ring-2 ring-foreground/30 ring-offset-2 rounded-xl' : ''}`}
    >
      {children}
    </div>
  )
}

// ─── Sortable Lead Card ──────────────────────────────────────────────────────

function SortableLeadCard({
  lead,
  onViewDetail,
  onChangeStatus,
  onLogCall,
}: {
  lead: Lead
  onViewDetail: (lead: Lead) => void
  onChangeStatus: (lead: Lead, newStatus: LeadStatus) => void
  onLogCall: (lead: Lead) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
  })

  const config = COLUMN_CONFIG[lead.status]

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0, scale: isDragging ? 1.03 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`group cursor-grab active:cursor-grabbing ${isDragging ? 'z-50 shadow-lg' : ''}`}
      {...attributes}
      {...listeners}
    >
      <Card
        className={`border-r-4 ${config.cardAccent} hover:shadow-md transition-all duration-200 py-0 gap-0 overflow-hidden`}
      >
        <CardContent className="p-3 space-y-2">
          {/* Header: Name + Actions */}
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">
                {lead.first_name} {lead.last_name}
              </p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5" dir="ltr">
                {lead.phone_number}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[160px]">
                <DropdownMenuItem onClick={() => onViewDetail(lead)} className="gap-2">
                  <Eye className="size-3.5 text-foreground" />
                  مشاهده جزئیات
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLogCall(lead)} className="gap-2">
                  <PhoneCall className="size-3.5 text-amber-600" />
                  ثبت تماس
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onChangeStatus(lead, 'NEW')}
                  disabled={lead.status === 'NEW'}
                  className="gap-2"
                >
                  <UserPlus className="size-3.5 text-foreground" />
                  جدید
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onChangeStatus(lead, 'CONTACTED')}
                  disabled={lead.status === 'CONTACTED'}
                  className="gap-2"
                >
                  <Phone className="size-3.5 text-amber-600" />
                  تماس گرفته شده
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onChangeStatus(lead, 'IN_PROGRESS')}
                  disabled={lead.status === 'IN_PROGRESS'}
                  className="gap-2"
                >
                  <Clock className="size-3.5 text-yellow-600" />
                  در حال پیگیری
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onChangeStatus(lead, 'CONVERTED')}
                  disabled={lead.status === 'CONVERTED'}
                  className="gap-2"
                >
                  <CheckCircle2 className="size-3.5 text-foreground" />
                  تبدیل شده
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Source Badge */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_COLORS[lead.source] || 'bg-gray-100 text-gray-700'}`}
            >
              {SOURCE_LABELS[lead.source] || lead.source}
            </span>
          </div>

          {/* Target Course */}
          {lead.target_course && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="truncate">{lead.target_course.title}</span>
            </div>
          )}

          {/* Agent + Interactions */}
          <div className="flex items-center justify-between text-xs">
            {lead.assigned_to ? (
              <span className="text-muted-foreground truncate">
                {lead.assigned_to.first_name} {lead.assigned_to.last_name}
              </span>
            ) : (
              <span className="text-muted-foreground/50 italic">بدون کارشناس</span>
            )}
            {lead._count.interactions > 0 && (
              <span className="flex items-center gap-0.5 text-muted-foreground shrink-0">
                <MessageSquare className="size-3" />
                {lead._count.interactions}
              </span>
            )}
          </div>

          {/* Notes Preview */}
          {lead.notes && (
            <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
              {lead.notes}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Drag Overlay Card ───────────────────────────────────────────────────────

function DragOverlayCard({ lead }: { lead: Lead }) {
  const config = COLUMN_CONFIG[lead.status]
  return (
    <Card
      className={`border-r-4 ${config.cardAccent} shadow-xl py-0 gap-0 w-72 opacity-95 rotate-1 overflow-hidden`}
    >
      <CardContent className="p-3 space-y-2">
        <p className="font-semibold text-sm text-foreground">
          {lead.first_name} {lead.last_name}
        </p>
        <p className="font-mono text-xs text-muted-foreground" dir="ltr">
          {lead.phone_number}
        </p>
      </CardContent>
    </Card>
  )
}

// ─── Column Component ────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  leads,
  onViewDetail,
  onChangeStatus,
  onLogCall,
}: {
  status: LeadStatus
  leads: Lead[]
  onViewDetail: (lead: Lead) => void
  onChangeStatus: (lead: Lead, newStatus: LeadStatus) => void
  onLogCall: (lead: Lead) => void
}) {
  const config = COLUMN_CONFIG[status]
  const Icon = config.icon

  return (
    <DroppableColumn status={status}>
      <div className={`flex flex-col rounded-xl border ${config.headerBorder} overflow-hidden min-h-[400px]`}>
        {/* Column Header */}
        <div className={`${config.headerBg} px-4 py-3 border-b ${config.headerBorder}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`size-4 ${config.headerText}`} />
              <h3 className={`font-semibold text-sm ${config.headerText}`}>
                {config.label}
              </h3>
            </div>
            <span
              className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold min-w-[24px] ${config.countBg} ${config.countText}`}
            >
              {leads.length}
            </span>
          </div>
        </div>

        {/* Cards Area */}
        <div className={`${config.columnBg} flex-1 p-2`}>
          <SortableContext
            items={leads.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
              <div className="space-y-2 p-1 min-h-[80px]">
                <AnimatePresence mode="popLayout">
                  {leads.map((lead) => (
                    <SortableLeadCard
                      key={lead.id}
                      lead={lead}
                      onViewDetail={onViewDetail}
                      onChangeStatus={onChangeStatus}
                      onLogCall={onLogCall}
                    />
                  ))}
                </AnimatePresence>

                {leads.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-muted-foreground"
                  >
                    <Inbox className={`size-10 mb-2 ${config.emptyIcon}`} />
                    <p className="text-xs">لیدی در این مرحله نیست</p>
                  </motion.div>
                )}
              </div>
            </div>
          </SortableContext>
        </div>
      </div>
    </DroppableColumn>
  )
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function KanbanLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
      {COLUMNS.map((status) => {
        const config = COLUMN_CONFIG[status]
        return (
          <div
            key={status}
            className={`rounded-xl border ${config.headerBorder} overflow-hidden`}
          >
            {/* Header skeleton */}
            <div className={`${config.headerBg} px-4 py-3 border-b ${config.headerBorder}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-4 rounded" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
            </div>
            {/* Card skeletons */}
            <div className={`${config.columnBg} p-2 space-y-2`}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card rounded-lg p-3 space-y-2 border">
                  <Skeleton className="h-4 w-3/4 rounded" />
                  <Skeleton className="h-3 w-1/2 rounded" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20 rounded" />
                    <Skeleton className="h-3 w-6 rounded" />
                  </div>
                  <Skeleton className="h-6 w-full rounded" />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main KanbanBoard Component ──────────────────────────────────────────────

export default function KanbanBoard() {
  // Store
  const { setSelectedLeadId, setActiveView } = useCRMStore()

  // State
  const [leads, setLeads] = useState<Lead[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeLead, setActiveLead] = useState<Lead | null>(null)

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/leads?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data)
      }
    } catch {
      toast.error('خطا در دریافت لیدها')
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  // Fetch reference data
  const fetchReferenceData = useCallback(async () => {
    try {
      const [agentsRes, coursesRes] = await Promise.all([
        fetch('/api/users?role=SALES_AGENT'),
        fetch('/api/courses'),
      ])
      if (agentsRes.ok) setAgents(await agentsRes.json())
      if (coursesRes.ok) setCourses(await coursesRes.json())
    } catch {
      // Silent fail for reference data
    }
  }, [])

  useEffect(() => {
    fetchReferenceData()
  }, [fetchReferenceData])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Group leads by status
  const leadsByStatus = useMemo(() => {
    const grouped: Record<LeadStatus, Lead[]> = {
      NEW: [],
      CONTACTED: [],
      IN_PROGRESS: [],
      CONVERTED: [],
    }
    for (const lead of leads) {
      if (grouped[lead.status]) {
        grouped[lead.status].push(lead)
      }
    }
    return grouped
  }, [leads])

  // Change status API call
  const changeLeadStatus = useCallback(
    async (leadId: string, newStatus: LeadStatus) => {
      try {
        const res = await fetch(`/api/leads/${leadId}/status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })

        if (res.ok) {
          toast.success(`وضعیت لید به "${COLUMN_CONFIG[newStatus].label}" تغییر کرد`)
          await fetchLeads()
        } else {
          const data = await res.json()
          toast.error(data.error || 'خطا در تغییر وضعیت')
        }
      } catch {
        toast.error('خطا در ارتباط با سرور')
      }
    },
    [fetchLeads]
  )

  // Quick action: change status from dropdown
  const handleChangeStatus = useCallback(
    (lead: Lead, newStatus: LeadStatus) => {
      changeLeadStatus(lead.id, newStatus)
    },
    [changeLeadStatus]
  )

  // Quick action: log call
  const handleLogCall = useCallback(
    async (lead: Lead) => {
      const agentId = lead.assigned_to_id || agents[0]?.id
      if (!agentId) {
        toast.error('کارشناس فروش تعیین نشده است')
        return
      }
      try {
        const res = await fetch('/api/interactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: lead.id,
            agent_id: agentId,
            interaction_type: 'CALL',
            content: 'تماس ثبت شده از طریق داشبورد کانبان',
          }),
        })
        if (res.ok) {
          toast.success('تماس با موفقیت ثبت شد')
          await fetchLeads()
        } else {
          toast.error('خطا در ثبت تماس')
        }
      } catch {
        toast.error('خطا در ارتباط با سرور')
      }
    },
    [agents, fetchLeads]
  )

  // Quick action: view detail - navigate to lead detail page
  const handleViewDetail = useCallback((lead: Lead) => {
    setSelectedLeadId(lead.id)
    setActiveView('lead-detail')
  }, [setSelectedLeadId, setActiveView])

  // DnD Handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const leadId = active.id as string
      const lead = leads.find((l) => l.id === leadId)
      if (lead) {
        setActiveLead(lead)
      }
    },
    [leads]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      // Find if we're hovering over a column
      const overIsColumn = COLUMNS.includes(overId as LeadStatus)
      const activeLead = leads.find((l) => l.id === activeId)
      if (!activeLead) return

      if (overIsColumn && activeLead.status !== overId) {
        // Optimistically update the UI
        setLeads((prev) =>
          prev.map((l) =>
            l.id === activeId ? { ...l, status: overId as LeadStatus } : l
          )
        )
      } else {
        // Check if hovering over a lead in a different column
        const overLead = leads.find((l) => l.id === overId)
        if (overLead && activeLead.status !== overLead.status) {
          setLeads((prev) =>
            prev.map((l) =>
              l.id === activeId
                ? { ...l, status: overLead.status }
                : l
            )
          )
        }
      }
    },
    [leads]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveLead(null)

      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      // Find the original lead and its target status
      const activeLead = leads.find((l) => l.id === activeId)
      if (!activeLead) return

      // Determine target column
      let targetStatus: LeadStatus | null = null

      if (COLUMNS.includes(overId as LeadStatus)) {
        targetStatus = overId as LeadStatus
      } else {
        // Dropped over a lead card — find that lead's column
        const overLead = leads.find((l) => l.id === overId)
        if (overLead) {
          targetStatus = overLead.status
        }
      }

      if (targetStatus && targetStatus !== activeLead.status) {
        // Call API to persist status change
        changeLeadStatus(activeId, targetStatus)
      } else if (targetStatus === activeLead.status) {
        // Reorder within same column — just refresh to reset any optimistic updates
        // Actually, for same-column reordering, let's reorder locally
        const columnLeads = leads.filter((l) => l.status === activeLead.status)
        const oldIndex = columnLeads.findIndex((l) => l.id === activeId)
        const newIndex = columnLeads.findIndex((l) => l.id === overId)

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          // Just a visual reorder — no API call needed
          const reordered = arrayMove(columnLeads, oldIndex, newIndex)
          setLeads((prev) => {
            const otherLeads = prev.filter((l) => l.status !== activeLead.status)
            return [...otherLeads, ...reordered]
          })
        } else {
          // Reset optimistic updates if drag was cancelled
          fetchLeads()
        }
      } else {
        // Reset if no valid target
        fetchLeads()
      }
    },
    [leads, changeLeadStatus, fetchLeads]
  )

  const handleDragCancel = useCallback(() => {
    setActiveLead(null)
    // Reset any optimistic updates
    fetchLeads()
  }, [fetchLeads])

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">خط لوله لیدها</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            مشاهده و مدیریت لیدها بر اساس وضعیت
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            مجموع: {leads.length} لید
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="جستجو بر اساس نام یا شماره..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-9 max-w-sm"
        />
      </div>

      {/* Kanban Board */}
      {loading ? (
        <KanbanLoadingSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                leads={leadsByStatus[status]}
                onViewDetail={handleViewDetail}
                onChangeStatus={handleChangeStatus}
                onLogCall={handleLogCall}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? <DragOverlayCard lead={activeLead} /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  )
}
