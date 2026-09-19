'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  User,
  Phone,
  Shield,
  Bell,
  Palette,
  Database,
  Trash2,
  Save,
  X,
  Edit3,
  Download,
  RefreshCw,
  AlertTriangle,
  Sun,
  Moon,
  Mail,
  MessageSquare,
  Clock,
  Type,
  Check,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { useCRMStore, type CurrentUser } from '@/lib/store'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

/* ─── Section animation variants ─── */
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const },
  }),
}

/* ─── Role labels ─── */
const roleLabels: Record<string, string> = {
  ADMIN: 'ادمین',
  SALES_MANAGER: 'مدیر فروش',
  SALES_AGENT: 'کارشناس فروش',
  STUDENT: 'دانش‌پذیر',
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-muted/60 text-foreground dark:bg-muted/20 dark:text-foreground',
  SALES_MANAGER: 'bg-muted/60 text-foreground dark:bg-muted/20 dark:text-foreground',
  SALES_AGENT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  STUDENT: 'bg-muted/60 text-foreground dark:bg-muted/20 dark:text-foreground',
}

/* ─── Notification preferences stored in localStorage ─── */
interface NotificationPrefs {
  email: boolean
  sms: boolean
  followupReminders: boolean
}

function getNotificationPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return { email: true, sms: true, followupReminders: true }
  try {
    const stored = localStorage.getItem('crm-notification-prefs')
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return { email: true, sms: true, followupReminders: true }
}

function saveNotificationPrefs(prefs: NotificationPrefs) {
  try {
    localStorage.setItem('crm-notification-prefs', JSON.stringify(prefs))
  } catch { /* ignore */ }
}

/* ─── Font size stored in localStorage ─── */
function getFontSize(): 'small' | 'medium' | 'large' {
  if (typeof window === 'undefined') return 'medium'
  try {
    const stored = localStorage.getItem('crm-font-size')
    if (stored === 'small' || stored === 'medium' || stored === 'large') return stored
  } catch { /* ignore */ }
  return 'medium'
}

function saveFontSize(size: 'small' | 'medium' | 'large') {
  try {
    localStorage.setItem('crm-font-size', JSON.stringify(size))
  } catch { /* ignore */ }
}

/* ─── Section Header Component ─── */
function SectionHeader({ icon: Icon, title, index }: { icon: React.ElementType; title: string; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3 mb-4"
    >
      <div className="flex items-center justify-center size-9 rounded-xl bg-gradient-to-br from-neutral-500 to-neutral-800 shadow-md shadow-neutral-400/30">
        <Icon className="size-4.5 text-white" />
      </div>
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-l from-neutral-500 to-transparent dark:from-neutral-500 dark:to-transparent" />
    </motion.div>
  )
}

/* ─── Card Wrapper ─── */
function SettingsCard({ children, index }: { children: React.ReactNode; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden"
    >
      <div className="h-1 bg-gradient-to-l from-neutral-500 via-neutral-400 to-neutral-800" />
      <div className="p-6">{children}</div>
    </motion.div>
  )
}

/* ─── Personal Notepad Component ─── */
function PersonalNotepad({ currentUser }: { currentUser: { id: string } }) {
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [loadingNote, setLoadingNote] = useState(true)

  useEffect(() => {
    const loadNote = async () => {
      try {
        const res = await fetch(`/api/users/${currentUser.id}`)
        if (res.ok) {
          const data = await res.json()
          setNoteText(data.personal_notes || '')
        }
      } catch { /* ignore */ } finally {
        setLoadingNote(false)
      }
    }
    loadNote()
  }, [currentUser.id])

  const handleSaveNote = async () => {
    setSavingNote(true)
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personal_notes: noteText }),
      })
      if (!res.ok) throw new Error()
      // import toast - already imported at top
      toast.success('یادداشت‌های شخصی ذخیره شد')
    } catch {
      toast.error('خطا در ذخیره یادداشت')
    } finally {
      setSavingNote(false)
    }
  }

  return (
    <SettingsCard index={0.5 as unknown as number}>
      <SectionHeader icon={MessageSquare} title="دفترچه یادداشت شخصی" index={0.5 as unknown as number} />
      {loadingNote ? (
        <div className="h-28 animate-pulse bg-muted/50 rounded-xl" />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">یادداشت‌های خصوصی شما — فقط برای شما قابل مشاهده است</p>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={6}
            placeholder="یادداشت‌های خود را اینجا بنویسید..."
            className="w-full rounded-xl border border-border bg-muted/20 p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-foreground/30 transition-colors placeholder:text-muted-foreground/60"
          />
          <Button
            onClick={handleSaveNote}
            disabled={savingNote}
            size="sm"
      className="bg-foreground text-background hover:bg-foreground/85 gap-1.5"
          >
            {savingNote ? <RefreshCw className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            ذخیره یادداشت
          </Button>
        </div>
      )}
    </SettingsCard>
  )
}

