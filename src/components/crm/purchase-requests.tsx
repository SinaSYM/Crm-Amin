'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShoppingCart, Plus, Check, X, Clock, CheckCircle2, XCircle,
  Search, Eye, ChevronDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useCRMStore } from '@/lib/store'

interface PurchaseRequest {
  id: string
  item_name: string
  amount: number
  quantity: number
  description: string
  status: string
  createdAt: string
  requester: {
    id: string
    first_name: string
    last_name: string
    role: string
  }
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'در انتظار بررسی', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  APPROVED: { label: 'تایید شده', color: 'bg-muted/60 text-foreground border-border', icon: CheckCircle2 },
  REJECTED: { label: 'رد شده', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
}

const canApprove = (role: string) => ['ADMIN', 'FINANCIAL_OFFICER', 'DEPT_MANAGER'].includes(role)

export default function PurchaseRequestsPage() {
  const { currentUser } = useCRMStore()
  const [requests, setRequests] = useState<PurchaseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialog, setDetailDialog] = useState<PurchaseRequest | null>(null)
  const [saving, setSaving] = useState(false)

  const [formItem, setFormItem] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formQty, setFormQty] = useState('1')
  const [formDesc, setFormDesc] = useState('')

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/purchases')
      if (res.ok) setRequests(await res.json())
    } catch {
      toast.error('خطا در بارگذاری درخواست‌ها')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const filtered = requests.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchSearch = !searchQuery || r.item_name.includes(searchQuery) || r.description.includes(searchQuery)
    return matchStatus && matchSearch
  })

  const handleSubmit = async () => {
    if (!formItem.trim() || !formAmount) { toast.error('لطفاً فیلدهای ضروری را پر کنید'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_name: formItem.trim(), amount: Number(formAmount), quantity: Number(formQty), description: formDesc.trim() }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'خطا') }
      toast.success('درخواست خرید ثبت شد')
      setDialogOpen(false)
      setFormItem(''); setFormAmount(''); setFormQty('1'); setFormDesc('')
      fetchRequests()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'خطا در ثبت')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/purchases/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success(status === 'APPROVED' ? 'درخواست تایید شد' : 'درخواست رد شد')
      setDetailDialog(null)
      fetchRequests()
    } catch {
      toast.error('خطا در بروزرسانی وضعیت')
    }
  }

  const totalAmount = filtered.reduce((sum, r) => sum + (r.amount * r.quantity), 0)

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 text-white shadow-md">
            <ShoppingCart className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">درخواست‌های خرید</h1>
            <p className="text-sm text-muted-foreground mt-0.5">مدیریت و تایید سفارشات تجهیزات</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-foreground text-background hover:bg-foreground/85">
          <Plus className="size-4" />
          درخواست جدید
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'همه', count: requests.length, color: 'bg-muted/60 text-foreground border-border' },
          { label: 'در انتظار', count: requests.filter(r => r.status === 'PENDING').length, color: 'bg-amber-50 text-amber-700 border-amber-200' },
          { label: 'تایید شده', count: requests.filter(r => r.status === 'APPROVED').length, color: 'bg-muted/60 text-foreground border-border' },
          { label: 'رد شده', count: requests.filter(r => r.status === 'REJECTED').length, color: 'bg-red-50 text-red-700 border-red-200' },
        ].map(s => (
          <div key={s.label} className={`p-3 rounded-xl border ${s.color} text-center`}>
            <p className="text-2xl font-bold">{s.count.toLocaleString('fa-IR')}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="جستجو..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10 w-52" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="فیلتر وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="PENDING">در انتظار</SelectItem>
            <SelectItem value="APPROVED">تایید شده</SelectItem>
            <SelectItem value="REJECTED">رد شده</SelectItem>
          </SelectContent>
        </Select>
        {filtered.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mr-auto">
            <span>جمع کل:</span>
            <span className="font-semibold text-foreground">{totalAmount.toLocaleString('fa-IR')} تومان</span>
          </div>
        )}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <ShoppingCart className="size-14 opacity-30 mb-4" />
          <p className="text-lg font-medium">درخواستی یافت نشد</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((req, i) => {
              const statusCfg = statusConfig[req.status] || statusConfig.PENDING
              const StatusIcon = statusCfg.icon
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="size-10 rounded-lg bg-muted/60 dark:bg-muted/20 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="size-5 text-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{req.item_name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          توسط: {req.requester.first_name} {req.requester.last_name} ·{' '}
                          {(req.amount * req.quantity).toLocaleString('fa-IR')} تومان
                          {req.quantity > 1 && ` (${req.quantity.toLocaleString('fa-IR')} × ${req.amount.toLocaleString('fa-IR')})`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={`gap-1 ${statusCfg.color}`}>
                        <StatusIcon className="size-3" />
                        {statusCfg.label}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setDetailDialog(req)} className="gap-1 text-foreground hover:bg-muted/50">
                        <Eye className="size-3.5" />
                        جزئیات
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}

      {/* New Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ثبت درخواست خرید</DialogTitle>
            <DialogDescription>جزئیات سفارش مورد نیاز را وارد کنید</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label>نام کالا / خدمت *</Label><Input value={formItem} onChange={(e) => setFormItem(e.target.value)} placeholder="مثلاً: پروژکتور اجاره‌ای" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>قیمت واحد (تومان) *</Label><Input type="number" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0" dir="ltr" /></div>
              <div className="space-y-1.5"><Label>تعداد</Label><Input type="number" value={formQty} onChange={(e) => setFormQty(e.target.value)} min="1" dir="ltr" /></div>
            </div>
            <div className="space-y-1.5"><Label>توضیحات</Label><textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} placeholder="توضیحات بیشتر..." className="w-full rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/30" /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}><X className="size-4 ml-1" />انصراف</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-foreground text-background hover:bg-foreground/85 min-w-[100px]">
              {saving ? 'در حال ثبت...' : 'ثبت درخواست'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail / Approve Dialog */}
      <Dialog open={!!detailDialog} onOpenChange={(open) => { if (!open) setDetailDialog(null) }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingCart className="size-5 text-foreground" />جزئیات درخواست</DialogTitle>
          </DialogHeader>
          {detailDialog && (() => {
            const cfg = statusConfig[detailDialog.status]
            const StatusIcon = cfg.icon
            return (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-muted/40 rounded-xl space-y-2 text-sm">
                  <p><span className="text-muted-foreground">کالا:</span> <span className="font-medium">{detailDialog.item_name}</span></p>
                  <p><span className="text-muted-foreground">قیمت واحد:</span> <span className="font-medium">{detailDialog.amount.toLocaleString('fa-IR')} تومان</span></p>
                  <p><span className="text-muted-foreground">تعداد:</span> <span className="font-medium">{detailDialog.quantity.toLocaleString('fa-IR')}</span></p>
                  <p><span className="text-muted-foreground">جمع کل:</span> <span className="font-bold text-foreground">{(detailDialog.amount * detailDialog.quantity).toLocaleString('fa-IR')} تومان</span></p>
                  {detailDialog.description && <p><span className="text-muted-foreground">توضیحات:</span> {detailDialog.description}</p>}
                  <p><span className="text-muted-foreground">درخواست‌دهنده:</span> {detailDialog.requester.first_name} {detailDialog.requester.last_name}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-muted-foreground">وضعیت:</span>
                    <Badge variant="outline" className={`gap-1 ${cfg.color}`}>
                      <StatusIcon className="size-3" />
                      {cfg.label}
                    </Badge>
                  </div>
                </div>
                {currentUser && canApprove(currentUser.role) && detailDialog.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <Button onClick={() => updateStatus(detailDialog.id, 'APPROVED')} className="flex-1 gap-1 bg-foreground text-background hover:bg-foreground/85">
                      <Check className="size-4" />تایید
                    </Button>
                    <Button onClick={() => updateStatus(detailDialog.id, 'REJECTED')} variant="outline" className="flex-1 gap-1 text-red-600 border-red-200 hover:bg-red-50">
                      <X className="size-4" />رد درخواست
                    </Button>
                  </div>
                )}
              </div>
            )
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialog(null)}>بستن</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
