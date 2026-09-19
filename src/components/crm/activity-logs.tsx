'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  History, Search, Filter, User, Clock, ChevronLeft, ChevronRight,
  ShieldAlert, FileText, UserPlus, Trash2, Edit2, LogIn, Bell,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface ActivityLog {
  id: string
  user_id: string
  user_name: string
  user_role: string
  action: string
  description: string
  createdAt: string
}

const actionConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  CREATE_LEAD: { label: 'ایجاد لید', color: 'bg-muted/60 text-foreground border-border', icon: UserPlus },
  UPDATE_LEAD: { label: 'ویرایش لید', color: 'bg-muted/60 text-foreground border-border', icon: Edit2 },
  DELETE_LEAD: { label: 'حذف لید', color: 'bg-red-100 text-red-700 border-red-200', icon: Trash2 },
  UPDATE_LEAD_STATUS: { label: 'تغییر وضعیت لید', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Filter },
  CREATE_USER: { label: 'افزودن کاربر', color: 'bg-muted/60 text-foreground border-border', icon: UserPlus },
  UPDATE_USER: { label: 'ویرایش کاربر', color: 'bg-muted/60 text-foreground border-border', icon: Edit2 },
  DELETE_USER: { label: 'حذف کاربر', color: 'bg-red-100 text-red-700 border-red-200', icon: Trash2 },
  CREATE_ENROLLMENT: { label: 'ثبت‌نام', color: 'bg-muted/60 text-foreground border-border', icon: FileText },
  CREATE_PAYMENT: { label: 'ثبت پرداخت', color: 'bg-green-100 text-green-700 border-green-200', icon: FileText },
  UPDATE_PAYMENT: { label: 'ویرایش پرداخت', color: 'bg-muted/60 text-foreground border-border', icon: Edit2 },
  REMINDER_DISPATCH_SUCCESS: { label: 'یادآور ارسال شد', color: 'bg-muted/60 text-foreground border-border', icon: Bell },
  REMINDER_DISPATCH_FAILURE: { label: 'خطا در یادآور', color: 'bg-red-100 text-red-700 border-red-200', icon: Bell },
}

const roleLabels: Record<string, string> = {
  ADMIN: 'ادمین',
  SALES_MANAGER: 'مدیر فروش',
  SALES_AGENT: 'کارشناس فروش',
  STUDENT: 'دانش‌پذیر',
  EDUCATION_OFFICER: 'مسئول آموزش',
  FINANCIAL_OFFICER: 'مسئول امور مالی',
  MENTOR: 'منتور',
  DEPT_MANAGER: 'مدیر دپارتمان',
  SYSTEM: 'سیستم',
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const perPage = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set('search', searchQuery)
      if (actionFilter !== 'all') params.set('action', actionFilter)
      const res = await fetch(`/api/logs?${params.toString()}&limit=500`)
      if (res.ok) {
        const data = await res.json()
        // API returns { logs, total }; be defensive against shape changes
        setLogs(Array.isArray(data) ? data : Array.isArray(data?.logs) ? data.logs : [])
        setPage(1)
      }
    } catch {
      toast.error('خطا در بارگذاری لاگ‌ها')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, actionFilter])

  useEffect(() => {
    const t = setTimeout(fetchLogs, 300)
    return () => clearTimeout(t)
  }, [fetchLogs])

  const paginated = logs.slice((page - 1) * perPage, page * perPage)
  const totalPages = Math.ceil(logs.length / perPage)

  const formatTime = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(new Date(dateStr))
    } catch { return dateStr }
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-slate-600 to-gray-700 text-white shadow-md">
          <History className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">لاگ‌های سیستم</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تاریخچه کامل فعالیت‌های کاربران</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
          <History className="size-3.5" />
          {logs.length.toLocaleString('fa-IR')} رویداد
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="جستجو در لاگ‌ها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="فیلتر نوع رویداد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه رویدادها</SelectItem>
            {Object.entries(actionConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : paginated.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <History className="size-14 opacity-30 mb-4" />
          <p className="text-lg font-medium">رویدادی یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginated.map((log, i) => {
            const cfg = actionConfig[log.action]
            const LogIcon = cfg?.icon || ShieldAlert
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-start gap-3 p-4 bg-card border rounded-xl hover:shadow-sm transition-shadow"
              >
                <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg?.color || 'bg-gray-100 text-gray-600'}`}>
                  <LogIcon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-xs gap-1 ${cfg?.color || ''}`}>
                      {cfg?.label || log.action}
                    </Badge>
                    <span className="text-sm font-medium">{log.user_name}</span>
                    <span className="text-xs text-muted-foreground">({roleLabels[log.user_role] || log.user_role})</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{log.description}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
                  <Clock className="size-3" />
                  {formatTime(log.createdAt)}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronRight className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
