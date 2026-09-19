'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Play, 
  Send, 
  RefreshCw, 
  Award, 
  Sparkles, 
  User, 
  ChevronLeft, 
  ArrowLeft,
  ThumbsUp, 
  AlertCircle, 
  Lightbulb, 
  Info,
  Loader2,
  CheckCircle2,
  HelpCircle
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'model'
  content: string
  timestamp: Date
}

interface GradeResult {
  score: number
  objectionsHandled: string[]
  mistakes: string[]
  tips: string[]
}

const PERSONAS = [
  {
    id: 'busy_customer',
    name: 'علی اکبری',
    title: 'مشتری بی‌حوصله و عجول',
    course: 'دوره مدیریت ارشد کسب‌وکار (MBA)',
    description: 'مدیر شرکت خصوصی، پرمشغله، تحمل توضیحات طولانی را ندارد و بلافاصله جزئیات قیمت و مدرک را می‌خواهد.',
    objectionText: 'نداشتن وقت کافی، تمایل به دریافت سریع اطلاعات بدون حاشیه.',
    avatarColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-900',
    tips: [
      'از سلام و احوال‌پرسی‌های طولانی خودداری کنید.',
      'بلافاصله بعد از معرفی خود سراغ اصل مطلب (قیمت و مزیت کلیدی) بروید.',
      'سعی کنید قرار ملاقات حضوری یا مکالمه کوتاه تلفنی ۲ دقیقه‌ای تنظیم کنید.'
    ]
  },
  {
    id: 'low_budget',
    name: 'زهرا سعیدی',
    title: 'دانشجوی مشتاق با بودجه محدود',
    course: 'دوره جامع حقوق کاربردی',
    description: 'دانشجوی کارشناسی، علاقه‌مند به توسعه مهارت برای ورود به بازار کار، اما نگران هزینه‌های سنگین شهریه.',
    objectionText: 'بالا بودن قیمت دوره، تقاضای تخفیف‌های بالا یا شرایط اقساطی استثنایی.',
    avatarColor: 'bg-muted/60 text-foreground dark:bg-muted/20 dark:text-foreground',
    borderColor: 'border-border dark:border-border',
    tips: [
      'مزایای مدرک معتبر و نرخ اشتغال فارغ‌التحصیلان را برای توجیه هزینه مطرح کنید.',
      'شرایط پرداخت اقساطی موسسه امین را به عنوان یک راهکار حمایتی معرفی کنید.',
      'ارزش سرمایه‌گذاری روی خود را نسبت به هزینه‌های دیگر برجسته نمایید.'
    ]
  },
  {
    id: 'technical_skeptic',
    name: 'مهندس حسینی',
    title: 'مدیر فنی سخت‌گیر و شکاک',
    course: 'مدیریت پروژه و ساخت (DPM)',
    description: 'دارای سابقه کار فنی، تجربیات منفی از موسسات آموزشی دیگر، به شدت حساس روی سرفصل‌ها و رزومه اساتید.',
    objectionText: 'شک داشتن به کاربردی بودن دوره، سوال در مورد اعتبار رسمی مدرک وزارت علوم.',
    avatarColor: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    borderColor: 'border-rose-200 dark:border-rose-900',
    tips: [
      'از ادعاهای تبلیغاتی و واژه‌های مبهم بپرهیزید.',
      'روی نام اساتید مطرح و جزئیات دقیق کارگاه‌های عملی تمرکز کنید.',
      'توضیح دهید که مدرک وزارت علوم قابل ترجمه رسمی و تاییدیه دادگستری است.'
    ]
  }
]