/* ─── Email Reminders Card (Admin only) ─── */
function EmailRemindersCard({ isAdmin }: { isAdmin: boolean }) {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  if (!isAdmin) return null

  const sendTestDigest = async () => {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/cron/digest', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.sent?.length > 0) {
        setResult(`✅ ایمیل برای ${data.sent.length} کاربر ارسال شد`)
        toast.success('یادآوری‌ها ارسال شد')
      } else if (res.status === 503) {
        setResult('⚠️ سرویس ایمیل هنوز تنظیم نشده — کلید RESEND_API_KEY را در تنظیمات محیط اضافه کنید')
      } else if (data.skippedCount !== undefined) {
        setResult(`ℹ️ پیگیری امروز برای هیچ‌کس پیدا نشد (${data.skippedCount} کاربر بررسی شد)`)
      } else {
        throw new Error()
      }
    } catch {
      toast.error('خطا در ارسال یادآوری')
      setResult('❌ خطا در ارتباط با سرور')
    } finally {
      setSending(false)
    }
  }

  return (
    <SettingsCard index={0.7 as unknown as number}>
      <SectionHeader icon={Mail} title="یادآوری ایمیلی پیگیری‌ها" index={0.7 as unknown as number} />
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          هر روز صبح، لیست پیگیری‌های امروز و عقب‌افتاده هر کارشناس به‌صورت خودکار برایش ایمیل می‌شود.
          با دکمه زیر می‌توانید همین الان یک ارسال آزمایشی انجام دهید.
        </p>
        <Button onClick={sendTestDigest} disabled={sending} size="sm" variant="outline" className="gap-1.5">
          {sending ? <RefreshCw className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {sending ? 'در حال ارسال...' : 'ارسال یادآوری آزمایشی'}
        </Button>
        {result && <p className="text-xs text-muted-foreground">{result}</p>}
      </div>
    </SettingsCard>
  )
}

