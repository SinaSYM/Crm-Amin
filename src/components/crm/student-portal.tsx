'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  GraduationCap, Calendar, Clock, Video, Download, PlusCircle, 
  MessageSquare, Send, Sparkles, Loader2, FileText, AlertCircle, 
  RefreshCw, CheckCircle2, ChevronRight, HelpCircle, Wallet,
  Share2, Copy, Users, ArrowUpRight
} from 'lucide-react'
import { toast } from 'sonner'
import { useCRMStore } from '@/lib/store'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

type TabType = 'overview' | 'classes' | 'tickets' | 'mentor' | 'affiliate'

interface Course {
  id: string
  title: string
  price: number
}

interface Enrollment {
  id: string
  course_id: string
  payment_status: 'PAID' | 'INSTALLMENT'
  enrollment_date: string
  course: Course
}

interface ClassSession {
  id: string
  course_id: string
  title: string
  date: string
  link: string | null
  archive_url: string | null
  course: { id: string; title: string }
}

interface Ticket {
  id: string
  title: string
  description: string
  status: string
  priority: string
  createdAt: string
}

interface ChatMessage {
  sender: 'student' | 'mentor'
  text: string
  timestamp: Date
}

export default function StudentPortal() {
  const { currentUser } = useCRMStore()
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  
  // Data States
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [classes, setClasses] = useState<ClassSession[]>([])
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)

  // Affiliate System State
  const [affiliateData, setAffiliateData] = useState<any>(null)
  const [loadingAffiliate, setLoadingAffiliate] = useState(false)

  // Dialog State (New Ticket)
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false)
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'NORMAL',
  })
  const [submittingTicket, setSubmittingTicket] = useState(false)

  // Mentor Chat State
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [mentorTyping, setMentorTyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch student info
  const fetchStudentData = useCallback(async () => {
    if (!currentUser?.id) return
    setLoading(true)
    try {
      // 1. Fetch enrollments
      const enrollRes = await fetch(`/api/enrollments?student_id=${currentUser.id}`)
      let studentEnrollments: Enrollment[] = []
      if (enrollRes.ok) {
        studentEnrollments = await enrollRes.json()
        setEnrollments(studentEnrollments)
        if (studentEnrollments.length > 0) {
          setSelectedCourseId(studentEnrollments[0].course_id)
        }
      }

      // 2. Fetch class sessions
      const classRes = await fetch(`/api/classes?student_id=${currentUser.id}`)
      if (classRes.ok) {
        setClasses(await classRes.json())
      }

      // 3. Fetch tickets
      const ticketRes = await fetch(`/api/tickets?student_id=${currentUser.id}`)
      if (ticketRes.ok) {
        setTickets(await ticketRes.json())
      }
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات دانش‌پذیر')
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    fetchStudentData()
  }, [fetchStudentData])

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, mentorTyping])

  // Welcome message for Mentor Chat
  useEffect(() => {
    if (activeTab === 'mentor' && chatMessages.length === 0) {
      setChatMessages([
        {
          sender: 'mentor',
          text: `سلام ${currentUser?.first_name} عزیز. من منتور هوشمند آموزشی شما در مؤسسه عالی آزاد امین هستم. چه سوال علمی یا راهنمایی در مورد دوره‌تان دارید؟ بفرمایید تا کمکتان کنم.`,
          timestamp: new Date()
        }
      ])
    }
  }, [activeTab, chatMessages.length, currentUser])

  const fetchAffiliateData = useCallback(async () => {
    if (!currentUser?.id) return
    setLoadingAffiliate(true)
    try {
      const res = await fetch(`/api/affiliate?student_id=${currentUser.id}`)
      if (res.ok) {
        const data = await res.json()
        setAffiliateData(data)
      }
    } catch {
      toast.error('خطا در بارگذاری اطلاعات همکاری در فروش')
    } finally {
      setLoadingAffiliate(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (activeTab === 'affiliate') {
      fetchAffiliateData()
    }
  }, [activeTab, fetchAffiliateData])

  // Submit Support Ticket
  const handleSubmitTicket = async () => {
    if (!currentUser?.id) return
    if (!ticketForm.title.trim() || !ticketForm.description.trim()) {
      toast.error('لطفاً عنوان و متن درخواست را وارد کنید')
      return
    }

    setSubmittingTicket(true)
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: currentUser.id,
          title: ticketForm.title,
          description: ticketForm.description,
          priority: ticketForm.priority,
        }),
      })

      if (res.ok) {
        toast.success('درخواست پشتیبانی شما با موفقیت ثبت شد')
        setTicketDialogOpen(false)
        setTicketForm({ title: '', description: '', priority: 'NORMAL' })
        // Refresh tickets list
        const ticketRes = await fetch(`/api/tickets?student_id=${currentUser.id}`)
        if (ticketRes.ok) {
          setTickets(await ticketRes.json())
        }
      } else {
        toast.error('خطا در ثبت درخواست پشتیبانی')
      }
    } catch {
      toast.error('خطا در ارتباط با سرور')
    } finally {
      setSubmittingTicket(false)
    }
  }

  // Send message to Smart Mentor
  const handleSendToMentor = async () => {
    if (!userInput.trim() || !currentUser?.id) return

    const studentMessage = userInput.trim()
    setUserInput('')
    setChatMessages((prev) => [
      ...prev,
      { sender: 'student', text: studentMessage, timestamp: new Date() }
    ])
    setMentorTyping(true)

    try {
      const res = await fetch('/api/ai/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: currentUser.id,
          course_id: selectedCourseId,
          message: studentMessage,
        })
      })

      if (res.ok) {
        const json = await res.json()
        setChatMessages((prev) => [
          ...prev,
          { sender: 'mentor', text: json.text, timestamp: new Date() }
        ])
      } else {
        toast.error('خطا در پاسخ‌دهی منتور هوشمند')
      }
    } catch {
      toast.error('عدم ارتباط با سرور هوش مصنوعی')
    } finally {
      setMentorTyping(false)
    }
  }

  // Persian date format helper
  const formatPersianDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Next live class logic
  const upcomingClasses = classes.filter(c => new Date(c.date) > new Date())
  const nextClass = upcomingClasses.length > 0 ? upcomingClasses[0] : null

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-l from-neutral-500 to-neutral-800 p-6 text-white shadow-xl relative overflow-hidden">
        {/* Decorative backdrop shimmer */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="size-8 text-foreground" />
              سلام {currentUser?.first_name} عزیز، خوش آمدید
            </h1>
            <p className="text-foreground text-sm max-w-xl">
              به پورتال دانش‌پذیران مؤسسه آموزش عالی آزاد امین خوش آمدید. در این بخش می‌توانید به کلاس‌های خود دسترسی داشته باشید، از منتور هوش مصنوعی راهنمایی بگیرید و با پشتیبانی در ارتباط باشید.
            </p>
          </div>
          {nextClass && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 flex flex-col gap-1.5 min-w-[220px]">
              <span className="text-[10px] uppercase font-bold text-foreground flex items-center gap-1">
                <Clock className="size-3" /> کلاس آنلاین بعدی
              </span>
              <span className="text-sm font-semibold truncate max-w-[220px]">{nextClass.title}</span>
              <span className="text-xs text-foreground">{formatPersianDate(nextClass.date)}</span>
              {nextClass.link && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  className="bg-white hover:bg-muted/50 text-foreground font-medium h-8 mt-1.5 w-full gap-1"
                  onClick={() => window.open(nextClass.link!, '_blank')}
                >
                  <Video className="size-3.5" /> ورود به کلاس آنلاین
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b overflow-x-auto gap-2 pb-px select-none">
        {[
          { id: 'overview', label: 'میز کار من', icon: GraduationCap },
          { id: 'classes', label: 'برنامه کلاسی و آرشیو', icon: Calendar },
          { id: 'tickets', label: 'پشتیبانی و تیکت‌ها', icon: FileText },
          { id: 'mentor', label: 'منتور هوشمند (AI)', icon: Sparkles },
          { id: 'affiliate', label: 'همکاری در فروش (سفیر)', icon: Share2 },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'border-border text-foreground bg-muted/60 dark:bg-muted/20'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <tab.icon className={`size-4 ${isActive ? 'text-foreground animate-pulse' : ''}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="size-10 animate-spin text-foreground" />
          <span className="text-sm text-muted-foreground">در حال بارگذاری اطلاعات آموزشی...</span>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="outline-none"
          >
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Right: Enrolled Courses List */}
                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-lg font-bold text-foreground">دوره‌های فعال من</h3>
                  {enrollments.length === 0 ? (
                    <Card className="text-center p-8 text-muted-foreground border-dashed">
                      <GraduationCap className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="font-semibold">دوره‌ای یافت نشد</p>
                      <p className="text-xs mt-1">شما هنوز در دوره‌ای ثبت‌نام نکرده‌اید یا ثبت‌نام شما تایید نشده است.</p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {enrollments.map((enr) => (
                        <Card key={enr.id} className="card-hover-lift overflow-hidden border border-border dark:border-border">
                          <CardHeader className="bg-muted/60 dark:bg-muted/20 pb-3">
                            <CardTitle className="text-base font-bold text-foreground">{enr.course.title}</CardTitle>
                            <CardDescription>تاریخ ثبت‌نام: {formatPersianDate(enr.enrollment_date)}</CardDescription>
                          </CardHeader>
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">وضعیت پرداخت</span>
                              <Badge className={enr.payment_status === 'PAID' ? 'bg-muted/60 text-foreground' : 'bg-amber-100 text-amber-800'}>
                                {enr.payment_status === 'PAID' ? 'تسویه شده' : 'اقساطی'}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">شهریه دوره</span>
                              <span className="font-semibold">{enr.course.price.toLocaleString('fa-IR')} تومان</span>
                            </div>
                            <Separator />
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                className="flex-1 bg-foreground text-background hover:bg-foreground/85 gap-1.5"
                                onClick={() => {
                                  setSelectedCourseId(enr.course_id)
                                  setActiveTab('mentor')
                                }}
                              >
                                <Sparkles className="size-3.5" /> پرسش از منتور AI
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="flex-1"
                                onClick={() => setActiveTab('classes')}
                              >
                                کلاس‌ها
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Left: Quick Actions & Status overview */}
                <div className="space-y-6">
                  {/* Stats Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-bold">وضعیت کلی آموزشی</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 dark:bg-muted/20 border border-border">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="size-5 text-foreground" />
                          <span className="text-sm font-medium">دوره‌های ثبت‌نام شده</span>
                        </div>
                        <span className="text-lg font-bold text-foreground dark:text-foreground">{enrollments.length.toLocaleString('fa-IR')}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 dark:bg-muted/20 border border-border">
                        <div className="flex items-center gap-2">
                          <Calendar className="size-5 text-foreground" />
                          <span className="text-sm font-medium">جلسات کلاسی ثبت‌شده</span>
                        </div>
                        <span className="text-lg font-bold text-foreground dark:text-foreground">{classes.length.toLocaleString('fa-IR')}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/60 dark:bg-muted/20 border border-border">
                        <div className="flex items-center gap-2">
                          <FileText className="size-5 text-foreground" />
                          <span className="text-sm font-medium">تیکت‌های پشتیبانی</span>
                        </div>
                        <span className="text-lg font-bold text-foreground dark:text-foreground">{tickets.length.toLocaleString('fa-IR')}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Help Desk box */}
                  <Card className="bg-gradient-to-br from-neutral-500 to-neutral-800 dark:from-neutral-500 dark:to-neutral-800 border-border dark:border-border">
                    <CardContent className="p-5 space-y-3.5">
                      <h4 className="font-bold text-foreground flex items-center gap-1.5">
                        <AlertCircle className="size-5 text-foreground" />
                        نیاز به راهنمایی دارید؟
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        چنانچه سوال مالی، درخواست تمدید اقساط یا اشکال فنی در ورود به کلاس‌های آنلاین دارید، از طریق سیستم تیکت پشتیبانی جدید ارسال کنید. کارشناسان ما به زودی پاسخ خواهند داد.
                      </p>
                      <Button 
                        onClick={() => setTicketDialogOpen(true)}
            className="w-full bg-foreground text-background hover:bg-foreground/85 gap-2 shadow-md"
                      >
                        <PlusCircle className="size-4" />
                        ثبت تیکت پشتیبانی جدید
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Classes & Schedule Tab */}
            {activeTab === 'classes' && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Calendar className="size-5 text-foreground" />
                    برنامه کلاسی و آرشیو فایل‌ها
                  </CardTitle>
                  <CardDescription>برنامه زمان‌بندی جلسات به همراه لینک ورود به کلاس آنلاین و آرشیو صدا/فیلم کلاس‌های گذشته</CardDescription>
                </CardHeader>
                <CardContent>
                  {classes.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="font-medium">کلاسی برنامه‌ریزی نشده است</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {classes.map((cls) => {
                        const isUpcoming = new Date(cls.date) > new Date()
                        return (
                          <div 
                            key={cls.id} 
                            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border gap-4 transition-colors ${
                              isUpcoming 
                                ? 'bg-muted/60 border-border dark:border-border hover:bg-muted/50' 
                                : 'bg-muted/30 border-border/60 hover:bg-muted/50'
                            }`}
                          >
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground text-sm">{cls.title}</span>
                                <Badge variant="outline" className="text-[10px] bg-background">
                                  {cls.course.title}
                                </Badge>
                                <Badge className={isUpcoming ? 'bg-muted/60 text-foreground' : 'bg-gray-400 text-white'}>
                                  {isUpcoming ? 'در پیش‌رو' : 'آرشیو شده'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="size-3.5 text-muted-foreground" />
                                  {formatPersianDate(cls.date)}
                                </span>
                                <span className="flex items-center gap-1 font-mono" dir="ltr">
                                  {new Date(cls.date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            
                            {/* Class Actions */}
                            <div className="flex gap-2 w-full sm:w-auto shrink-0">
                              {isUpcoming && cls.link && (
                                <Button
                                  size="sm"
                                  onClick={() => window.open(cls.link!, '_blank')}
                 className="bg-foreground text-background hover:bg-foreground/85 gap-1.5 flex-1 sm:flex-none"
                                >
                                  <Video className="size-4" /> ورود به کلاس
                                </Button>
                              )}
                              {!isUpcoming && cls.archive_url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(cls.archive_url!, '_blank')}
                                  className="border-border hover:bg-muted/50 text-foreground gap-1.5 flex-1 sm:flex-none"
                                >
                                  <Download className="size-4" /> دریافت فایل آرشیو
                                </Button>
                              )}
                              {!isUpcoming && !cls.archive_url && (
                                <span className="text-xs text-muted-foreground py-2 px-3 bg-muted rounded-lg w-full text-center">
                                  فایلی بارگذاری نشده
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Tickets Tab */}
            {activeTab === 'tickets' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-foreground">تیکت‌های پشتیبانی من</h3>
                  <Button 
                    onClick={() => setTicketDialogOpen(true)}
          className="bg-foreground text-background hover:bg-foreground/85 gap-1.5 shadow-sm"
                  >
                    <PlusCircle className="size-4" /> درخواست پشتیبانی جدید
                  </Button>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    {tickets.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <FileText className="size-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="font-semibold">درخواستی ثبت نشده است</p>
                        <p className="text-xs mt-1">با ثبت درخواست جدید، مسائل خود را با پشتیبانی در میان بگذارید.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tickets.map((ticket) => {
                          const statusLabel: Record<string, string> = {
                            PENDING: 'در انتظار بررسی',
                            IN_PROGRESS: 'در حال بررسی',
                            RESOLVED: 'پاسخ داده شده',
                          }
                          const statusColor: Record<string, string> = {
                            PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
                            IN_PROGRESS: 'bg-muted/60 text-foreground border-border',
                            RESOLVED: 'bg-muted/60 text-foreground border-border',
                          }
                          return (
                            <div 
                              key={ticket.id}
                              className="border p-4 rounded-xl space-y-2 hover:border-border hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <h4 className="font-semibold text-sm text-foreground">{ticket.title}</h4>
                                <div className="flex gap-2">
                                  <Badge variant="outline" className={`text-xs px-2 py-0.5 ${statusColor[ticket.status] || ''}`}>
                                    {statusLabel[ticket.status] || ticket.status}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[10px]">
                                    اولیت: {{ HIGH: 'فوری', NORMAL: 'عادی', LOW: 'کم' }[ticket.priority] || 'عادی'}
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground leading-relaxed break-words">{ticket.description}</p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <Clock className="size-3" />
                                ثبت شده در تاریخ: {formatPersianDate(ticket.createdAt)}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* AI Mentor Chat Tab */}
            {activeTab === 'mentor' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Right: Course selection & Info */}
                <div className="lg:col-span-1 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center gap-1.5">
                        <Sparkles className="size-4 text-foreground" />
                        منتور هوشمند امین
                      </CardTitle>
                      <CardDescription>دستیار RAG مجهز به هوش مصنوعی برای پاسخ به سوالات درسی شما</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="mentor-course-select" className="text-xs">انتخاب دوره آموزشی</Label>
                        <Select 
                          value={selectedCourseId} 
                          onValueChange={(val) => {
                            setSelectedCourseId(val)
                            setChatMessages([]) // Reset chat when switching courses
                          }}
                        >
                          <SelectTrigger id="mentor-course-select" className="w-full">
                            <SelectValue placeholder="انتخاب دوره" />
                          </SelectTrigger>
                          <SelectContent>
                            {enrollments.map((enr) => (
                              <SelectItem key={enr.course_id} value={enr.course_id}>
                                {enr.course.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="p-3.5 rounded-lg bg-muted/60 dark:bg-muted/20 border border-border text-xs text-foreground dark:text-foreground leading-relaxed space-y-2">
                        <p className="font-semibold flex items-center gap-1">
                          <Sparkles className="size-3.5" /> درباره این دستیار:
                        </p>
                        <p>
                          این ایجنت به طور اختصاصی روی سرفصل‌ها و مباحث دوره شما آموزش دیده است. هرگونه سوال در خصوص مفاهیم علمی، فرمول‌ها، جزوات، کارگاه‌ها و موارد درسی را می‌توانید از او بپرسید.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Left: Chat Area */}
                <div className="lg:col-span-3 flex flex-col h-[520px] rounded-xl border bg-card shadow-sm overflow-hidden">
                  {/* Chat Header */}
                  <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-muted/60 dark:bg-muted/20 flex items-center justify-center">
                        <Sparkles className="size-4 text-foreground" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground">پرسش و پاسخ علمی</h4>
                        <p className="text-[10px] text-foreground dark:text-foreground">مبتنی بر هوش مصنوعی فعال</p>
                      </div>
                    </div>
                    {chatMessages.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setChatMessages([])}
                        className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                      >
                        پاک کردن گفتگو
                      </Button>
                    )}
                  </div>

                  {/* Chat Messages scroll area */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/5">
                    {chatMessages.map((msg, index) => {
                      const isMentor = msg.sender === 'mentor'
                      return (
                        <div 
                          key={index}
                          className={`flex items-start gap-2.5 max-w-[85%] ${isMentor ? '' : 'mr-auto flex-row-reverse'}`}
                        >
                          <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${
                            isMentor 
                              ? 'bg-muted/60 text-foreground' 
                              : 'bg-muted/60 dark:bg-muted/20 text-foreground dark:text-foreground'
                          }`}>
                            {isMentor ? <Sparkles className="size-4" /> : <GraduationCap className="size-4" />}
                          </div>
                          <div className={`p-3.5 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-line ${
                            isMentor 
                              ? 'bg-card border text-foreground rounded-tr-none' 
                              : 'bg-muted/60 text-foreground rounded-tl-none'
                          }`}>
                            {msg.text}
                            <span className={`block text-[9px] mt-1.5 text-left ${isMentor ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {msg.timestamp.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )
                    })}

                    {mentorTyping && (
                      <div className="flex items-start gap-2.5 max-w-[85%]">
                        <div className="size-8 rounded-full bg-muted/60 text-foreground flex items-center justify-center shrink-0">
                          <Sparkles className="size-4" />
                        </div>
                        <div className="p-4 rounded-2xl bg-card border rounded-tr-none flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-muted/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="size-2 rounded-full bg-muted/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="size-2 rounded-full bg-muted/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="p-3 border-t bg-card flex gap-2">
                    <Input 
                      placeholder="سوال علمی خود را اینجا بپرسید..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendToMentor()
                      }}
                      className="flex-1 focus-visible:ring-foreground/30"
                      disabled={mentorTyping || !selectedCourseId}
                    />
                    <Button 
                      onClick={handleSendToMentor}
                      disabled={!userInput.trim() || mentorTyping || !selectedCourseId}
           className="bg-foreground text-background hover:bg-foreground/85 px-4 shrink-0 shadow-md"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Affiliate / Referral System Tab */}
            {activeTab === 'affiliate' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">تعداد کلیک‌ها</p>
                        <p className="text-2xl font-bold mt-1.5">{affiliateData?.stats?.clicks ?? 0}</p>
                      </div>
                      <div className="bg-slate-100 dark:bg-slate-900 p-2.5 rounded-lg text-slate-600 dark:text-slate-400">
                        <Users className="size-5" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">دوستان معرفی شده</p>
                        <p className="text-2xl font-bold mt-1.5">{affiliateData?.stats?.totalReferred ?? 0}</p>
                      </div>
                      <div className="bg-muted/60 dark:bg-muted/20 p-2.5 rounded-lg text-foreground">
                        <Users className="size-5" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">ثبت‌نام‌های قطعی</p>
                        <p className="text-2xl font-bold mt-1.5">{affiliateData?.stats?.convertedReferred ?? 0}</p>
                      </div>
                      <div className="bg-muted/60 dark:bg-muted/20 p-2.5 rounded-lg text-foreground">
                        <CheckCircle2 className="size-5" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">نرخ تبدیل ارجاع</p>
                        <p className="text-2xl font-bold mt-1.5">{affiliateData?.stats?.conversionRate ?? 0}%</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-950 p-2.5 rounded-lg text-amber-600">
                        <ArrowUpRight className="size-5" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Link & Wallet Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Referral link setup */}
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-1.5">
                        <Share2 className="size-4.5 text-foreground" />
                        لینک دعوت اختصاصی شما
                      </CardTitle>
                      <CardDescription>
                        با ارسال این لینک به دوستان خود، در صورت ثبت‌نام آن‌ها ۵ درصد پورسانت از کل مبلغ دوره دریافت کنید.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">لینک ارجاع اختصاصی</Label>
                        <div className="flex gap-2">
                          <Input 
                            readOnly 
                            value={affiliateData ? `${window.location.origin}/?ref=${affiliateData.referral_code}` : ''}
                            dir="ltr"
                            className="bg-muted font-mono text-xs h-10"
                          />
                          <Button
                            onClick={() => {
                              if (affiliateData) {
                                navigator.clipboard.writeText(`${window.location.origin}/?ref=${affiliateData.referral_code}`)
                                toast.success('لینک دعوت با موفقیت کپی شد')
                              }
                            }}
              className="bg-foreground text-background hover:bg-foreground/85 shrink-0"
                          >
                            <Copy className="size-4" /> کپی لینک
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 bg-muted/60 dark:bg-muted/20 border border-border rounded-lg text-xs leading-relaxed text-foreground dark:text-foreground">
                        <AlertCircle className="size-4 shrink-0 text-foreground" />
                        <p>
                          هر یک از دوستان شما که با این لینک وارد وب‌سایت شده و مشخصات خود را در فرم مشاوره ثبت کند، به صورت خودکار به نام شما ثبت می‌شود و پس از قطعی شدن ثبت‌نام وی، پورسانت به صورت آنی به کیف پول شما واریز خواهد شد.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Wallet Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-1.5">
                        <Wallet className="size-4.5 text-foreground" />
                        کیف پول سفیر
                      </CardTitle>
                      <CardDescription>موجودی و مدیریت درآمدهای همکاری در فروش</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5 text-center">
                      <div className="py-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed">
                        <p className="text-xs text-muted-foreground">موجودی قابل برداشت</p>
                        <p className="text-3xl font-extrabold text-foreground mt-2">
                          {(affiliateData?.wallet_balance ?? 0).toLocaleString('fa-IR')}{' '}
                          <span className="text-xs font-normal text-muted-foreground">تومان</span>
                        </p>
                      </div>
                      
                      <Button
                        onClick={() => toast.info('درخواست تسویه حساب به مدیریت ارسال شد و پس از بررسی واریز خواهد شد.')}
                        disabled={!affiliateData?.wallet_balance || affiliateData.wallet_balance <= 0}
            className="w-full bg-foreground text-background hover:bg-foreground/85 h-10"
                      >
                        درخواست تسویه حساب
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Tables Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Referred Leads Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-bold">دوستان معرفی شده شما</CardTitle>
                      <CardDescription>سرنخ‌های ثبت شده با لینک شما</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {!affiliateData?.referredLeads || affiliateData.referredLeads.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          هنوز کسی با لینک شما ثبت‌نام نکرده است.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-muted/40 border-b">
                              <tr>
                                <th className="p-3 font-semibold text-muted-foreground">نام</th>
                                <th className="p-3 font-semibold text-muted-foreground">تاریخ ثبت</th>
                                <th className="p-3 font-semibold text-muted-foreground">وضعیت</th>
                              </tr>
                            </thead>
                            <tbody>
                              {affiliateData.referredLeads.map((lead: any) => (
                                <tr key={lead.id} className="border-b hover:bg-muted/10">
                                  <td className="p-3 font-medium">
                                    {lead.first_name} {lead.last_name}
                                  </td>
                                  <td className="p-3 text-muted-foreground">
                                    {new Date(lead.createdAt).toLocaleDateString('fa-IR')}
                                  </td>
                                  <td className="p-3">
                                    <Badge 
                                      variant="outline"
                                      className={
                                        lead.status === 'CONVERTED' 
                                          ? 'bg-muted/60 text-foreground border-border dark:bg-muted/20 dark:text-foreground dark:border-border' 
                                          : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400'
                                      }
                                    >
                                      {lead.status === 'CONVERTED' ? 'ثبت‌نام قطعی' : 'در حال پیگیری'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Commissions Payouts Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-bold">تاریخچه پورسانت‌ها</CardTitle>
                      <CardDescription>تراکنش‌های سود و واریزی‌های شما</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      {!affiliateData?.commissions || affiliateData.commissions.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground">
                          تراکنش پورسانتی ثبت نشده است.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead className="bg-muted/40 border-b">
                              <tr>
                                <th className="p-3 font-semibold text-muted-foreground">شخص معرفی شده</th>
                                <th className="p-3 font-semibold text-muted-foreground">مبلغ سود</th>
                                <th className="p-3 font-semibold text-muted-foreground">وضعیت</th>
                              </tr>
                            </thead>
                            <tbody>
                              {affiliateData.commissions.map((comm: any) => (
                                <tr key={comm.id} className="border-b hover:bg-muted/10">
                                  <td className="p-3 font-medium">
                                    {comm.referee_lead.first_name} {comm.referee_lead.last_name}
                                  </td>
                                  <td className="p-3 text-foreground font-bold">
                                    {comm.amount.toLocaleString('fa-IR')} تومان
                                  </td>
                                  <td className="p-3">
                                    <Badge 
                                      className={
                                        comm.status === 'APPROVED' 
                                          ? 'bg-muted/60 text-foreground' 
                                          : 'bg-amber-500 text-white'
                                      }
                                    >
                                      {comm.status === 'APPROVED' ? 'تایید شده' : 'در انتظار'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Submit Ticket Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ثبت درخواست پشتیبانی جدید</DialogTitle>
            <DialogDescription>درخواست تمدید اقساط، مسائل آموزشی یا فنی را ثبت کنید تا بررسی شود.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-title">موضوع درخواست *</Label>
              <Input 
                id="t-title" 
                value={ticketForm.title}
                onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                placeholder="مثال: درخواست تمدید پرداخت قسط دوم دوره"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-desc">متن درخواست پشتیبانی *</Label>
              <Textarea 
                id="t-desc" 
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                placeholder="لطفاً جزئیات درخواست خود را با ذکر شماره تماس و مشخصات دوره بنویسید..."
                rows={4}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-priority">اولویت</Label>
              <Select 
                value={ticketForm.priority}
                onValueChange={(val) => setTicketForm({ ...ticketForm, priority: val })}
              >
                <SelectTrigger id="t-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">کم</SelectItem>
                  <SelectItem value="NORMAL">عادی</SelectItem>
                  <SelectItem value="HIGH">فوری</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setTicketDialogOpen(false)} disabled={submittingTicket}>
              انصراف
            </Button>
            <Button 
              onClick={handleSubmitTicket}
              disabled={submittingTicket}
       className="bg-foreground text-background hover:bg-foreground/85 gap-1.5"
            >
              {submittingTicket && <Loader2 className="size-3.5 animate-spin" />}
              ثبت درخواست
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
