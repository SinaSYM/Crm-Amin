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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { useCRMStore } from '@/lib/store'
import EmptyState from '@/components/crm/empty-state'
import {
  PlusCircle,
  Pencil,
  Trash2,
  BookOpen,
  CheckCircle2,
  XCircle,
  Search,
  Users,
  TrendingUp,
  LayoutGrid,
  List,
  CalendarDays,
  GraduationCap,
  BookMarked,
  AlertTriangle,
} from 'lucide-react'

interface CapacityInfo {
  capacity: number
  currentEnrollments: number
  availableSpots: number
  utilizationPercentage: number
}

interface Course {
  id: string
  title: string
  price: number
  capacity: number
  is_active: boolean
  description?: string
  createdAt: string
  updatedAt: string
  capacityInfo?: CapacityInfo
  _count?: {
    leads: number
    enrollments: number
  }
}

const formatPrice = (price: number) => {
  return price.toLocaleString('fa-IR')
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

function getCapacityColor(percentage: number) {
  if (percentage >= 90) return { bar: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', label: 'ظرفیت تکمیل' }
  if (percentage >= 70) return { bar: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', label: 'نزدیک تکمیل' }
  return { bar: 'bg-muted/60', bg: 'bg-muted/60 dark:bg-muted/20', text: 'text-foreground dark:text-foreground', label: 'ظرفیت موجود' }
}

export default function CoursesPage() {
  const { currentUser } = useCRMStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive' | 'full'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formPrice, setFormPrice] = useState('')
  const [formCapacity, setFormCapacity] = useState('30')
  const [formIsActive, setFormIsActive] = useState(true)

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeFilter === 'active') {
        params.set('is_active', 'true')
      } else if (activeFilter === 'inactive') {
        params.set('is_active', 'false')
      }
      // 'full' filter is client-side
      const res = await fetch(`/api/courses?${params.toString()}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setCourses(data)
    } catch {
      toast.error('خطا در بارگذاری دوره‌ها')
    } finally {
      setLoading(false)
    }
  }, [activeFilter])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  const filteredCourses = useMemo(() => {
    let result = courses
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((c) => c.title.toLowerCase().includes(q))
    }
    // 'full' filter: show courses near or at capacity (>=70%)
    if (activeFilter === 'full') {
      result = result.filter((c) => {
        const pct = c.capacityInfo?.utilizationPercentage ?? 0
        return pct >= 70
      })
    }
    return result
  }, [courses, searchQuery, activeFilter])

  // Statistics
  const stats = useMemo(() => {
    const total = courses.length
    const active = courses.filter((c) => c.is_active).length
    const inactive = total - active
    const fullCapacity = courses.filter((c) => (c.capacityInfo?.utilizationPercentage ?? 0) >= 90).length
    return { total, active, inactive, fullCapacity }
  }, [courses])

  const openCreateDialog = () => {
    setEditingCourse(null)
    setFormTitle('')
    setFormPrice('')
    setFormCapacity('30')
    setFormIsActive(true)
    setDialogOpen(true)
  }

  const openEditDialog = (course: Course) => {
    setEditingCourse(course)
    setFormTitle(course.title)
    setFormPrice(course.price.toString())
    setFormCapacity(course.capacity.toString())
    setFormIsActive(course.is_active)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error('لطفاً عنوان دوره را وارد کنید')
      return
    }

    const priceValue = parseFloat(formPrice) || 0
    const capacityValue = parseInt(formCapacity) || 30

    setSaving(true)
    try {
      const payload = {
        title: formTitle.trim(),
        price: priceValue,
        capacity: capacityValue,
        is_active: formIsActive,
      }

      if (editingCourse) {
        const res = await fetch(`/api/courses/${editingCourse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.success('دوره با موفقیت ویرایش شد')
      } else {
        const res = await fetch('/api/courses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.success('دوره جدید با موفقیت ایجاد شد')
      }

      setDialogOpen(false)
      fetchCourses()
    } catch {
      toast.error('خطا در ذخیره‌سازی')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (courseId: string) => {
    setDeleting(courseId)
    try {
      const res = await fetch(`/api/courses/${courseId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('دوره با موفقیت حذف شد')
      fetchCourses()
    } catch {
      toast.error('خطا در حذف دوره')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 text-white shadow-md shadow-neutral-400/30 dark:shadow-neutral-400/30">
            <BookOpen className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">مدیریت دوره‌ها</h1>
            <p className="text-sm text-muted-foreground mt-0.5">مدیریت دوره‌های آموزشی مؤسسه</p>
          </div>
        </div>
        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SALES_MANAGER') && (
          <Button onClick={openCreateDialog} className="gap-2 bg-foreground text-background hover:bg-foreground/85 shadow-sm">
            <PlusCircle className="size-4" />
            افزودن دوره جدید
          </Button>
        )}
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-center size-10 rounded-lg bg-muted/60 dark:bg-muted/20">
            <BookMarked className="size-5 text-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stats.total.toLocaleString('fa-IR')}</p>
            <p className="text-xs text-muted-foreground">کل دوره‌ها</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-center size-10 rounded-lg bg-green-100 dark:bg-green-950/30">
            <CheckCircle2 className="size-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.active.toLocaleString('fa-IR')}</p>
            <p className="text-xs text-muted-foreground">فعال</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-center size-10 rounded-lg bg-red-100 dark:bg-red-950/30">
            <XCircle className="size-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.inactive.toLocaleString('fa-IR')}</p>
            <p className="text-xs text-muted-foreground">غیرفعال</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-center size-10 rounded-lg bg-amber-100 dark:bg-amber-950/30">
            <AlertTriangle className="size-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.fullCapacity.toLocaleString('fa-IR')}</p>
            <p className="text-xs text-muted-foreground">ظرفیت تکمیل</p>
          </div>
        </div>
      </div>

      {/* Filter + Search + View Toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          {(
            [
              { key: 'all', label: 'همه' },
              { key: 'active', label: 'فعال' },
              { key: 'inactive', label: 'غیرفعال' },
              { key: 'full', label: 'ظرفیت تکمیل' },
            ] as const
          ).map((filter) => (
            <Button
              key={filter.key}
              variant={activeFilter === filter.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter.key)}
              className={
                activeFilter === filter.key
                  ? 'bg-foreground text-background hover:bg-foreground/85'
                  : ''
              }
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="جستجوی دوره بر اساس عنوان..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg border bg-card p-1 gap-0.5">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            className={`size-8 p-0 ${viewMode === 'grid' ? 'bg-foreground text-background hover:bg-foreground/85' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className={`size-8 p-0 ${viewMode === 'list' ? 'bg-foreground text-background hover:bg-foreground/85' : ''}`}
            onClick={() => setViewMode('list')}
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {/* Courses Grid/List */}
      {loading ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={viewMode === 'grid' ? 'h-72 rounded-xl' : 'h-28 rounded-xl'} />
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          badgeIcon={Search}
          title="دوره‌ای یافت نشد"
          description={
            searchQuery
              ? 'نتیجه‌ای برای جستجوی شما پیدا نشد. عبارت دیگری را امتحان کنید.'
              : 'هنوز دوره‌ای به سیستم اضافه نشده است. از دکمه «افزودن دوره جدید» استفاده کنید.'
          }
          action={
            !searchQuery && (
              <Button
                onClick={openCreateDialog}
                variant="outline"
                className="gap-2 border-border text-foreground hover:bg-muted/50 dark:border-border dark:text-foreground dark:hover:bg-muted/50"
              >
                <PlusCircle className="size-4" />
                ایجاد اولین دوره
              </Button>
            )
          }
        />
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredCourses.map((course) => {
              const enrollmentCount = course._count?.enrollments ?? 0
              const capacity = course.capacityInfo?.capacity ?? course.capacity ?? 30
              const utilizationPct = course.capacityInfo?.utilizationPercentage ?? 0
              const leadCount = course._count?.leads ?? 0
              const capacityColor = getCapacityColor(utilizationPct)
              const availableSpots = course.capacityInfo?.availableSpots ?? Math.max(0, capacity - enrollmentCount)

              return (
                <motion.div
                  key={course.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-neutral-400/30 dark:hover:shadow-neutral-400/30 hover:-translate-y-1 hover:scale-[1.02] group">
                    {/* Gradient header band */}
                    <div
                      className={`relative h-20 overflow-hidden ${
                        course.is_active
                          ? 'bg-gradient-to-l from-neutral-500 via-neutral-400 to-neutral-800'
                          : 'bg-gradient-to-l from-red-400 via-red-300 to-neutral-800'
                      }`}
                    >
                      {/* Decorative book icon (partially transparent) */}
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 size-16 text-white/15" />
                      {/* Status badge on gradient */}
                      <div className="absolute top-3 right-3">
                        {course.is_active ? (
                          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm gap-1 text-xs hover:bg-white/30">
                            <CheckCircle2 className="size-3" />
                            فعال
                          </Badge>
                        ) : (
                          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm gap-1 text-xs hover:bg-white/30">
                            <XCircle className="size-3" />
                            غیرفعال
                          </Badge>
                        )}
                      </div>
                      {/* Lead interest indicator */}
                      {leadCount > 0 && (
                        <div className="absolute bottom-3 left-3">
                          <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm gap-1 text-xs hover:bg-white/30">
                            <TrendingUp className="size-3" />
                            {leadCount.toLocaleString('fa-IR')} لید
                          </Badge>
                        </div>
                      )}
                      {/* Capacity badge */}
                      {utilizationPct >= 70 && (
                        <div className="absolute bottom-3 right-3">
                          <Badge className={`backdrop-blur-sm gap-1 text-xs ${
                            utilizationPct >= 90
                              ? 'bg-red-500/80 text-white border-red-400/30'
                              : 'bg-amber-500/80 text-white border-amber-400/30'
                          }`}>
                            {capacityColor.label}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base leading-relaxed font-semibold line-clamp-2">
                          {course.title}
                        </CardTitle>
                        {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SALES_MANAGER') && (
                          <CardAction>
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-foreground hover:text-foreground hover:bg-muted/50"
                                onClick={() => openEditDialog(course)}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDelete(course.id)}
                                disabled={deleting === course.id}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </CardAction>
                        )}
                      </div>
                      {/* Description if available */}
                      {course.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">
                          {course.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {/* Prominent Price */}
                      <div className="flex items-baseline justify-between rounded-lg bg-gradient-to-l from-neutral-500 to-neutral-800 dark:from-neutral-500 dark:to-neutral-800 p-3 border border-border dark:border-border">
                        <span className="text-sm text-muted-foreground">قیمت</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold text-foreground dark:text-foreground">
                            {formatPrice(course.price)}
                          </span>
                          <span className="text-xs text-foreground dark:text-foreground font-medium">تومان</span>
                        </div>
                      </div>

                      {/* Capacity progress bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <GraduationCap className="size-3.5 text-foreground" />
                            ظرفیت: {enrollmentCount.toLocaleString('fa-IR')} از {capacity.toLocaleString('fa-IR')}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold tabular-nums ${capacityColor.text}`}>
                              {utilizationPct.toLocaleString('fa-IR')}٪
                            </span>
                            {availableSpots > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                ({availableSpots.toLocaleString('fa-IR')} جای خالی)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${utilizationPct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${capacityColor.bar}`}
                          />
                        </div>
                      </div>

                      {/* Bottom row: created date */}
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="size-3.5" />
                          <span>{formatPersianDate(course.createdAt)}</span>
                        </div>
                        {course._count && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Users className="size-3.5 text-foreground" />
                              <span>{course._count.enrollments.toLocaleString('fa-IR')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredCourses.map((course) => {
              const enrollmentCount = course._count?.enrollments ?? 0
              const capacity = course.capacityInfo?.capacity ?? course.capacity ?? 30
              const utilizationPct = course.capacityInfo?.utilizationPercentage ?? 0
              const leadCount = course._count?.leads ?? 0
              const capacityColor = getCapacityColor(utilizationPct)
              const availableSpots = course.capacityInfo?.availableSpots ?? Math.max(0, capacity - enrollmentCount)

              return (
                <motion.div
                  key={course.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-neutral-400/30 dark:hover:shadow-neutral-400/30 group">
                    {/* Left status stripe */}
                    <div
                      className={`absolute right-0 top-0 bottom-0 w-1 ${
                        course.is_active
                          ? 'bg-gradient-to-b from-neutral-500 to-neutral-800'
                          : 'bg-gradient-to-b from-red-400 to-neutral-800'
                      }`}
                    />
                    <CardContent className="flex items-center gap-5 p-4 pr-5">
                      {/* Icon */}
                      <div
                        className={`flex items-center justify-center size-12 rounded-xl shrink-0 ${
                          course.is_active
                            ? 'bg-gradient-to-br from-neutral-500 to-neutral-800 text-white shadow-md shadow-neutral-400/30 dark:shadow-neutral-400/30'
                            : 'bg-gradient-to-br from-red-400 to-neutral-800 text-white shadow-md shadow-red-200 dark:shadow-red-950/30'
                        }`}
                      >
                        <BookOpen className="size-5" />
                      </div>

                      {/* Title + Description */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{course.title}</h3>
                          {course.is_active ? (
                            <Badge variant="outline" className="bg-muted/60 text-foreground border-border gap-1 text-xs shrink-0">
                              <CheckCircle2 className="size-3" />
                              فعال
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 gap-1 text-xs shrink-0">
                              <XCircle className="size-3" />
                              غیرفعال
                            </Badge>
                          )}
                          {utilizationPct >= 70 && (
                            <Badge variant="outline" className={`${capacityColor.bg} ${capacityColor.text} gap-1 text-xs shrink-0`}>
                              {capacityColor.label}
                            </Badge>
                          )}
                        </div>
                        {course.description && (
                          <p className="text-xs text-muted-foreground truncate">{course.description}</p>
                        )}
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-1 shrink-0">
                        <span className="text-lg font-bold text-foreground dark:text-foreground">
                          {formatPrice(course.price)}
                        </span>
                        <span className="text-xs text-foreground dark:text-foreground font-medium">تومان</span>
                      </div>

                      {/* Capacity info */}
                      <div className="w-36 shrink-0 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <GraduationCap className="size-3" />
                            ظرفیت
                          </span>
                          <span className={`font-bold tabular-nums ${capacityColor.text}`}>
                            {enrollmentCount.toLocaleString('fa-IR')}/{capacity.toLocaleString('fa-IR')} ({utilizationPct.toLocaleString('fa-IR')}٪)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${utilizationPct}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full ${capacityColor.bar}`}
                          />
                        </div>
                        {availableSpots > 0 && (
                          <p className="text-[10px] text-muted-foreground text-center">
                            {availableSpots.toLocaleString('fa-IR')} جای خالی
                          </p>
                        )}
                      </div>

                      {/* Lead count */}
                      {leadCount > 0 && (
                        <Badge variant="outline" className="bg-muted/60 text-foreground border-border dark:bg-muted/20 dark:text-foreground dark:border-border gap-1 text-xs shrink-0">
                          <TrendingUp className="size-3" />
                          {leadCount.toLocaleString('fa-IR')} لید
                        </Badge>
                      )}

                      {/* Date */}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <CalendarDays className="size-3.5" />
                        <span>{formatPersianDate(course.createdAt)}</span>
                      </div>

                      {/* Actions */}
                      {(currentUser?.role === 'ADMIN' || currentUser?.role === 'SALES_MANAGER') && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-foreground hover:text-foreground hover:bg-muted/50"
                            onClick={() => openEditDialog(course)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(course.id)}
                            disabled={deleting === course.id}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl">
              {editingCourse ? 'ویرایش دوره' : 'افزودن دوره جدید'}
            </DialogTitle>
            <DialogDescription>
              {editingCourse
                ? 'اطلاعات دوره را ویرایش کنید'
                : 'اطلاعات دوره جدید را وارد کنید'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <div className="space-y-2">
              <Label htmlFor="course_title" className="text-sm font-medium">عنوان دوره</Label>
              <Input
                id="course_title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="عنوان دوره"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course_price" className="text-sm font-medium">قیمت (تومان)</Label>
              <Input
                id="course_price"
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="مثال: ۵۰۰۰۰۰۰"
                dir="ltr"
                className="text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course_capacity" className="text-sm font-medium">ظرفیت (تعداد دانش‌پذیر)</Label>
              <Input
                id="course_capacity"
                type="number"
                value={formCapacity}
                onChange={(e) => setFormCapacity(e.target.value)}
                placeholder="مثال: ۳۰"
                dir="ltr"
                className="text-right"
              />
              <p className="text-[11px] text-muted-foreground">حداکثر تعداد دانش‌پذیر قابل ثبت‌نام در این دوره</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
              <Label htmlFor="course_active" className="cursor-pointer font-medium">
                وضعیت دوره
              </Label>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${formIsActive ? 'text-foreground' : 'text-red-500'}`}>
                  {formIsActive ? 'فعال' : 'غیرفعال'}
                </span>
                <Switch
                  id="course_active"
                  checked={formIsActive}
                  onCheckedChange={setFormIsActive}
                />
              </div>
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
              {saving ? 'در حال ذخیره...' : editingCourse ? 'ویرایش' : 'ایجاد'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
