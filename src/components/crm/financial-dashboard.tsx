'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Landmark, CreditCard, Search, Filter, CheckCircle2,
  XCircle, Clock, Hash, Building2, Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Payment {
  id: string
  amount: number
  payment_type: string
  status: string
  check_number?: string | null
  check_bank?: string | null
  check_date?: string | null
  check_status?: string | null
  createdAt: string
  enrollment?: {
    student?: {
      first_name: string
      last_name: string
    }
    course?: {
      title: string
    }
  } | null
}

const checkStatusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING: { label: 'در جریان', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock },
  CLEARED: { label: 'وصول شده', color: 'bg-muted/60 text-foreground border-border', icon: CheckCircle2 },
  BOUNCED: { label: 'برگشتی', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
}

const paymentTypeLabels: Record<string, string> = {
  CASH: 'نقدی',
  INSTALLMENT: 'اقساط',
  CHECK: 'چک',
  TRANSFER: 'واریز بانکی',
}

export default function FinancialDashboard() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [checkFilter, setCheckFilter] = useState('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/payments')
      if (res.ok) setPayments(await res.json())
    } catch {
      toast.error('خطا در بارگذاری پرداخت‌ها')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPayments() }, [fetchPayments])

  const updateCheckStatus = async (id: string, check_status: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ check_status }),
      })
      if (!res.ok) throw new Error()
      toast.success('وضعیت چک بروزرسانی شد')
      fetchPayments()
    } catch {
      toast.error('خطا در بروزرسانی')
    } finally {
      setUpdatingId(null)
    }
  }

  const filtered = payments.filter(p => {
    const matchType = typeFilter === 'all' || p.payment_type === typeFilter
    const matchCheck = checkFilter === 'all' || p.check_status === checkFilter
    const student = p.enrollment?.student
    const matchSearch = !searchQuery || (student && `${student.first_name} ${student.last_name}`.includes(searchQuery)) || p.check_number?.includes(searchQuery) || p.check_bank?.includes(searchQuery)
    return matchType && matchCheck && matchSearch
  })

  const totalIncome = filtered.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0)
  const pendingChecks = payments.filter(p => p.payment_type === 'CHECK' && p.check_status === 'PENDING').length

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 text-white shadow-md">
          <Landmark className="size-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">داشبورد مالی</h1>
          <p className="text-sm text-muted-foreground mt-0.5">مدیریت پرداخت‌ها و چک‌های دریافتی</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'کل پرداخت‌ها', value: payments.length.toLocaleString('fa-IR'), color: 'from-neutral-500 to-neutral-800', icon: CreditCard },
          { label: 'درآمد تایید شده', value: `${totalIncome.toLocaleString('fa-IR')} ت`, color: 'from-neutral-500 to-neutral-800', icon: CheckCircle2 },
          { label: 'چک‌های در جریان', value: pendingChecks.toLocaleString('fa-IR'), color: 'from-amber-500 to-neutral-800', icon: Clock },
          { label: 'چک‌های برگشتی', value: payments.filter(p => p.check_status === 'BOUNCED').length.toLocaleString('fa-IR'), color: 'from-red-500 to-rose-500', icon: XCircle },
        ].map((card) => (
          <div key={card.label} className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} text-white shadow-sm`}>
            <card.icon className="size-5 mb-2 opacity-90" />
            <p className="text-xl font-bold">{card.value}</p>
            <p className="text-xs opacity-80 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="جستجو دانش‌پذیر یا شماره چک..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-10 w-60" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="نوع پرداخت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه انواع</SelectItem>
            <SelectItem value="CASH">نقدی</SelectItem>
            <SelectItem value="CHECK">چک</SelectItem>
            <SelectItem value="INSTALLMENT">اقساط</SelectItem>
            <SelectItem value="TRANSFER">واریز</SelectItem>
          </SelectContent>
        </Select>
        <Select value={checkFilter} onValueChange={setCheckFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="وضعیت چک" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            <SelectItem value="PENDING">در جریان</SelectItem>
            <SelectItem value="CLEARED">وصول شده</SelectItem>
            <SelectItem value="BOUNCED">برگشتی</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payments Table */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <Landmark className="size-14 opacity-30 mb-4" />
          <p className="text-lg font-medium">پرداختی یافت نشد</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="space-y-3">
            {filtered.map((payment, i) => {
              const student = payment.enrollment?.student
              const course = payment.enrollment?.course
              const checkCfg = payment.check_status ? checkStatusConfig[payment.check_status] : null
              const CheckIcon = checkCfg?.icon

              return (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="bg-card border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="size-10 rounded-lg bg-muted/60 dark:bg-muted/20 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="size-5 text-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {student ? `${student.first_name} ${student.last_name}` : 'دانش‌پذیر نامشخص'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {course?.title || 'دوره نامشخص'} · {paymentTypeLabels[payment.payment_type] || payment.payment_type}
                        </p>
                      </div>
                    </div>

                    <div className="text-left flex-shrink-0">
                      <p className="text-lg font-bold text-foreground">{payment.amount.toLocaleString('fa-IR')} ت</p>
                    </div>

                    {/* Check fields */}
                    {payment.payment_type === 'CHECK' && (
                      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground pt-2 border-t">
                        {payment.check_number && (
                          <div className="flex items-center gap-1.5">
                            <Hash className="size-3" />
                            <span>{payment.check_number}</span>
                          </div>
                        )}
                        {payment.check_bank && (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="size-3" />
                            <span>{payment.check_bank}</span>
                          </div>
                        )}
                        {payment.check_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="size-3" />
                            <span>{new Date(payment.check_date).toLocaleDateString('fa-IR')}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {checkCfg && CheckIcon && (
                            <Badge variant="outline" className={`gap-1 text-xs ${checkCfg.color}`}>
                              <CheckIcon className="size-3" />
                              {checkCfg.label}
                            </Badge>
                          )}
                          <Select
                            value={payment.check_status || ''}
                            onValueChange={(v) => updateCheckStatus(payment.id, v)}
                            disabled={updatingId === payment.id}
                          >
                            <SelectTrigger className="h-7 text-xs w-32">
                              <SelectValue placeholder="تغییر وضعیت" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">در جریان</SelectItem>
                              <SelectItem value="CLEARED">وصول شده</SelectItem>
                              <SelectItem value="BOUNCED">برگشتی</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
