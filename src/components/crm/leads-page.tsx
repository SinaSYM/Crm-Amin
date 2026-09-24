'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import EmptyState from '@/components/crm/empty-state'
import {
  Search, Plus, Eye, Pencil, RefreshCw, Phone, FileText,
  ChevronLeft, ChevronRight, Filter, UserPlus, X, UserRoundCheck, Download, Upload,
  Trash2, Users, ArrowRightLeft, Zap, Hash, Sparkles, Loader2, AlertTriangle, MessageCircle
} from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

import { useCRMStore } from '@/lib/store'
import { sanitizePersianDateInput } from '@/lib/persian-date'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import LeadConvertDialog from '@/components/crm/lead-convert-dialog'

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

// ─── Contact & follow-up helpers ───
// Tomorrow at 10:00 local time — a sensible default for the required follow-up field.
function defaultFollowupDate(): string {
  const d = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00`
}

// Normalize an Iranian mobile number for tel:/wa.me links (09xxxxxxxxx → +98...).
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('98')) return digits
  if (digits.startsWith('0')) return `98${digits.slice(1)}`
  return digits
}

function telHref(phone: string): string {
  return `tel:+${normalizePhone(phone)}`
}

function whatsappHref(phone: string, name?: string): string {
  const text = encodeURIComponent(
    name ? `سلام ${name}، از آموزش عالی آزاد امین تماس می‌گیریم.` : 'سلام، از آموزش عالی آزاد امین تماس می‌گیریم.'
  )
  return `https://wa.me/${normalizePhone(phone)}?text=${text}`
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

const statusFilters = [
 { value: 'ALL', label: 'همه', activeClass: 'bg-foreground text-background hover:bg-foreground/85 ', dotColor: 'bg-muted/60'},
 { value: 'NEW', label: 'جدید', activeClass: 'bg-foreground text-background hover:bg-foreground/85 ', dotColor: 'bg-muted/60'},
 { value: 'CONTACTED', label: 'تماس گرفته شده', activeClass: 'bg-foreground text-background hover:bg-foreground/85 ', dotColor: 'bg-muted/60'},
  { value: 'IN_PROGRESS', label: 'در حال پیگیری', activeClass: 'bg-amber-600 hover:bg-amber-700 text-white', dotColor: 'bg-amber-500' },
 { value: 'CONVERTED', label: 'تبدیل شده', activeClass: 'bg-foreground text-background hover:bg-foreground/85 ', dotColor: 'bg-muted/60'},
]

// Score color helper
function getScoreBadge(score: number) {
  if (score >= 61) return { className: 'bg-muted/60 text-foreground border-border dark:bg-muted/20 dark:text-foreground dark:border-border', dotColor: 'bg-muted/60', label: 'بالا' }
  if (score >= 31) return { className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800', dotColor: 'bg-amber-500', label: 'متوسط' }
  return { className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800', dotColor: 'bg-red-500', label: 'پایین' }
}

const ITEMS_PER_PAGE = 10

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
    const date = new Date(dateStr)
    return date.toLocaleDateString('fa-IR')
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

export default function LeadsPage() {
  // Store
  const { setSelectedLeadId, setActiveView, pendingLeadCreate, setPendingLeadCreate, currentUser } = useCRMStore()

  // State
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)

  // Bulk selection state
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [computingScores, setComputingScores] = useState(false)

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  // Dashboard "افزودن لید" quick action opens the create dialog directly
  useEffect(() => {
    if (pendingLeadCreate) {
      setAddDialogOpen(true)
      setPendingLeadCreate(false)
    }
  }, [pendingLeadCreate, setPendingLeadCreate])
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  // AI Content Generator State
  const [aiContentDialogOpen, setAiContentDialogOpen] = useState(false)
  const [selectedLeadForAI, setSelectedLeadForAI] = useState<Lead | null>(null)
  const [aiContentForm, setAiContentForm] = useState({
    platform: 'sms',
    tone: 'formal',
    objective: 'follow_up',
  })
  const [generatedAIContent, setGeneratedAIContent] = useState('')
  const [loadingAIContent, setLoadingAIContent] = useState(false)

  const handleOpenAIContentGen = (lead: Lead) => {
    setSelectedLeadForAI(lead)
    setAiContentForm({
      platform: 'sms',
      tone: 'formal',
      objective: 'follow_up',
    })
    setGeneratedAIContent('')
    setAiContentDialogOpen(true)
  }

  const handleGenerateAIContent = async () => {
    if (!selectedLeadForAI) return
    setLoadingAIContent(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLeadForAI.id,
          platform: aiContentForm.platform,
          tone: aiContentForm.tone,
          objective: aiContentForm.objective,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setGeneratedAIContent(json.text)
      } else {
        toast.error('خطا در تولید محتوای هوش مصنوعی')
      }
    } catch {
      toast.error('عدم ارتباط با سرور هوش مصنوعی')
    } finally {
      setLoadingAIContent(false)
    }
  }

  const handleCopyAIContent = () => {
    navigator.clipboard.writeText(generatedAIContent)
    toast.success('متن تولید شده در حافظه کپی شد')
  }

  // CSV Import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<string[][]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ successCount: number; errorCount: number; errors: string[]; totalRows: number } | null>(null)

  // Single delete
  const [singleDeleteDialogOpen, setSingleDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)

  // Bulk dialogs
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false)
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)

  // Bulk form state
  const [bulkAssignAgentId, setBulkAssignAgentId] = useState('')
  const [bulkStatusValue, setBulkStatusValue] = useState<LeadStatus>('NEW')
  const [bulkStatusNote, setBulkStatusNote] = useState('')

  // Form state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    source: 'manual',
    target_course_id: '',
    assigned_to_id: '',
    notes: '',
    next_followup_date: '',
  })
  const [newStatus, setNewStatus] = useState<LeadStatus>('NEW')
  // Which option is picked in the source dropdown: one of the fixed keys or
  // 'manual' (free text). Defaults to the standard manual entry.
  const [sourceChoice, setSourceChoice] = useState('manual')
  const [statusNote, setStatusNote] = useState('')

  // Interaction form
  const [interactionForm, setInteractionForm] = useState({
    interaction_type: 'NOTE' as 'CALL' | 'NOTE',
    content: '',
    next_followup_date: '' as string,
  })

  // Reference data
  const [agents, setAgents] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [leadInteractions, setLeadInteractions] = useState<Interaction[]>([])

  // Fetch leads
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
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
  }, [statusFilter, searchQuery])

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

  // Pagination
  const totalPages = Math.ceil(leads.length / ITEMS_PER_PAGE)
  const paginatedLeads = leads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, searchQuery])

  // Bulk selection helpers
  const isAllPageSelected = paginatedLeads.length > 0 && paginatedLeads.every((lead) => selectedLeads.has(lead.id))
  const isSomePageSelected = paginatedLeads.some((lead) => selectedLeads.has(lead.id)) && !isAllPageSelected

  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedLeads((prev) => {
        const next = new Set(prev)
        paginatedLeads.forEach((lead) => next.delete(lead.id))
        return next
      })
    } else {
      setSelectedLeads((prev) => {
        const next = new Set(prev)
        paginatedLeads.forEach((lead) => next.add(lead.id))
        return next
      })
    }
  }

  const toggleSelectLead = (id: string) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const clearSelection = () => {
    setSelectedLeads(new Set())
  }

  // Reset form — follow-up date is pre-filled with tomorrow at a working hour
  // so agents never get blocked by the required field.
  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      phone_number: '',
      source: '',
      target_course_id: '',
      assigned_to_id: '',
      notes: '',
      next_followup_date: defaultFollowupDate(),
    })
  }

  // Open add dialog
  const handleOpenAdd = () => {
    resetForm()
    setSourceChoice('manual')
    setAddDialogOpen(true)
  }

  // Open edit dialog
  const handleOpenEdit = (lead: Lead) => {
    setSelectedLead(lead)
    const latestFollowup = lead.interactions?.find((i: { next_followup_date?: string | null }) => i.next_followup_date)?.next_followup_date
    let formattedFollowup = ''
    if (latestFollowup) {
      try {
        const d = new Date(latestFollowup)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const hours = String(d.getHours()).padStart(2, '0')
        const minutes = String(d.getMinutes()).padStart(2, '0')
        formattedFollowup = `${year}-${month}-${day}T${hours}:${minutes}`
      } catch { /* ignore */ }
    }

    setFormData({
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone_number: lead.phone_number,
      source: ['manual', 'website', 'campaign'].includes(lead.source) ? '' : lead.source,
      target_course_id: lead.target_course_id || '',
      assigned_to_id: lead.assigned_to_id || '',
      notes: lead.notes,
      next_followup_date: formattedFollowup,
    })
    setSourceChoice(['website', 'campaign'].includes(lead.source) ? lead.source : 'manual')
    setEditDialogOpen(true)
  }

  // Open status dialog
  const handleOpenStatus = (lead: Lead) => {
    setSelectedLead(lead)
    setNewStatus(lead.status)
    setStatusNote('')
    setStatusDialogOpen(true)
  }

  // Open detail dialog
  const handleOpenDetail = async (lead: Lead) => {
    // Navigate to the full lead detail page
    setSelectedLeadId(lead.id)
    setActiveView('lead-detail')
  }

  // Submit add/edit
  const handleSubmitLead = async (isEdit: boolean) => {
    if (!isEdit && !formData.next_followup_date) {
      toast.error('وارد کردن تاریخ تماس پیگیری الزامی است')
      return
    }

    const url = isEdit ? `/api/leads/${selectedLead?.id}` : '/api/leads'
    const method = isEdit ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number,
          source: formData.source,
          target_course_id: formData.target_course_id || null,
          assigned_to_id: formData.assigned_to_id || null,
          notes: formData.notes,
          next_followup_date: formData.next_followup_date || null,
        }),
      })

      if (res.ok) {
        toast.success(isEdit ? 'لید با موفقیت ویرایش شد' : 'لید جدید با موفقیت اضافه شد')
        if (isEdit) setEditDialogOpen(false)
        else setAddDialogOpen(false)
        resetForm()
        fetchLeads()
      } else {
        const data = await res.json()
        toast.error(data.error || 'خطا در ذخیره لید')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    }
  }

  // Change status
  const handleChangeStatus = async () => {
    if (!selectedLead) return

    try {
      const res = await fetch(`/api/leads/${selectedLead.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        // If there's a status note, create an interaction
        if (statusNote.trim() && selectedLead.assigned_to_id) {
          await fetch('/api/interactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: selectedLead.id,
              agent_id: selectedLead.assigned_to_id,
              interaction_type: 'NOTE',
              content: statusNote,
            }),
          })
        }
        toast.success('وضعیت لید با موفقیت تغییر کرد')
        setStatusDialogOpen(false)
        fetchLeads()
      } else {
        const data = await res.json()
        toast.error(data.error || 'خطا در تغییر وضعیت')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    }
  }

  // Add interaction
  const handleAddInteraction = async () => {
    if (!selectedLead || !interactionForm.content.trim()) {
      toast.error('محتوای تعامل را وارد کنید')
      return
    }

    try {
      const agentId = selectedLead.assigned_to_id || agents[0]?.id
      if (!agentId) {
        toast.error('کارشناس فروش تعیین نشده است')
        return
      }

      const res = await fetch('/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: selectedLead.id,
          agent_id: agentId,
          interaction_type: interactionForm.interaction_type,
          content: interactionForm.content,
          next_followup_date: interactionForm.next_followup_date || null,
        }),
      })

      if (res.ok) {
        toast.success('تعامل با موفقیت ثبت شد')
        setInteractionForm({ interaction_type: 'NOTE', content: '', next_followup_date: '' })
        // Refresh interactions
        const intRes = await fetch(`/api/interactions?lead_id=${selectedLead.id}`)
        if (intRes.ok) {
          setLeadInteractions(await intRes.json())
        }
        fetchLeads()
      } else {
        const data = await res.json()
        toast.error(data.error || 'خطا در ثبت تعامل')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    }
  }

  // Export CSV
  const handleExportCSV = useCallback(async () => {
    try {
      const res = await fetch('/api/leads/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('فایل CSV با موفقیت دانلود شد')
    } catch {
      toast.error('خطا در خروجی گرفتن')
    }
  }, [])

  // CSV Import handlers
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    setImportResult(null)

    // Parse preview
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter((line) => line.trim())
      const previewRows: string[][] = []
      const maxPreview = Math.min(lines.length, 6) // header + 5 rows
      for (let i = 0; i < maxPreview; i++) {
        previewRows.push(lines[i].split(',').map((cell) => cell.trim().replace(/"/g, '')))
      }
      setImportPreview(previewRows)
    }
    reader.readAsText(file)
  }, [])

  const handleImportCSV = useCallback(async () => {
    if (!importFile) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', importFile)

      const res = await fetch('/api/leads/import', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        setImportResult(data)
        if (data.successCount > 0) {
          toast.success(`${data.successCount} لید با موفقیت وارد شد`)
          fetchLeads()
        }
        if (data.errorCount > 0) {
          toast.warning(`${data.errorCount} ردیف خطا داشت`)
        }
      } else {
        toast.error(data.error || 'خطا در وارد کردن فایل')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    } finally {
      setImporting(false)
    }
  }, [importFile, fetchLeads])

  const resetImportState = useCallback(() => {
    setImportFile(null)
    setImportPreview([])
    setImportResult(null)
    setImporting(false)
  }, [])

  // ====== Bulk Operations ======

  const handleBulkAssign = async () => {
    if (!bulkAssignAgentId) {
      toast.error('کارشناس فروش را انتخاب کنید')
      return
    }
    setBulkProcessing(true)
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign',
          lead_ids: Array.from(selectedLeads),
          data: { assigned_to_id: bulkAssignAgentId },
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(`${result.successCount} لید با موفقیت تخصیص داده شد`)
        if (result.errors?.length > 0) {
          toast.error(`${result.errorCount} خطا در تخصیص`)
        }
        setBulkAssignDialogOpen(false)
        setBulkAssignAgentId('')
        clearSelection()
        fetchLeads()
      } else {
        toast.error(result.error || 'خطا در تخصیص دسته‌ای')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleBulkStatusChange = async () => {
    setBulkProcessing(true)
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          lead_ids: Array.from(selectedLeads),
          data: { status: bulkStatusValue },
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(`وضعیت ${result.successCount} لید با موفقیت تغییر کرد`)
        if (result.errors?.length > 0) {
          toast.error(`${result.errorCount} خطا در تغییر وضعیت`)
        }
        setBulkStatusDialogOpen(false)
        setBulkStatusValue('NEW')
        setBulkStatusNote('')
        clearSelection()
        fetchLeads()
      } else {
        toast.error(result.error || 'خطا در تغییر وضعیت دسته‌ای')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    setBulkProcessing(true)
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          lead_ids: Array.from(selectedLeads),
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast.success(`${result.successCount} لید با موفقیت حذف شد`)
        if (result.errors?.length > 0) {
          toast.error(`${result.errorCount} خطا در حذف`)
        }
        setBulkDeleteDialogOpen(false)
        clearSelection()
        fetchLeads()
      } else {
        toast.error(result.error || 'خطا در حذف دسته‌ای')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    } finally {
      setBulkProcessing(false)
    }
  }

  // Delete single lead
  const handleDeleteSingleLead = async () => {
    if (!leadToDelete) return
    setBulkProcessing(true)
    try {
      const res = await fetch(`/api/leads/${leadToDelete.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('لید با موفقیت حذف شد')
        setSingleDeleteDialogOpen(false)
        setLeadToDelete(null)
        fetchLeads()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'خطا در حذف لید')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    } finally {
      setBulkProcessing(false)
    }
  }

  // Interaction type labels
  const interactionTypeLabels: Record<string, string> = {
    CALL: 'تماس',
    NOTE: 'یادداشت',
    SYSTEM: 'سیستم',
  }

  const interactionTypeIcons: Record<string, React.ReactNode> = {
    CALL: <Phone className="size-3.5 text-foreground" />,
    NOTE: <FileText className="size-3.5 text-amber-600" />,
    SYSTEM: <RefreshCw className="size-3.5 text-gray-500" />,
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Lead Status Pipeline Bar */}
      {leads.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-border/50 bg-card p-4 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <Hash className="size-4 text-foreground" />
            <span className="text-sm font-medium text-muted-foreground">خط لوله وضعیت لیدها</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
            {(() => {
              const total = leads.length
              const newCount = leads.filter((l) => l.status === 'NEW').length
              const contactedCount = leads.filter((l) => l.status === 'CONTACTED').length
              const inProgressCount = leads.filter((l) => l.status === 'IN_PROGRESS').length
              const convertedCount = leads.filter((l) => l.status === 'CONVERTED').length
              return (
                <>
                  {newCount > 0 && (
                    <div
                      className="bg-muted/60 dark:bg-muted/20 transition-all duration-500"
                      style={{ width: `${(newCount / total) * 100}%` }}
                      title={`جدید: ${newCount}`}
                    />
                  )}
                  {contactedCount > 0 && (
                    <div
                      className="bg-amber-400 dark:bg-amber-500 transition-all duration-500"
                      style={{ width: `${(contactedCount / total) * 100}%` }}
                      title={`تماس شده: ${contactedCount}`}
                    />
                  )}
                  {inProgressCount > 0 && (
                    <div
                      className="bg-yellow-400 dark:bg-yellow-500 transition-all duration-500"
                      style={{ width: `${(inProgressCount / total) * 100}%` }}
                      title={`در حال پیگیری: ${inProgressCount}`}
                    />
                  )}
                  {convertedCount > 0 && (
                    <div
                      className="bg-muted/60 dark:bg-muted/20 transition-all duration-500"
                      style={{ width: `${(convertedCount / total) * 100}%` }}
                      title={`تبدیل شده: ${convertedCount}`}
                    />
                  )}
                </>
              )
            })()}
          </div>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {(() => {
              const total = leads.length || 1
              const segments = [
                { status: 'NEW', label: 'جدید', count: leads.filter((l) => l.status === 'NEW').length, color: 'bg-muted/60 dark:bg-muted/20', textColor: 'text-foreground dark:text-foreground' },
                { status: 'CONTACTED', label: 'تماس شده', count: leads.filter((l) => l.status === 'CONTACTED').length, color: 'bg-amber-400 dark:bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300' },
                { status: 'IN_PROGRESS', label: 'در حال پیگیری', count: leads.filter((l) => l.status === 'IN_PROGRESS').length, color: 'bg-yellow-400 dark:bg-yellow-500', textColor: 'text-yellow-700 dark:text-yellow-300' },
                { status: 'CONVERTED', label: 'تبدیل شده', count: leads.filter((l) => l.status === 'CONVERTED').length, color: 'bg-muted/60 dark:bg-muted/20', textColor: 'text-foreground dark:text-foreground' },
              ]
              return segments.map((seg) => (
                <div key={seg.status} className="flex items-center gap-1.5">
                  <span className={`size-2.5 rounded-full ${seg.color}`} />
                  <span className={`text-xs font-medium ${seg.textColor}`}>
                    {seg.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {seg.count.toLocaleString('fa-IR')} ({Math.round((seg.count / total) * 100)}٪)
                  </span>
                </div>
              ))
            })()}
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مدیریت لیدها</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مشاهده و مدیریت تمامی لیدهای مؤسسه
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={handleOpenAdd}
      className="bg-foreground text-background hover:bg-foreground/85 gap-2"
          >
            <Plus className="size-4" />
            افزودن لید جدید
          </Button>
          {currentUser && ['ADMIN', 'SALES_MANAGER'].includes(currentUser.role) && (
            <Button
              variant="outline"
              onClick={async () => {
                setComputingScores(true)
                try {
                  const res = await fetch('/api/leads/compute-scores', { method: 'POST' })
                  if (res.ok) {
                    const data = await res.json()
                    toast.success(`امتیاز ${data.updatedCount} لید محاسبه شد`)
                    fetchLeads()
                  } else {
                    toast.error('خطا در محاسبه امتیازها')
                  }
                } catch {
                  toast.error('خطا در ارتباط با سرور')
                } finally {
                  setComputingScores(false)
                }
              }}
              disabled={computingScores}
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/30"
            >
              <Zap className={`size-4 ${computingScores ? 'animate-pulse' : ''}`} />
              {computingScores ? 'در حال محاسبه...' : 'محاسبه امتیازها'}
            </Button>
          )}
          {currentUser && ['ADMIN', 'SALES_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role) && (
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="gap-2"
            >
              <Download className="size-4" />
              خروجی CSV
            </Button>
          )}
          {currentUser && ['ADMIN', 'SALES_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role) && (
            <Button
              variant="outline"
              onClick={() => {
                resetImportState()
                setImportDialogOpen(true)
              }}
              className="gap-2"
            >
              <Upload className="size-4" />
              وارد کردن CSV
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="جستجو بر اساس نام یا شماره..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="size-4 text-muted-foreground" />
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={statusFilter === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`gap-1.5 ripple ${
                    statusFilter === filter.value
                      ? filter.activeClass
                      : 'hover:bg-muted'
                  }`}
                >
                  {filter.value !== 'ALL' && (
                    <span className={`size-2 rounded-full ${filter.dotColor} ${statusFilter === filter.value ? 'ring-2 ring-white/50' : ''}`} />
                  )}
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectedLeads.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="sticky top-0 z-10"
          >
            <div className="bg-muted/60 dark:bg-muted/20 text-white rounded-xl px-4 py-3 shadow-lg shadow-neutral-400/30">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-10 rounded-full bg-white/20">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <p className="font-bold text-base">
                      {selectedLeads.size} لید انتخاب شده
                    </p>
                    <p className="text-foreground text-xs">
                      عملیات دسته‌ای را انتخاب کنید
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setBulkAssignAgentId('')
                      setBulkAssignDialogOpen(true)
                    }}
                    className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <Users className="size-3.5" />
                    تخصیص دسته‌ای
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setBulkStatusValue('NEW')
                      setBulkStatusNote('')
                      setBulkStatusDialogOpen(true)
                    }}
                    className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <ArrowRightLeft className="size-3.5" />
                    تغییر وضعیت دسته‌ای
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    className="gap-1.5 bg-red-500/80 hover:bg-red-500 text-white border-red-400/30"
                  >
                    <Trash2 className="size-3.5" />
                    حذف دسته‌ای
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="gap-1.5 text-white hover:bg-white/20"
                  >
                    <X className="size-3.5" />
                    انصراف
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            لیست لیدها
            <Badge variant="secondary" className="text-xs">
              {leads.length} لید
            </Badge>
            {selectedLeads.size > 0 && (
              <Badge className="text-xs bg-muted/60 text-foreground">
                {selectedLeads.size} انتخاب شده
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-8" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="لیدی یافت نشد"
              description="فیلترها را تغییر دهید یا لید جدیدی اضافه کنید"
            />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllPageSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="انتخاب همه"
                        className="data-[state=checked]:bg-muted/60 data-[state=checked]:border-border"
                        {...(isSomePageSelected ? { 'data-state': 'indeterminate' as const } : {})}
                      />
                    </TableHead>
                    <TableHead className="text-right w-12">ردیف</TableHead>
                    <TableHead className="text-right">نام و نام خانوادگی</TableHead>
                    <TableHead className="text-right">امتیاز</TableHead>
                    <TableHead className="text-right">شماره تماس</TableHead>
                    <TableHead className="text-right">منبع</TableHead>
                    <TableHead className="text-right">وضعیت</TableHead>
                    <TableHead className="text-right">فروشنده مسئول</TableHead>
                    <TableHead className="text-right">دوره هدف</TableHead>
                    <TableHead className="text-right">تاریخ ثبت</TableHead>
                    <TableHead className="text-right">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TooltipProvider delayDuration={300}>
                    <AnimatePresence mode="popLayout">
                      {paginatedLeads.map((lead, index) => (
                        <Tooltip key={lead.id}>
                          <TooltipTrigger asChild>
                            <motion.tr
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2, delay: index * 0.03 }}
                              className={`border-b premium-row-hover ${
                                selectedLeads.has(lead.id)
                                  ? 'bg-muted/60 dark:bg-muted/20'
                                  : ''
                              }`}
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                        <TableCell>
                          <Checkbox
                            checked={selectedLeads.has(lead.id)}
                            onCheckedChange={() => toggleSelectLead(lead.id)}
                            aria-label={`انتخاب ${lead.first_name} ${lead.last_name}`}
                            className="data-[state=checked]:bg-muted/60 data-[state=checked]:border-border"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center size-6 rounded-md bg-muted/60 text-muted-foreground text-xs font-medium">
                            {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {lead.first_name} {lead.last_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const scoreInfo = getScoreBadge(lead.score || 0)
                            return (
                              <Badge variant="outline" className={`text-[10px] gap-1 ${scoreInfo.className}`}>
                                <span className={`size-1.5 rounded-full ${scoreInfo.dotColor}`} />
                                {lead.score || 0}
                              </Badge>
                            )
                          })()}
                        </TableCell>
                        <TableCell className="font-mono text-sm direction-ltr" dir="ltr">
                          {lead.phone_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {sourceLabels[lead.source] || lead.source}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={lead.status} />
                        </TableCell>
                        <TableCell className="text-sm">
                          {lead.assigned_to
                            ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {lead.target_course?.title || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(lead.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDetail(lead)}
                              title="مشاهده"
                              className="h-8 w-8 p-0 text-foreground hover:text-foreground hover:bg-muted/50"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(lead)}
                              title="ویرایش"
                              className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              <Pencil className="size-4" />
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
                            {lead.status !== 'CONVERTED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedLead(lead)
                                  setConvertDialogOpen(true)
                                }}
                                title="تبدیل به دانش‌پذیر"
                                className="h-8 w-8 p-0 text-foreground hover:text-foreground hover:bg-muted/50"
                              >
                                <UserRoundCheck className="size-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenAIContentGen(lead)}
                              title="تولید محتوای هوشمند (AI)"
                              className="h-8 w-8 p-0 text-foreground hover:text-foreground hover:bg-muted/50"
                            >
                              <Sparkles className="size-4" />
                            </Button>
                            <a
                              href={telHref(lead.phone_number)}
                              title="تماس تلفنی"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-muted/50 dark:hover:bg-muted/50"
                            >
                              <Phone className="size-4" />
                            </a>
                            <a
                              href={whatsappHref(lead.phone_number, `${lead.first_name} ${lead.last_name}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="پیام واتساپ"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-green-600 transition-colors hover:bg-green-50 dark:hover:bg-green-950/40"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                            {currentUser && ['ADMIN', 'SALES_MANAGER', 'DEPT_MANAGER'].includes(currentUser.role) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setLeadToDelete(lead); setSingleDeleteDialogOpen(true) }}
                                title="حذف لید"
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="text-xs" dir="rtl">
                            <div className="space-y-1.5 py-1">
                              <div className="flex items-center gap-2">
                                <FileText className="size-3 text-foreground" />
                                <span>آخرین تعامل: {lead.interactions?.[0]?.createdAt ? formatDate(lead.interactions[0].createdAt) : '—'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Hash className="size-3 text-amber-500" />
                                <span>تعداد تعاملات: {(lead._count?.interactions || 0).toLocaleString('fa-IR')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="size-3 text-foreground" />
                                <span>کارشناس: {lead.assigned_to ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}` : 'تعیین نشده'}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </AnimatePresence>
                  </TooltipProvider>
                </TableBody>
              </Table>
            </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    نمایش {(currentPage - 1) * ITEMS_PER_PAGE + 1} تا{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, leads.length)} از {leads.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>      {/* Add Lead Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>افزودن لید جدید</DialogTitle>
            <DialogDescription>اطلاعات لید جدید را وارد کنید</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmitLead(false) }}
            className="space-y-5 py-1"
          >
            {/* ── Section: Contact info ── */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">اطلاعات تماس</legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add-first-name" className="text-xs">نام</Label>
                  <Input
                    id="add-first-name"
                    className="h-10 text-sm"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="نام"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-last-name" className="text-xs">نام خانوادگی</Label>
                  <Input
                    id="add-last-name"
                    className="h-10 text-sm"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="نام خانوادگی"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-phone" className="text-xs">شماره تماس *</Label>
                <Input
                  id="add-phone"
                  className="h-10 text-sm"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="شماره تماس"
                  dir="ltr"
                  required
                />
              </div>
            </fieldset>

            {/* ── Section: Source & course ── */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">منبع و دوره</legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">منبع ورود</Label>
                  <Select
                    value={sourceChoice}
                    onValueChange={(val) => {
                      setSourceChoice(val)
                      setFormData({ ...formData, source: val === 'manual' ? '' : val })
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">دستی</SelectItem>
                      <SelectItem value="website">سایت</SelectItem>
                      <SelectItem value="campaign">کمپین</SelectItem>
                    </SelectContent>
                  </Select>
                  {sourceChoice === 'manual' && (
                    <Input
                      className="h-10 text-sm"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      placeholder="متن منبع را تایپ کنید (اختیاری)..."
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">دوره هدف</Label>
                  <Select
                    value={formData.target_course_id}
                    onValueChange={(val) => setFormData({ ...formData, target_course_id: val })}
                  >
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="انتخاب دوره" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">فروشنده مسئول</Label>
                <Select
                  value={formData.assigned_to_id}
                  onValueChange={(val) => setFormData({ ...formData, assigned_to_id: val })}
                >
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="انتخاب کارشناس" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>

            {/* ── Section: Notes & followup ── */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">یادداشت و پیگیری</legend>
              <div className="space-y-1.5">
                <Label htmlFor="add-notes" className="text-xs">یادداشت</Label>
                <Textarea
                  id="add-notes"
                  className="text-sm"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="یادداشت..."
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-followup" className="text-xs">تاریخ و ساعت تماس پیگیری *</Label>
                <Input
                  id="add-followup"
                  type="datetime-local"
                  className="h-10 text-sm"
                  value={formData.next_followup_date}
                  onChange={(e) => setFormData({ ...formData, next_followup_date: sanitizePersianDateInput(e.target.value) ?? '' })}
                  required
                />
              </div>
            </fieldset>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>انصراف</Button>
              <Button type="submit" className="bg-foreground text-background hover:bg-foreground/85 gap-2">
                ذخیره
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Lead Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent
          className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>ویرایش لید</DialogTitle>
            <DialogDescription>اطلاعات لید را ویرایش کنید</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSubmitLead(true) }}
            className="space-y-5 py-1"
          >
            {/* ── Section: Contact info ── */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">اطلاعات تماس</legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-first-name" className="text-xs">نام</Label>
                  <Input
                    id="edit-first-name"
                    className="h-10 text-sm"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-last-name" className="text-xs">نام خانوادگی</Label>
                  <Input
                    id="edit-last-name"
                    className="h-10 text-sm"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-phone" className="text-xs">شماره تماس *</Label>
                <Input
                  id="edit-phone"
                  className="h-10 text-sm"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  dir="ltr"
                  required
                />
              </div>
            </fieldset>

            {/* ── Section: Source & course ── */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">منبع و دوره</legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">منبع ورود</Label>
                  <Select
                    value={sourceChoice}
                    onValueChange={(val) => {
                      setSourceChoice(val)
                      setFormData({ ...formData, source: val === 'manual' ? '' : val })
                    }}
                  >
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">دستی</SelectItem>
                      <SelectItem value="website">سایت</SelectItem>
                      <SelectItem value="campaign">کمپین</SelectItem>
                    </SelectContent>
                  </Select>
                  {sourceChoice === 'manual' && (
                    <Input
                      className="h-10 text-sm"
                      value={formData.source}
                      onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                      placeholder="متن منبع را تایپ کنید (اختیاری)..."
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">دوره هدف</Label>
                  <Select
                    value={formData.target_course_id}
                    onValueChange={(val) => setFormData({ ...formData, target_course_id: val })}
                  >
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="انتخاب دوره" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">فروشنده مسئول</Label>
                <Select
                  value={formData.assigned_to_id}
                  onValueChange={(val) => setFormData({ ...formData, assigned_to_id: val })}
                >
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="انتخاب کارشناس" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>{agent.first_name} {agent.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>

            {/* ── Section: Notes & followup ── */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">یادداشت و پیگیری</legend>
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes" className="text-xs">یادداشت</Label>
                <Textarea
                  id="edit-notes"
                  className="text-sm"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-followup" className="text-xs">تاریخ و ساعت تماس پیگیری بعدی (اختیاری)</Label>
                <Input
                  id="edit-followup"
                  type="datetime-local"
                  className="h-10 text-sm"
                  value={formData.next_followup_date}
                  onChange={(e) => setFormData({ ...formData, next_followup_date: sanitizePersianDateInput(e.target.value) ?? '' })}
                />
              </div>
            </fieldset>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>انصراف</Button>
              <Button type="submit" className="bg-foreground text-background hover:bg-foreground/85 gap-2">
                ذخیره تغییرات
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl"
        >
          <DialogHeader>
            <DialogTitle>تغییر وضعیت لید</DialogTitle>
            <DialogDescription>
              وضعیت جدید لید {selectedLead?.first_name} {selectedLead?.last_name} را مشخص کنید
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>وضعیت فعلی</Label>
              <div>
                {selectedLead && <StatusBadge status={selectedLead.status} />}
              </div>
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
            <div className="space-y-2">
              <Label htmlFor="status-note">یادداشت (اختیاری)</Label>
              <Textarea
                id="status-note"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="دلیل تغییر وضعیت..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleChangeStatus}
              className="bg-foreground text-background hover:bg-foreground/85 gap-2"
            >
              تغییر وضعیت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open)
        if (!open) resetImportState()
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="size-5 text-foreground" />
              وارد کردن لیدها از CSV
            </DialogTitle>
            <DialogDescription>
              فایل CSV خود را با ستون‌های first_name, last_name, phone_number, source, notes آپلود کنید. ستون phone_number الزامی است.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* File upload */}
            <div className="space-y-2">
              <Label>انتخاب فایل CSV</Label>
              <Input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                disabled={importing}
              />
              {importFile && (
                <p className="text-xs text-muted-foreground">
                  فایل انتخاب شده: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Preview */}
            {importPreview.length > 0 && !importResult && (
              <div className="space-y-2">
                <Label>پیش‌نمایش (۵ ردیف اول)</Label>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        {importPreview[0]?.map((header, i) => (
                          <th key={i} className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.slice(1).map((row, ri) => (
                        <tr key={ri} className="border-t">
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-1.5 whitespace-nowrap max-w-[150px] truncate">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                <h4 className="font-semibold text-sm">نتیجه وارد کردن</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-background border">
                    <p className="text-2xl font-bold text-foreground">{importResult.totalRows}</p>
                    <p className="text-xs text-muted-foreground">کل ردیف‌ها</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/60 dark:bg-muted/20 border border-border dark:border-border">
                    <p className="text-2xl font-bold text-foreground">{importResult.successCount}</p>
                    <p className="text-xs text-foreground dark:text-foreground">موفق</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                    <p className="text-2xl font-bold text-red-600">{importResult.errorCount}</p>
                    <p className="text-xs text-red-700 dark:text-red-400">خطا</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">خطاها:</p>
                    <div className="max-h-32 overflow-y-auto pr-2">
                      <div className="space-y-0.5">
                        {importResult.errors.map((err, i) => (
                          <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false)
                resetImportState()
              }}
              disabled={importing}
            >
              {importResult ? 'بستن' : 'انصراف'}
            </Button>
            {!importResult && (
              <Button
                onClick={handleImportCSV}
        className="bg-foreground text-background hover:bg-foreground/85 "
                disabled={!importFile || importing}
              >
                {importing ? (
                  <>
                    <RefreshCw className="size-4 animate-spin ml-2" />
                    در حال وارد کردن...
                  </>
                ) : (
                  <>
                    <Upload className="size-4 ml-2" />
                    شروع وارد کردن
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Content Generator Dialog */}
      <Dialog open={aiContentDialogOpen} onOpenChange={setAiContentDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-foreground" />
              تولید محتوای هوشمند با AI
            </DialogTitle>
            <DialogDescription>
              برای لید {selectedLeadForAI?.first_name} {selectedLeadForAI?.last_name} بر اساس هدف و لحن، متن اختصاصی تولید کنید.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>پلتفرم</Label>
                <Select
                  value={aiContentForm.platform}
                  onValueChange={(val) => setAiContentForm({ ...aiContentForm, platform: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sms">SMS (پیامک)</SelectItem>
                    <SelectItem value="email">Email (ایمیل)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>لحن پیام</Label>
                <Select
                  value={aiContentForm.tone}
                  onValueChange={(val) => setAiContentForm({ ...aiContentForm, tone: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">رسمی و اداری</SelectItem>
                    <SelectItem value="friendly">صمیمی و دوستانه</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>هدف پیام</Label>
                <Select
                  value={aiContentForm.objective}
                  onValueChange={(val) => setAiContentForm({ ...aiContentForm, objective: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow_up">پیگیری تماس قبلی</SelectItem>
                    <SelectItem value="info">ارسال اطلاعات اولیه</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerateAIContent}
              disabled={loadingAIContent}
       className="bg-foreground text-background hover:bg-foreground/85 gap-2 w-full mt-2"
            >
              {loadingAIContent ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  در حال تولید محتوا توسط هوش مصنوعی...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  تولید متن پیشنهادی
                </>
              )}
            </Button>

            {generatedAIContent && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground">متن تولید شده:</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyAIContent}
                    className="h-7 px-2 text-[10px] text-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    کپی کردن متن
                  </Button>
                </div>
                <Textarea
                  value={generatedAIContent}
                  onChange={(e) => setGeneratedAIContent(e.target.value)}
                  rows={8}
                  className="text-xs leading-relaxed font-mono"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAiContentDialogOpen(false)} disabled={loadingAIContent}>
              بستن
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Dialog */}
      <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-foreground" />
              تخصیص دسته‌ای
            </DialogTitle>
            <DialogDescription>
              کارشناس فروش را برای {selectedLeads.size} لید انتخاب شده مشخص کنید
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="bg-muted/60 dark:bg-muted/20 rounded-lg p-3 flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-full bg-muted/60 dark:bg-muted/20">
                <Users className="size-5 text-foreground" />
              </div>
              <div>
                <p className="font-bold text-foreground dark:text-foreground">
                  {selectedLeads.size} لید
                </p>
                <p className="text-xs text-foreground dark:text-foreground">
                  به کارشناس فروش تخصیص داده می‌شود
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>کارشناس فروش</Label>
              <Select
                value={bulkAssignAgentId}
                onValueChange={setBulkAssignAgentId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب کارشناس" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.first_name} {agent.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBulkAssignDialogOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleBulkAssign}
       className="bg-foreground text-background hover:bg-foreground/85 gap-2"
              disabled={!bulkAssignAgentId || bulkProcessing}
            >
              {bulkProcessing ? 'در حال پردازش...' : 'تخصیص'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Change Dialog */}
      <Dialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-foreground" />
              تغییر وضعیت دسته‌ای
            </DialogTitle>
            <DialogDescription>
              وضعیت جدید را برای {selectedLeads.size} لید انتخاب شده مشخص کنید
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="bg-muted/60 dark:bg-muted/20 rounded-lg p-3 flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-full bg-muted/60 dark:bg-muted/20">
                <ArrowRightLeft className="size-5 text-foreground" />
              </div>
              <div>
                <p className="font-bold text-foreground dark:text-foreground">
                  {selectedLeads.size} لید
                </p>
                <p className="text-xs text-foreground dark:text-foreground">
                  وضعیت آنها تغییر خواهد کرد
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>وضعیت جدید</Label>
              <Select
                value={bulkStatusValue}
                onValueChange={(val) => setBulkStatusValue(val as LeadStatus)}
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
            <div className="space-y-2">
              <Label htmlFor="bulk-status-note">یادداشت (اختیاری)</Label>
              <Textarea
                id="bulk-status-note"
                value={bulkStatusNote}
                onChange={(e) => setBulkStatusNote(e.target.value)}
                placeholder="دلیل تغییر وضعیت دسته‌ای..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBulkStatusDialogOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleBulkStatusChange}
       className="bg-foreground text-background hover:bg-foreground/85 gap-2"
              disabled={bulkProcessing}
            >
              {bulkProcessing ? 'در حال پردازش...' : 'تغییر وضعیت'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" />
              تأیید حذف دسته‌ای
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  آیا از حذف <strong className="text-red-600">{selectedLeads.size}</strong> لید اطمینان دارید؟
                </p>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border border-red-200 dark:border-red-900/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Trash2 className="size-4 text-red-500" />
                    <p className="font-semibold text-red-700 dark:text-red-400">هشدار</p>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    این عملیات غیرقابل بازگشت است. تمامی تعاملات مرتبط با این لیدها نیز حذف خواهند شد.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
              disabled={bulkProcessing}
            >
              {bulkProcessing ? 'در حال پردازش...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={singleDeleteDialogOpen} onOpenChange={setSingleDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" />
              تأیید حذف لید
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="text-sm text-muted-foreground">
                  آیا از حذف لید <strong className="text-red-600">{leadToDelete?.first_name} {leadToDelete?.last_name}</strong> اطمینان دارید؟
                </p>
                <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-lg">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <span>این عملیات غیرقابل بازگشت است. تمامی تعاملات مرتبط با این لید نیز حذف خواهند شد.</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSingleLead}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={bulkProcessing}
            >
              {bulkProcessing ? 'در حال پردازش...' : 'حذف'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lead Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              جزئیات لید
              {selectedLead && <StatusBadge status={selectedLead.status} />}
            </DialogTitle>
            <DialogDescription>
              مشاهده اطلاعات و تاریخچه تعاملات لید
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6">
              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">نام و نام خانوادگی</p>
                  <p className="font-medium">
                    {selectedLead.first_name} {selectedLead.last_name}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">شماره تماس</p>
                  <p className="font-medium font-mono" dir="ltr">{selectedLead.phone_number}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">منبع ورود</p>
                  <p className="font-medium">{sourceLabels[selectedLead.source] || selectedLead.source}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">فروشنده مسئول</p>
                  <p className="font-medium">
                    {selectedLead.assigned_to
                      ? `${selectedLead.assigned_to.first_name} ${selectedLead.assigned_to.last_name}`
                      : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">دوره هدف</p>
                  <p className="font-medium">{selectedLead.target_course?.title || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">تاریخ ثبت</p>
                  <p className="font-medium">{formatDate(selectedLead.createdAt)}</p>
                </div>
              </div>

              {selectedLead.notes && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    {selectedLead.source === 'diagnostic_bot' ? 'تحلیل عارضه‌یاب هوشمند کسب‌وکار' : 'یادداشت'}
                  </p>
                  {selectedLead.source === 'diagnostic_bot' ? (
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
                          {selectedLead.notes.replace(/--- گزارش عارضه‌یاب کسب‌وکار.*---/, '').trim()}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">{selectedLead.notes}</p>
                  )}
                </div>
              )}

              {/* Convert to Student Button */}
              {selectedLead.status !== 'CONVERTED' && (
                <div className="flex justify-center pt-2">
                  <Button
                    onClick={() => {
                      setConvertDialogOpen(true)
                    }}
          className="bg-foreground text-background hover:bg-foreground/85 gap-2"
                  >
                    <UserRoundCheck className="size-4" />
                    تبدیل به دانش‌پذیر
                  </Button>
                </div>
              )}

              <Separator />

              {/* Interaction History */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  تاریخچه تعاملات
                  <Badge variant="secondary" className="text-xs">
                    {leadInteractions.length}
                  </Badge>
                </h4>

                {leadInteractions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    تعاملی ثبت نشده است
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto pr-2">
                    <div className="space-y-2">
                      {leadInteractions.map((interaction) => (
                        <div
                          key={interaction.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="mt-0.5">
                            {interactionTypeIcons[interaction.interaction_type]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {interactionTypeLabels[interaction.interaction_type]}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {interaction.agent.first_name} {interaction.agent.last_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(interaction.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm">{interaction.content}</p>
                            {interaction.next_followup_date && (
                              <p className="text-xs text-foreground mt-1">
                                پیگیری: {formatDate(interaction.next_followup_date)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Add Interaction Form */}
              <div>
                <h4 className="font-semibold mb-3">ثبت تعامل جدید</h4>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Select
                      value={interactionForm.interaction_type}
                      onValueChange={(val) =>
                        setInteractionForm({ ...interactionForm, interaction_type: val as 'CALL' | 'NOTE' })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NOTE">یادداشت</SelectItem>
                        <SelectItem value="CALL">تماس</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Calendar className="size-4" />
                          {interactionForm.next_followup_date
                            ? formatDate(interactionForm.next_followup_date)
                            : 'تاریخ پیگیری'}
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
                          dir="rtl"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Textarea
                    value={interactionForm.content}
                    onChange={(e) =>
                      setInteractionForm({ ...interactionForm, content: e.target.value })
                    }
                    placeholder="محتوای تعامل..."
                    rows={2}
                  />
                  <Button
                    onClick={handleAddInteraction}
                    size="sm"
          className="bg-foreground text-background hover:bg-foreground/85 gap-2"
                    disabled={!interactionForm.content.trim()}
                  >
                    <Plus className="size-4" />
                    ثبت تعامل
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lead Convert Dialog */}
      {selectedLead && (
        <LeadConvertDialog
          lead={selectedLead}
          open={convertDialogOpen}
          onOpenChange={setConvertDialogOpen}
          onConverted={() => {
            setConvertDialogOpen(false)
            setDetailDialogOpen(false)
            fetchLeads()
          }}
        />
      )}
    </div>
  )
}