export default function RoleplayPage() {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loadingResponse, setLoadingResponse] = useState(false)
  const [loadingGrade, setLoadingGrade] = useState(false)
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null)
  const [isGraded, setIsGraded] = useState(false)
  
  const chatEndRef = useRef<HTMLDivElement>(null)

  const activePersona = PERSONAS.find(p => p.id === selectedPersonaId)

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loadingResponse])

  const handleStartRoleplay = (personaId: string) => {
    setSelectedPersonaId(personaId)
    setIsPlaying(true)
    setIsGraded(false)
    setGradeResult(null)
    
    const persona = PERSONAS.find(p => p.id === personaId)
    const initialGreeting = persona?.id === 'busy_customer' 
      ? 'سلام، بفرمایید؟ من جلسه دارم سریع بگید کارتون رو.'
      : persona?.id === 'low_budget'
      ? 'سلام وقتتون بخیر. من خیلی دوست دارم دوره حقوق کاربردی رو ثبت نام کنم ولی هزینش برام زیاده. تخفیف ندارید؟'
      : 'سلام. من در خصوص دوره مدیریت پروژه تماس گرفتم. قبلاً در موسسات دیگه ثبت‌نام کردم و اصلاً کیفیت مناسبی نداشتن. دوره شما چه فرقی داره؟'

    setMessages([
      {
        role: 'model',
        content: initialGreeting,
        timestamp: new Date()
      }
    ])
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || loadingResponse || !selectedPersonaId) return

    const userMessageContent = inputValue.trim()
    setInputValue('')

    // Append user message
    const updatedMessages = [
      ...messages,
      {
        role: 'user' as const,
        content: userMessageContent,
        timestamp: new Date()
      }
    ]
    setMessages(updatedMessages)
    setLoadingResponse(true)

    try {
      const res = await fetch('/api/ai/roleplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          scenario: selectedPersonaId,
          history: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          message: userMessageContent
        })
      })

      if (res.ok) {
        const json = await res.json()
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            content: json.text,
            timestamp: new Date()
          }
        ])
      } else {
        toast.error('خطا در دریافت پاسخ شبیه‌ساز')
      }
    } catch (err) {
      console.error(err)
      toast.error('ارتباط با سرور برقرار نشد')
    } finally {
      setLoadingResponse(false)
    }
  }

  const handleFinishAndGrade = async () => {
    if (messages.length < 2 || loadingGrade || !selectedPersonaId) {
      toast.warning('لطفاً چند پیام ارسال کنید تا شبیه‌ساز بتواند شما را ارزیابی کند.')
      return
    }

    setLoadingGrade(true)

    try {
      const res = await fetch('/api/ai/roleplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'grade',
          scenario: selectedPersonaId,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (res.ok) {
        const json = await res.json()
        setGradeResult(json)
        setIsGraded(true)
        setIsPlaying(false)
        toast.success('ارزیابی مکالمه با موفقیت انجام شد!')
      } else {
        toast.error('خطا در دریافت نمره ارزیابی')
      }
    } catch (err) {
      console.error(err)
      toast.error('خطا در تحلیل مکالمه توسط سرور')
    } finally {
      setLoadingGrade(false)
    }
  }

  const handleReset = () => {
    setSelectedPersonaId(null)
    setIsPlaying(false)
    setIsGraded(false)
    setGradeResult(null)
    setMessages([])
  }

  // Render Selection View
  if (!isPlaying && !isGraded) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">شبیه‌ساز تماس هوش مصنوعی (Roleplay AI)</h2>
          <p className="text-sm text-muted-foreground mt-1">
            یک محیط تمرینی تعاملی برای کارشناسان فروش جهت شبیه‌سازی مکالمات تلفنی با سناریوهای دشوار مشتریان و سنجش میزان توانایی متقاعدسازی.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PERSONAS.map((persona) => (
            <Card key={persona.id} className={`flex flex-col border shadow-none ${persona.borderColor} bg-card hover:bg-accent/10 transition-colors duration-150`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg font-bold text-sm ${persona.avatarColor}`}>
                    <User className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">{persona.name}</CardTitle>
                    <CardDescription className="text-xs font-medium text-foreground dark:text-foreground mt-0.5">
                      {persona.title}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 text-xs text-foreground">
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1">دوره هدف:</span>
                  <p className="bg-accent/40 px-2.5 py-1.5 rounded text-foreground inline-block">{persona.course}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1">ویژگی‌های اخلاقی:</span>
                  <p className="leading-relaxed">{persona.description}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1">دغدغه اصلی (Objection):</span>
                  <p className="text-rose-600 dark:text-rose-400 font-medium">{persona.objectionText}</p>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t">
                <Button 
                  onClick={() => handleStartRoleplay(persona.id)} 
         className="w-full bg-foreground text-background hover:bg-foreground/85 font-medium shadow-none h-9 text-xs"
                >
                  <Play className="size-3.5 mr-1" />
                  شروع تمرین و شبیه‌سازی
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="p-4 rounded-lg bg-accent/30 border text-xs text-muted-foreground flex gap-3 items-start leading-relaxed max-w-3xl">
          <Info className="size-5 text-foreground shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-foreground block mb-1">مربی هوش مصنوعی چگونه کار می‌کند؟</span>
            با کلیک بر روی هر مشتری، پنجره گفتگو باز می‌شود. مکالمه را درست مشابه یک کارشناس حرفه‌ای ادامه دهید. در انتها با کلیک بر روی دکمه امتیازدهی، مکالمه شما توسط هوش مصنوعی بر اساس اصول متقاعدسازی، پاسخ به اعتراضات و اخلاق حرفه‌ای تحلیل شده و به شما نمره تعلق می‌گیرد.
          </div>
        </div>
      </div>
    )
  }

  // Render Grading View
  if (isGraded && gradeResult) {
    const scoreColor = gradeResult.score >= 85 
      ? 'border-border text-foreground dark:text-foreground' 
      : gradeResult.score >= 70 
      ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' 
      : 'border-rose-500 text-rose-600 dark:text-rose-400'

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-8 px-2 text-xs">
            <ArrowLeft className="size-4 ml-1" />
            بازگشت به انتخاب مشتری
          </Button>
        </div>

        <Card className="border shadow-none bg-card">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto flex justify-center mb-3">
              <div className={`size-24 rounded-full border-4 flex flex-col items-center justify-center font-bold ${scoreColor}`}>
                <span className="text-3xl">{gradeResult.score}</span>
                <span className="text-[10px] text-muted-foreground">از ۱۰۰</span>
              </div>
            </div>
            <CardTitle className="text-lg font-bold text-foreground">کارنامه ارزیابی مکالمه فروش</CardTitle>
            <CardDescription className="text-xs">
              تحلیل عملکرد شما در گفتگو با <span className="font-semibold text-foreground">{activePersona?.name}</span> ({activePersona?.title})
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Separator />

            {/* Strengths */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground dark:text-foreground flex items-center gap-1.5">
                <ThumbsUp className="size-4" />
                مدیریت صحیح اعتراضات و نقاط قوت (Strengths)
              </h4>
              {gradeResult.objectionsHandled && gradeResult.objectionsHandled.length > 0 ? (
                <ul className="list-disc list-inside space-y-1.5 pl-2">
                  {gradeResult.objectionsHandled.map((item, idx) => (
                    <li key={idx} className="text-xs text-foreground leading-relaxed">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic pl-4">مورد خاصی ثبت نشد.</p>
              )}
            </div>

            {/* Mistakes */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="size-4" />
                اشتباهات و نقاط ضعف (Key Mistakes)
              </h4>
              {gradeResult.mistakes && gradeResult.mistakes.length > 0 ? (
                <ul className="list-disc list-inside space-y-1.5 pl-2">
                  {gradeResult.mistakes.map((item, idx) => (
                    <li key={idx} className="text-xs text-foreground leading-relaxed">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-foreground dark:text-foreground font-medium pl-4">عالی! هیچ اشتباه بزرگی در این گفتگو مشاهده نشد.</p>
              )}
            </div>

            {/* Tips */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Lightbulb className="size-4" />
                توصیه‌های مربیگری برای گفتگوهای بعدی (Tips)
              </h4>
              {gradeResult.tips && gradeResult.tips.length > 0 ? (
                <ul className="list-disc list-inside space-y-1.5 pl-2">
                  {gradeResult.tips.map((item, idx) => (
                    <li key={idx} className="text-xs text-foreground leading-relaxed">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground italic pl-4">توصیه خاصی ثبت نشد.</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 justify-end border-t pt-4">
            <Button variant="outline" onClick={() => selectedPersonaId && handleStartRoleplay(selectedPersonaId)} className="h-9 text-xs shadow-none">
              <RefreshCw className="size-3.5 mr-1" />
              تکرار تمرین با همین مشتری
            </Button>
      <Button onClick={handleReset} className="h-9 text-xs bg-foreground text-background hover:bg-foreground/85 shadow-none">
              انتخاب مشتری دیگر
              <ChevronLeft className="size-4 mr-1" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Render Active Simulation (Chat) View
  return (
    <div className="grid gap-6 md:grid-cols-4 h-[calc(100vh-140px)]">
      {/* Persona Info Side Panel */}
      <div className="md:col-span-1 space-y-4 flex flex-col justify-between border rounded-xl p-4 bg-card h-full overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded font-bold text-xs ${activePersona?.avatarColor}`}>
              <User className="size-4" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-foreground">{activePersona?.name}</h3>
              <p className="text-[10px] text-foreground font-medium">{activePersona?.title}</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3 text-xs">
            <div>
              <span className="font-bold text-muted-foreground block mb-0.5">دوره درخواستی:</span>
              <span className="text-foreground">{activePersona?.course}</span>
            </div>
            <div>
              <span className="font-bold text-muted-foreground block mb-0.5">دغدغه اصلی اعتراض:</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">{activePersona?.objectionText}</span>
            </div>
            <div>
              <span className="font-bold text-muted-foreground block mb-1">راه‌حل‌ها و راهنمای تقلب:</span>
              <ul className="list-inside list-decimal space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                {activePersona?.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t mt-4">
          <Button 
            variant="destructive" 
            onClick={handleFinishAndGrade} 
            className="w-full text-xs font-semibold h-9 shadow-none bg-rose-600 hover:bg-rose-700 text-white"
            disabled={loadingGrade || messages.length < 2}
          >
            {loadingGrade ? (
              <>
                <Loader2 className="size-3.5 animate-spin mr-1" />
                تحلیل و ارزیابی...
              </>
            ) : (
              <>
                <Award className="size-3.5 mr-1" />
                اتمام تماس و امتیازدهی
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleReset} 
            className="w-full text-xs text-muted-foreground mt-2 h-8"
            disabled={loadingGrade}
          >
            انصراف و خروج
          </Button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="md:col-span-3 flex flex-col border rounded-xl bg-card h-full overflow-hidden">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between bg-accent/10">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted/60 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-muted/60"></span>
            </span>
            <span className="text-xs font-bold text-foreground">تماس شبیه‌سازی‌شده فعال با {activePersona?.name}</span>
          </div>
          <Badge variant="outline" className="text-[10px] font-medium py-0.5 border-border text-foreground dark:text-foreground">
            {messages.length} تعامل
          </Badge>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 scrollbar-thin">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user'
            return (
              <div
                key={index}
                className={`flex items-start gap-2.5 max-w-[85%] ${isUser ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
              >
                <div className={`p-1.5 rounded-full shrink-0 text-xs ${
                  isUser 
                    ? 'bg-muted/60 text-foreground' 
                    : activePersona?.avatarColor || 'bg-accent text-foreground'
                }`}>
                  {isUser ? <User className="size-3.5" /> : <User className="size-3.5" />}
                </div>
                <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                  isUser 
                    ? 'bg-muted/60 text-foreground rounded-tr-none' 
                    : 'bg-accent/40 text-foreground rounded-tl-none border'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span className={`text-[9px] block text-right mt-1.5 ${isUser ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {msg.timestamp.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}

          {loadingResponse && (
            <div className="flex items-start gap-2.5 max-w-[80%] ml-auto">
              <div className={`p-1.5 rounded-full shrink-0 text-xs ${activePersona?.avatarColor || 'bg-accent'}`}>
                <User className="size-3.5" />
              </div>
              <div className="p-3.5 rounded-2xl bg-accent/40 text-muted-foreground rounded-tl-none border flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-foreground" />
                <span className="text-xs">در حال تایپ کردن...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t bg-accent/5 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loadingResponse || loadingGrade}
            placeholder="پاسخ خود را بنویسید و متقاعدش کنید..."
            className="flex-1 px-3 py-2 text-xs rounded-lg border bg-background focus:outline-none focus:ring-1 focus:ring-foreground/30 disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon"
            disabled={loadingResponse || loadingGrade || !inputValue.trim()}
      className="bg-foreground text-background hover:bg-foreground/85 rounded-lg h-9 w-9 shrink-0 shadow-none"
          >
            <Send className="size-4 shrink-0" />
          </Button>
        </form>
      </div>
    </div>
  )
}
