'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GraduationCap, Plus, Pencil, Trash2, Phone, Mail, Search,
  Check, X, BookOpen, Star
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

interface Teacher {
  id: string
  name: string
  phone_number: string
  email?: string | null
  specialty: string
  status: string
  createdAt: string
}

const statusLabels: Record<string, string> = {
  ACTIVE: 'فعال',
  INACTIVE: 'غیرفعال',
  ON_LEAVE: 'مرخصی',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-muted/60 text-foreground border-border',
  INACTIVE: 'bg-red-100 text-red-700 border-red-200',
  ON_LEAVE: 'bg-amber-100 text-amber-700 border-amber-200',
}

export default function TeacherCoordination() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [saving, setSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formSpecialty, setFormSpecialty] = useState('')
  const [formStatus, setFormStatus] = useState('ACTIVE')

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/teachers')
      if (res.ok) {
        const data = await res.json()
        setTeachers(data)
      }
    } catch {
      toast.error('خطا در بارگذاری اساتید')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTeachers() }, [fetchTeachers])

  const filteredTeachers = teachers.filter(t =>
    !searchQuery || t.name.includes(searchQuery) || t.specialty.includes(searchQuery) || t.phone_number.includes(searchQuery)
  )

  const openCreate = () => {
    setEditingTeacher(null)
    setFormName(''); setFormPhone(''); setFormEmail(''); setFormSpecialty(''); setFormStatus('ACTIVE')
    setDialogOpen(true)
  }

  const openEdit = (t: Teacher) => {
    setEditingTeacher(t)
    setFormName(t.name); setFormPhone(t.phone_number); setFormEmail(t.email || '')
    setFormSpecialty(t.specialty); setFormStatus(t.status)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formPhone.trim() || !formSpecialty.trim()) {
      toast.error('لطفاً فیلدهای ضروری را پر کنید')
      return
    }
    setSaving(true)
    try {
      const payload = { name: formName.trim(), phone_number: formPhone.trim(), email: formEmail.trim() || null, specialty: formSpecialty.trim(), status: formStatus }
      let res
      if (editingTeacher) {
        res = await fetch(`/api/teachers/${editingTeacher.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      } else {
        res = await fetch('/api/teachers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      }
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'خطا') }
      toast.success(editingTeacher ? 'استاد ویرایش شد' : 'استاد جدید اضافه شد')
      setDialogOpen(false)
      fetchTeachers()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'خطا در ذخیره')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این استاد مطمئن هستید؟')) return
    try {
      const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('استاد حذف شد')
      fetchTeachers()
    } catch {
      toast.error('خطا در حذف')
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 text-white shadow-md">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">هماهنگی اساتید</h1>
            <p className="text-sm text-muted-foreground mt-0.5">مدیریت اساتید و برنامه‌ریزی کلاس‌ها</p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2 bg-foreground text-background hover:bg-foreground/85">
          <Plus className="size-4" />
          افزودن استاد
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="جستجو بر اساس نام، تخصص..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Teachers Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <BookOpen className="size-14 opacity-30 mb-4" />
          <p className="text-lg font-medium">هیچ استادی یافت نشد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredTeachers.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{t.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Star className="size-3" />
                        {t.specialty}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusColors[t.status] || ''}>
                    {statusLabels[t.status] || t.status}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                  {t.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5" />
                      <span dir="ltr">{t.phone_number}</span>
                    </div>
                  )}
                  {t.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-3.5" />
                      <span>{t.email}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(t)} className="flex-1 gap-1 text-foreground hover:bg-muted/50 border-border">
                    <Pencil className="size-3.5" />
                    ویرایش
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(t.id)} className="text-red-600 hover:bg-red-50 border-red-200">
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingTeacher ? 'ویرایش استاد' : 'افزودن استاد جدید'}</DialogTitle>
            <DialogDescription>{editingTeacher ? 'اطلاعات استاد را ویرایش کنید' : 'اطلاعات استاد جدید را وارد کنید'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>نام و نام خانوادگی *</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="مثلاً: دکتر علی احمدی" />
            </div>
            <div className="space-y-1.5">
              <Label>شماره تماس *</Label>
              <Input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="۰۹۱۲..." dir="ltr" className="text-right" />
            </div>
            <div className="space-y-1.5">
              <Label>ایمیل</Label>
              <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" dir="ltr" className="text-right" />
            </div>
            <div className="space-y-1.5">
              <Label>تخصص *</Label>
              <Input value={formSpecialty} onChange={(e) => setFormSpecialty(e.target.value)} placeholder="مثلاً: مدیریت استراتژیک" />
            </div>
            <div className="space-y-1.5">
              <Label>وضعیت</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">فعال</SelectItem>
                  <SelectItem value="INACTIVE">غیرفعال</SelectItem>
                  <SelectItem value="ON_LEAVE">مرخصی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}><X className="size-4 ml-1" />انصراف</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-foreground text-background hover:bg-foreground/85">
              <Check className="size-4 ml-1" />{saving ? 'در حال ذخیره...' : editingTeacher ? 'ویرایش' : 'افزودن'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
