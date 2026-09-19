'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserRoundCheck, GraduationCap, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'

interface Course {
  id: string
  title: string
  price: number
}

interface Lead {
  id: string
  phone_number: string
  first_name: string
  last_name: string
  status: string
  target_course_id: string | null
  target_course: Course | null
  assigned_to: { id: string; first_name: string; last_name: string } | null
}

interface LeadConvertDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: Lead | null
  onConverted: () => void
}

const paymentStatusLabels: Record<string, string> = {
  PAID: 'پرداخت شده',
  INSTALLMENT: 'اقساطی',
}

export default function LeadConvertDialog({
  open,
  onOpenChange,
  lead,
  onConverted,
}: LeadConvertDialogProps) {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<string>('PAID')
  const [converting, setConverting] = useState(false)

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      const res = await fetch('/api/courses')
      if (res.ok) {
        const data = await res.json()
        setCourses(data.filter((c: Course & { is_active: boolean }) => c.is_active))
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchCourses()
      // Pre-fill from lead's target course
      if (lead?.target_course_id) {
        setSelectedCourseId(lead.target_course_id)
      } else {
        setSelectedCourseId('')
      }
      setPaymentStatus('PAID')
    }
  }, [open, lead, fetchCourses])

  const handleConvert = async () => {
    if (!lead || !selectedCourseId) {
      toast.error('لطفاً دوره مورد نظر را انتخاب کنید')
      return
    }

    setConverting(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_id: selectedCourseId,
          payment_status: paymentStatus,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(
          `لید ${lead.first_name} ${lead.last_name} با موفقیت به دانش‌پذیر تبدیل شد`
        )
        onOpenChange(false)
        onConverted()
      } else {
        const data = await res.json()
        toast.error(data.error || 'خطا در تبدیل لید')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    } finally {
      setConverting(false)
    }
  }

  if (!lead) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundCheck className="size-5 text-foreground" />
            تبدیل لید به دانش‌پذیر
          </DialogTitle>
          <DialogDescription>
            با این عمل، لید انتخاب‌شده به دانش‌پذیر تبدیل و در دوره ثبت‌نام می‌شود
          </DialogDescription>
        </DialogHeader>

        {/* Lead Info Card */}
        <Card className="border-border dark:border-border bg-muted/60 dark:bg-muted/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-muted/60 dark:bg-muted/20 flex items-center justify-center">
                <span className="text-sm font-bold text-foreground dark:text-foreground">
                  {lead.first_name?.[0] || '?'}
                </span>
              </div>
              <div>
                <p className="font-medium">
                  {lead.first_name} {lead.last_name}
                </p>
                <p className="text-xs text-muted-foreground font-mono" dir="ltr">
                  {lead.phone_number}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">دوره هدف: </span>
                <span className="font-medium">
                  {lead.target_course?.title || '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">کارشناس: </span>
                <span className="font-medium">
                  {lead.assigned_to
                    ? `${lead.assigned_to.first_name} ${lead.assigned_to.last_name}`
                    : '—'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Conversion Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>دوره ثبت‌نام *</Label>
            <Select
              value={selectedCourseId}
              onValueChange={setSelectedCourseId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="انتخاب دوره" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="size-3.5" />
                      <span>{course.title}</span>
                      <span className="text-muted-foreground text-xs">
                        ({course.price.toLocaleString('fa-IR')} تومان)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>وضعیت پرداخت</Label>
            <Select
              value={paymentStatus}
              onValueChange={setPaymentStatus}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentStatusLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="size-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              پس از تبدیل، وضعیت لید به «تبدیل شده» تغییر می‌کند و یک حساب دانش‌پذیر با شماره تماس لید ایجاد خواهد شد. اگر کاربری با این شماره از قبل وجود داشته باشد، از همان حساب استفاده می‌شود.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={converting}
          >
            انصراف
          </Button>
          <Button
            onClick={handleConvert}
      className="bg-foreground text-background hover:bg-foreground/85 gap-2"
            disabled={!selectedCourseId || converting}
          >
            <UserRoundCheck className="size-4" />
            {converting ? 'در حال تبدیل...' : 'تبدیل'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