/* ─── Main Settings Page ─── */
export default function SettingsPage() {
  const { currentUser, setCurrentUser } = useCRMStore()
  const { theme, setTheme } = useTheme()

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone_number: '' })
  const [saving, setSaving] = useState(false)

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(getNotificationPrefs)

  // Font size
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(getFontSize)

  // Delete account dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Initialize edit form from current user
  useEffect(() => {
    if (currentUser) {
      setEditForm({
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
        phone_number: currentUser.phone_number || '',
      })
    }
  }, [currentUser])

  // Sync notification prefs to localStorage
  useEffect(() => {
    saveNotificationPrefs(notifPrefs)
  }, [notifPrefs])

  // Sync font size to localStorage and apply
  useEffect(() => {
    saveFontSize(fontSize)
    const root = document.documentElement
    root.classList.remove('text-sm', 'text-base', 'text-lg')
    if (fontSize === 'small') {
      root.style.fontSize = '14px'
    } else if (fontSize === 'medium') {
      root.style.fontSize = '16px'
    } else {
      root.style.fontSize = '18px'
    }
  }, [fontSize])

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!currentUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          phone_number: editForm.phone_number,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'خطا در ذخیره اطلاعات')
      }
      const updatedUser = await res.json()
      setCurrentUser({
        id: updatedUser.id,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        role: updatedUser.role,
        phone_number: updatedUser.phone_number,
      })
      setIsEditing(false)
      toast.success('اطلاعات پروفایل با موفقیت ذخیره شد')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'خطا در ذخیره اطلاعات')
    } finally {
      setSaving(false)
    }
  }

  // Handle export data — download leads + users CSV (management only)
  const handleExportData = async () => {
    const downloadCsv = async (url: string, filename: string) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(objectUrl)
    }
    const today = new Date().toISOString().split('T')[0]
    toast.promise(
      Promise.all([
        downloadCsv(`/api/leads/export`, `leads-export-${today}.csv`),
        downloadCsv(`/api/users/export`, `users-export-${today}.csv`),
      ]),
      {
        loading: 'در حال آماده‌سازی خروجی...',
        success: 'خروجی داده‌ها دانلود شد',
        error: 'خطا در خروجی‌گیری از داده‌ها',
      }
    )
  }

  // Handle clear cache
  const handleClearCache = () => {
    localStorage.clear()
    toast.success('حافظه پنهان پاک شد. صفحه بازنشانی می‌شود...')
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  // Handle delete account
  const handleDeleteAccount = async () => {
    if (!currentUser) return
    if (deleteConfirmText !== 'حذف') {
      toast.error('لطفاً کلمه "حذف" را تایپ کنید')
      return
    }
    try {
      const res = await fetch(`/api/users/${currentUser.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('خطا در حذف حساب')
      toast.success('حساب کاربری حذف شد')
      localStorage.clear()
      setTimeout(() => window.location.reload(), 1000)
    } catch {
      toast.error('خطا در حذف حساب کاربری')
    }
  }

  if (!currentUser) {
    return (
      <div dir="rtl" className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">لطفاً ابتدا وارد شوید</p>
      </div>
    )
  }

  const initials = `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`
  const fullName = `${currentUser.first_name} ${currentUser.last_name}`

  // Only management (admin / sales manager) can download data or close accounts
  const isManagement = currentUser.role === 'ADMIN' || currentUser.role === 'SALES_MANAGER'

  return (
    <div dir="rtl" className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Page Title */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-br from-neutral-500 to-neutral-800 shadow-lg shadow-neutral-400/30">
          <User className="size-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">تنظیمات</h1>
          <p className="text-sm text-muted-foreground">مدیریت پروفایل و تنظیمات حساب کاربری</p>
        </div>
      </motion.div>

      {/* ─── Profile Section ─── */}
      <SettingsCard index={0}>
        <SectionHeader icon={User} title="پروفایل" index={0} />

        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <div className="size-20 rounded-full bg-gradient-to-br from-neutral-500 to-neutral-800 flex items-center justify-center shadow-lg shadow-neutral-400/30 ring-4 ring-foreground/30 dark:ring-foreground/30">
              <span className="text-2xl font-bold text-white">{initials || 'م'}</span>
            </div>
            <Badge className={roleColors[currentUser.role] || roleColors.ADMIN}>
              {roleLabels[currentUser.role] || currentUser.role}
            </Badge>
          </div>

          {/* Info */}
          <div className="flex-1 w-full">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">نام</label>
                    <Input
                      value={editForm.first_name}
                      onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      placeholder="نام"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">نام خانوادگی</label>
                    <Input
                      value={editForm.last_name}
                      onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                      placeholder="نام خانوادگی"
                      className="text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">شماره تلفن</label>
                  <Input
                    value={editForm.phone_number}
                    onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                    placeholder="شماره تلفن"
                    className="text-sm"
                    dir="ltr"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    size="sm"
          className="bg-foreground text-background hover:bg-foreground/85 "
                  >
                    {saving ? (
                      <RefreshCw className="size-3.5 animate-spin ml-1.5" />
                    ) : (
                      <Save className="size-3.5 ml-1.5" />
                    )}
                    ذخیره
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false)
                      setEditForm({
                        first_name: currentUser.first_name,
                        last_name: currentUser.last_name,
                        phone_number: currentUser.phone_number || '',
                      })
                    }}
                  >
                    <X className="size-3.5 ml-1.5" />
                    انصراف
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-bold text-foreground">{fullName}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="size-3.5" />
                  <span dir="ltr">{currentUser.phone_number || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="size-3.5" />
                  <span>{roleLabels[currentUser.role] || currentUser.role}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="mt-2 border-border dark:border-border text-foreground dark:text-foreground hover:bg-muted/50 dark:hover:bg-muted/50"
                >
                  <Edit3 className="size-3.5 ml-1.5" />
                  ویرایش پروفایل
                </Button>
              </div>
            )}
          </div>
        </div>
      </SettingsCard>

      {/* ─── Personal Notepad Section ─── */}
      <PersonalNotepad currentUser={currentUser} />
      <EmailRemindersCard isAdmin={currentUser?.role === 'ADMIN'} />


      <SettingsCard index={1}>
        <SectionHeader icon={Shield} title="تنظیمات حساب" index={1} />

        <div className="space-y-4">
          {/* Active/Inactive status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-muted/60 dark:bg-muted/20 flex items-center justify-center">
                <div className={`size-2.5 rounded-full ${true ? 'bg-muted/60' : 'bg-red-500'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">وضعیت حساب</p>
                <p className="text-xs text-muted-foreground">حساب شما در حال حاضر فعال است</p>
              </div>
            </div>
            <Badge variant="outline" className="text-foreground dark:text-foreground border-border dark:border-border">
              فعال
            </Badge>
          </div>

          {/* Role badge */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-muted/60 dark:bg-muted/20 flex items-center justify-center">
                <Shield className="size-4 text-foreground dark:text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">نقش کاربری</p>
                <p className="text-xs text-muted-foreground">سطح دسترسی شما در سیستم</p>
              </div>
            </div>
            <Badge className={roleColors[currentUser.role] || roleColors.ADMIN}>
              {roleLabels[currentUser.role] || currentUser.role}
            </Badge>
          </div>
        </div>
      </SettingsCard>

      {/* ─── Notification Preferences Section ─── */}
      <SettingsCard index={2}>
        <SectionHeader icon={Bell} title="تنظیمات اعلان‌ها" index={2} />

        <div className="space-y-4">
          {/* Email notifications */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-muted/60 dark:bg-muted/20 flex items-center justify-center">
                <Mail className="size-4 text-foreground dark:text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">اعلان ایمیل</p>
                <p className="text-xs text-muted-foreground">دریافت اعلان از طریق ایمیل</p>
              </div>
            </div>
            <Switch
              checked={notifPrefs.email}
              onCheckedChange={(checked) => setNotifPrefs({ ...notifPrefs, email: checked })}
              className="data-[state=checked]:bg-muted/60"
            />
          </div>

          {/* SMS notifications */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <MessageSquare className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">اعلان پیامک</p>
                <p className="text-xs text-muted-foreground">دریافت اعلان از طریق پیامک</p>
              </div>
            </div>
            <Switch
              checked={notifPrefs.sms}
              onCheckedChange={(checked) => setNotifPrefs({ ...notifPrefs, sms: checked })}
              className="data-[state=checked]:bg-muted/60"
            />
          </div>

          {/* Follow-up reminders */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-muted/60 dark:bg-muted/20 flex items-center justify-center">
                <Clock className="size-4 text-foreground dark:text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">یادآوری پیگیری‌ها</p>
                <p className="text-xs text-muted-foreground">یادآوری پیگیری‌های پیش‌رو</p>
              </div>
            </div>
            <Switch
              checked={notifPrefs.followupReminders}
              onCheckedChange={(checked) => setNotifPrefs({ ...notifPrefs, followupReminders: checked })}
              className="data-[state=checked]:bg-muted/60"
            />
          </div>
        </div>
      </SettingsCard>

      {/* ─── Appearance Section ─── */}
      <SettingsCard index={3}>
        <SectionHeader icon={Palette} title="ظاهر" index={3} />

        <div className="space-y-4">
          {/* Dark/Light mode toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-muted/60 dark:bg-muted/20 flex items-center justify-center">
                {theme === 'dark' ? (
                  <Moon className="size-4 text-foreground dark:text-foreground" />
                ) : (
                  <Sun className="size-4 text-amber-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">حالت نمایش</p>
                <p className="text-xs text-muted-foreground">
                  {theme === 'dark' ? 'حالت تاریک فعال است' : 'حالت روشن فعال است'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {theme === 'dark' ? 'تاریک' : 'روشن'}
              </span>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                className="data-[state=checked]:bg-muted/60"
              />
            </div>
          </div>

          {/* Font size selector */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-muted/60 dark:bg-muted/20 flex items-center justify-center">
                <Type className="size-4 text-foreground dark:text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">اندازه قلم</p>
                <p className="text-xs text-muted-foreground">تنظیم اندازه نمایشی متن</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {(['small', 'medium', 'large'] as const).map((size) => {
                const labels = { small: 'کوچک', medium: 'متوسط', large: 'بزرگ' }
                const isActive = fontSize === size
                return (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-muted/60 text-foreground shadow-md shadow-neutral-400/30'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {labels[size]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* ─── Data Section ─── */}
      <SettingsCard index={4}>
        <SectionHeader icon={Database} title="داده‌ها" index={4} />

        <div className="space-y-4">
          {/* Export data — management only */}
          {isManagement && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-muted/60 dark:bg-muted/20 flex items-center justify-center">
                  <Download className="size-4 text-foreground dark:text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">خروجی از داده‌ها</p>
                  <p className="text-xs text-muted-foreground">دانلود تمامی داده‌ها در قالب فایل</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportData}
                className="border-border dark:border-border text-foreground dark:text-foreground hover:bg-muted/50 dark:hover:bg-muted/50"
              >
                <Download className="size-3.5 ml-1.5" />
                خروجی
              </Button>
            </div>
          )}

          {/* Clear cache */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                <RefreshCw className="size-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium">پاک کردن حافظه پنهان</p>
                <p className="text-xs text-muted-foreground">پاک‌سازی داده‌های محلی و بازنشانی صفحه</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              className="border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <RefreshCw className="size-3.5 ml-1.5" />
              پاک‌سازی
            </Button>
          </div>
        </div>
      </SettingsCard>

      {/* ─── Danger Zone Section (management only) ─── */}
      {isManagement && (
        <SettingsCard index={5}>
          <SectionHeader icon={AlertTriangle} title="منطقه خطر" index={5} />

          <div className="p-4 rounded-xl border-2 border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <Trash2 className="size-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400">حذف حساب کاربری</p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70">
                    این عمل فقط توسط مدیریت قابل انجام است
                  </p>
                </div>
              </div>

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                  >
                    <Trash2 className="size-3.5 ml-1.5" />
                    حذف حساب
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent dir="rtl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <AlertTriangle className="size-5" />
                      تایید حذف حساب کاربری
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground space-y-3">
                      <p>
                        آیا از غیرفعال‌سازی حساب کاربری خود اطمینان دارید؟ پس از این کار امکان ورود
                        به سیستم را نخواهید داشت و داده‌های مرتبط با شما (لیدها، تعاملات و ثبت‌نام‌ها)
                        از دسترس خارج می‌شوند.
                      </p>
                      <div className="pt-2">
                        <p className="text-sm font-medium text-foreground mb-2">
                          برای تایید، لطفاً کلمه «حذف» را تایپ کنید:
                        </p>
                        <Input
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          placeholder="حذف"
                          className="text-sm max-w-[200px]"
                        />
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2">
                    <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>
                      انصراف
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmText !== 'حذف'}
                      className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="size-3.5 ml-1.5" />
                      غیرفعال‌سازی حساب
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </SettingsCard>
      )}
    </div>
  )
}
