'use client'

import { useState, useEffect, useRef } from 'react'
import {
  GraduationCap,
  Mail,
  Phone,
  LogIn,
  Shield,
  ShieldCheck,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  Loader2,
  UserPlus,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

import { useCRMStore } from '@/lib/store'

export default function LoginPage({ initialResetToken }: { initialResetToken?: string } = {}) {
  const { login } = useCRMStore()

  // Mode: login or register
  const [mode, setMode] = useState<'login' | 'register'>(initialResetToken ? 'login' : 'login')

  // Login state
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Register state
  const [regFirstName, setRegFirstName] = useState('')
  const [regLastName, setRegLastName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [regSuccess, setRegSuccess] = useState(false)

  // Title typing effect
  const fullTitleText = 'آموزش عالی آزاد امین'
  const [displayedTitle, setDisplayedTitle] = useState('')
  const [titleComplete, setTitleComplete] = useState(false)
  const typingTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let index = 0
    setDisplayedTitle('')
    setTitleComplete(false)
    if (typingTimer.current) clearInterval(typingTimer.current)
    typingTimer.current = setInterval(() => {
      if (index < fullTitleText.length) {
        setDisplayedTitle((prev) => prev + fullTitleText.charAt(index))
        index++
      } else {
        setTitleComplete(true)
        if (typingTimer.current) clearInterval(typingTimer.current)
      }
    }, 90)
    return () => { if (typingTimer.current) clearInterval(typingTimer.current) }
  }, [])

  const currentPersianYear = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(new Date())

  // ─── Login Handler ───────────────────────────────────────
  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const id = loginIdentifier.trim()
    const pass = loginPassword.trim()

    if (!id) { toast.error('لطفاً ایمیل یا شماره موبایل را وارد کنید'); return }
    if (!pass) { toast.error('لطفاً رمز عبور را وارد کنید'); return }

    setLoginLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id, password: pass }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setLoginLoading(false)
        toast.error(err.error || 'ورود ناموفق بود')
        return
      }
      const json = await res.json()
      const u = json.user
      setTimeout(() => {
        login({
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          phone_number: u.phone_number,
        })
      }, 400)
    } catch {
      setLoginLoading(false)
      toast.error('ارتباط با سرور برقرار نشد')
    }
  }

  // ─── Register Handler ────────────────────────────────────
  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!regFirstName.trim() || !regLastName.trim()) {
      toast.error('لطفاً نام و نام خانوادگی را وارد کنید'); return
    }
    if (!regEmail.trim() && !regPhone.trim()) {
      toast.error('حداقل یکی از ایمیل یا شماره موبایل الزامی است'); return
    }
    if (regEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      toast.error('ایمیل نامعتبر است'); return
    }
    if (regPhone.trim() && regPhone.trim().length < 8) {
      toast.error('شماره موبایل نامعتبر است'); return
    }
    if (regPassword.length < 8) {
      toast.error('رمز عبور باید حداقل ۸ کاراکتر باشد'); return
    }
    if (regPassword !== regPasswordConfirm) {
      toast.error('رمز عبور و تکرار آن یکسان نیستند'); return
    }

    setRegLoading(true)
    try {
      const body: Record<string, string> = {
        first_name: regFirstName.trim(),
        last_name: regLastName.trim(),
        password: regPassword,
      }
      if (regEmail.trim()) body.email = regEmail.trim().toLowerCase()
      if (regPhone.trim()) body.phone_number = regPhone.trim()

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setRegLoading(false)
        toast.error(err.error || 'خطا در ثبت‌نام')
        return
      }
      setRegSuccess(true)
      toast.success('ثبت‌نام با موفقیت انجام شد!')
    } catch {
      setRegLoading(false)
      toast.error('ارتباط با سرور برقرار نشد')
    }
  }

  // ─── Reset Password State ────────────────────────────────
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [resetConfirmPassword, setResetConfirmPassword] = useState('')
  const [submittingReset, setSubmittingReset] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  // Once the user finishes resetting, drop the token so they land on the
  // normal login form instead of being stuck on the reset screen.
  const [resetTokenCleared, setResetTokenCleared] = useState(false)
  const effectiveResetToken = resetTokenCleared ? undefined : initialResetToken

  // ─── Login Success Animation ─────────────────────────────
  const [loginSuccess, setLoginSuccess] = useState(false)

  const handleConfirmPasswordReset = async () => {
    if (!resetNewPassword || resetNewPassword.length < 8) {
      toast.error('رمز عبور باید حداقل ۸ کاراکتر باشد'); return
    }
    if (resetNewPassword !== resetConfirmPassword) {
      toast.error('رمز عبور و تکرار آن یکسان نیستند'); return
    }
    setSubmittingReset(true)
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: effectiveResetToken, newPassword: resetNewPassword }),
      })
      const json = await res.json()
      if (res.ok) {
        setResetDone(true)
        toast.success('رمز عبور با موفقیت تغییر کرد.')
      } else {
        toast.error(json.error || 'لینک بازیابی نامعتبر یا منقضی شده است')
      }
    } catch {
      toast.error('ارتباط با سرور برقرار نشد')
    } finally {
      setSubmittingReset(false)
    }
  }

  // ─── Reset Password Mode ─────────────────────────────────
  if (effectiveResetToken && !resetDone) {
    return (
      <div className="min-h-screen auth-canvas flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md">
          <Card className="border border-border bg-card shadow-lg rounded-2xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-primary mb-3 shadow-sm">
                <GraduationCap className="size-7 text-white" />
              </div>
              <h1 className="text-lg font-bold text-foreground">تعیین رمز عبور جدید</h1>
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">رمز عبور جدید</Label>
                <Input type="password" value={resetNewPassword} onChange={(e) => setResetNewPassword(e.target.value)} className="h-10 text-xs" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">تکرار رمز عبور</Label>
                <Input type="password" value={resetConfirmPassword} onChange={(e) => setResetConfirmPassword(e.target.value)} className="h-10 text-xs" dir="ltr" />
              </div>
       <Button onClick={handleConfirmPasswordReset} disabled={submittingReset} className="w-full bg-primary hover:bg-primary/90 font-semibold h-10 text-xs shadow-none">
                {submittingReset ? 'در حال ثبت...' : 'تغییر رمز عبور'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (resetDone) {
    return (
      <div className="min-h-screen auth-canvas flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md text-center">
          <Card className="border border-border bg-card shadow-lg rounded-2xl overflow-hidden">
            <CardContent className="p-8 space-y-4">
              <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2">
                <GraduationCap className="size-8" />
              </div>
              <p className="text-sm font-semibold text-primary">رمز عبور شما با موفقیت تغییر کرد.</p>
       <Button onClick={() => {
                setResetTokenCleared(true)
                setResetDone(false)
                setMode('login')
                if (typeof window !== 'undefined') {
                  window.history.replaceState({}, '', window.location.pathname)
                }
              }} className="w-full bg-primary hover:bg-primary/90 font-semibold h-10 text-xs">
                ورود به سیستم
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen auth-canvas flex items-center justify-center p-4 relative" dir="rtl">
      {!loginSuccess ? (
        <div className="w-full max-w-md">
          <Card className="border border-border bg-card shadow-lg rounded-2xl overflow-hidden">
            {/* Header — minimal, monochrome */}
            <div className="pt-10 pb-2 px-8 text-center">
              <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-foreground text-background mb-4 shadow-md">
                <GraduationCap className="size-8" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-1">
                {displayedTitle}
                {!titleComplete && <span className="animate-pulse">|</span>}
              </h1>
              <p className="text-muted-foreground text-xs">سامانه هوشمند ارتباط با مشتری (CRM)</p>
            </div>

            <CardContent className="p-6 sm:p-8">
              {/* ═══ Login Mode ═══ */}
              {mode === 'login' && !regSuccess && (
                <>
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-foreground">ورود به سیستم</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      ایمیل یا شماره موبایل و رمز عبور خود را وارد کنید
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-id" className="text-xs font-medium text-muted-foreground">
                        ایمیل یا شماره موبایل
                      </Label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="login-id"
                          type="text"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          placeholder="[email protected] یا 09121234567"
                          dir="ltr"
                          className="pr-9 h-10 text-xs"
                          autoComplete="username"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="login-pass" className="text-xs font-medium text-muted-foreground">
                        رمز عبور
                      </Label>
                      <div className="relative">
                        <Shield className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="login-pass"
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="رمز عبور"
                          dir="ltr"
                          className="pr-9 h-10 text-xs"
                          autoComplete="current-password"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loginLoading}
           className="w-full bg-primary hover:bg-primary/90 gap-2 h-11 shadow-none font-medium text-sm mt-2"
                    >
                      {loginLoading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                      ورود به پنل کاربری
                    </Button>

                    <p className="text-[10px] text-muted-foreground text-center mt-1">
                      * حساب شما پس از تایید توسط مدیر فعال خواهد شد.
                    </p>
                  </form>

                  {/* Register link */}
                  <div className="text-center mt-6">
                    <SeparatorLine />
                    <button
                      type="button"
                      onClick={() => { setMode('register'); setRegSuccess(false) }}
                      className="mt-4 w-full flex items-center justify-center gap-2 text-xs font-semibold text-primary hover:text-primary dark:text-primary bg-primary/5 hover:bg-primary/10 px-4 py-3 rounded-xl border border-primary/20 transition-colors"
                    >
                      <UserPlus className="size-4" />
                      ثبت‌نام کاربر جدید
                    </button>
                  </div>
                </>
              )}

              {/* ═══ Register Mode ═══ */}
              {mode === 'register' && !regSuccess && (
                <>
                  <div className="text-center mb-5">
                    <h2 className="text-lg font-bold text-foreground">ثبت‌نام کاربر جدید</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      اطلاعات خود را وارد کنید. پس از تایید مدیریت حساب شما فعال می‌شود.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {/* ── Form (right side in RTL) ── */}
                    <form onSubmit={handleRegister} className="md:col-span-3 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">نام *</Label>
                          <Input
                            value={regFirstName}
                            onChange={(e) => setRegFirstName(e.target.value)}
                            placeholder="مثال: علی"
                            className="h-10 text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">نام خانوادگی *</Label>
                          <Input
                            value={regLastName}
                            onChange={(e) => setRegLastName(e.target.value)}
                            placeholder="مثال: اکبری"
                            className="h-10 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">ایمیل (اختیاری)</Label>
                        <div className="relative">
                          <Mail className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            type="email"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="[email protected]"
                            dir="ltr"
                            className="pr-9 h-10 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">شماره موبایل (اختیاری)</Label>
                        <div className="relative">
                          <Phone className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="09121234567"
                            dir="ltr"
                            className="pr-9 h-10 text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">رمز عبور (حداقل ۸ کاراکتر) *</Label>
                        <Input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="حداقل ۸ کاراکتر"
                          dir="ltr"
                          className="h-10 text-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">تکرار رمز عبور *</Label>
                        <Input
                          type="password"
                          value={regPasswordConfirm}
                          onChange={(e) => setRegPasswordConfirm(e.target.value)}
                          placeholder="رمز عبور را دوباره وارد کنید"
                          dir="ltr"
                          className="h-10 text-xs"
                        />
                      </div>

                      <Button
                        type="submit"
                        disabled={regLoading}
             className="w-full bg-primary hover:bg-primary/90 font-semibold h-11 text-sm shadow-none mt-2"
                      >
                        {regLoading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                        ثبت‌نام و ارسال درخواست
                      </Button>
                    </form>

                    {/* ── Confirmation side panel (left side in RTL) ── */}
                    <aside className="md:col-span-2">
                      <div className="h-full rounded-2xl border border-border/70 bg-muted/40 p-4 flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center size-9 rounded-xl bg-foreground text-background shrink-0">
                            <ShieldCheck className="size-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-foreground">تایید حساب کاربری</h3>
                            <p className="text-[10px] text-muted-foreground">مراحل فعال‌سازی حساب شما</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {[
                            {
                              icon: ClipboardCheck,
                              title: 'تکمیل اطلاعات',
                              desc: 'فرم ثبت‌نام را با اطلاعات صحیح پر کنید',
                            },
                            {
                              icon: Clock,
                              title: 'بررسی توسط مدیریت',
                              desc: 'درخواست شما برای تایید به مدیریت ارسال می‌شود',
                            },
                            {
                              icon: CheckCircle2,
                              title: 'فعال‌سازی حساب',
                              desc: 'پس از تایید، با ایمیل یا شماره موبایل وارد شوید',
                            },
                          ].map((step, i) => (
                            <div key={step.title} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <div className="flex items-center justify-center size-7 rounded-full bg-muted text-muted-foreground shrink-0">
                                  <step.icon className="size-3.5" />
                                </div>
                                {i < 2 && <div className="w-px flex-1 bg-border my-1" />}
                              </div>
                              <div className="pb-1">
                                <p className="text-xs font-semibold text-foreground">{step.title}</p>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">{step.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-auto rounded-xl border border-amber-200/70 dark:border-amber-500/25 bg-amber-50/60 dark:bg-amber-500/10 p-3">
                          <div className="flex items-center gap-2">
                            <Clock className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                              وضعیت درخواست: در انتظار تایید مدیریت
                            </p>
                          </div>
                          <p className="text-[10px] text-amber-700/80 dark:text-amber-300/70 mt-1 leading-relaxed">
                            تا زمان تایید، امکان ورود به سیستم وجود ندارد.
                          </p>
                        </div>
                      </div>
                    </aside>
                  </div>

                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="text-xs text-muted-foreground hover:text-primary hover:underline font-medium"
                    >
                      بازگشت به صفحه ورود
                    </button>
                  </div>
                </>
              )}

              {/* ═══ Registration Success ═══ */}
              {regSuccess && (
                <div className="text-center space-y-4 py-4">
                  <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary">
                    <GraduationCap className="size-8" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground mb-2">ثبت‌نام با موفقیت انجام شد! 🎉</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      درخواست عضویت شما ثبت شد و پس از تایید مدیریت، حساب شما فعال خواهد شد.
                      <br />
                      برای ورود منتظر تایید باشید.
                    </p>
                  </div>
                  <Button
                    onClick={() => { setMode('login'); setRegSuccess(false) }}
          className="w-full bg-primary hover:bg-primary/90 font-semibold h-11 text-sm"
                  >
                    بازگشت به ورود
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-[11px] text-muted-foreground mt-6">
            سیستم مدیریت ارتباط با مشتری — مؤسسه آموزشی © {currentPersianYear}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="size-16 rounded-2xl bg-foreground flex items-center justify-center shadow-md">
            <GraduationCap className="size-9 text-background" />
          </div>
          <p className="text-sm font-semibold text-foreground animate-pulse">
            در حال ورود به سیستم...
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Separator line with text ──────────────────────────────
function SeparatorLine() {
  return (
    <div className="relative my-2">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-[10px]">
        <span className="bg-card px-2 text-muted-foreground">حساب کاربری ندارید؟</span>
      </div>
    </div>
  )
}
