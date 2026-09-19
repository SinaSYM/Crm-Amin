'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Kanban,
  CalendarDays,
  Headphones,
  GraduationCap,
  Landmark,
  ShoppingCart,
  BarChart3,
  ClipboardList,
  BookOpen,
  MessageSquare,
  History,
  Settings,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'
import { useCRMStore, type ActiveView } from '@/lib/store'

interface HelpSection {
  view: ActiveView
  title: string
  icon: React.ElementType
  description: string
  tips?: string[]
}

const helpSections: HelpSection[] = [
  {
    view: 'dashboard',
    title: 'داشبورد',
    icon: LayoutDashboard,
    description:
      'اولین صفحه‌ای که بعد از ورود می‌بینید. خلاصه‌ای از کل وضعیت موسسه اینجاست: تعداد لیدها، ثبت‌نام‌ها، درآمد و نمودارها. پیگیری‌های پیش‌رو هم همینجا مشخص می‌شوند.',
    tips: [
      'از دکمه «افزودن لید» در بالای داشبورد می‌توانید سریع لید جدید ثبت کنید',
      'کارت‌های بالای صفحه آمار کل سیستم را نشان می‌دهند',
      'نمودار «ثبت‌نام به ازای دوره» محبوب‌ترین دوره‌ها را مقایسه می‌کند',
    ],
  },
  {
    view: 'leads',
    title: 'مدیریت لیدها',
    icon: Users,
    description:
      'لید یعنی مشتری بالقوه — کسی که هنوز ثبت‌نام نکرده ولی علاقه‌مند است. تمام لیدها در یک جدول اینجا هستند؛ می‌توانید جستجو کنید، فیلتر کنید، لید جدید بسازید یا وضعیت هر لید را تغییر دهید.',
    tips: [
      'دکمه 👁️ جزئیات کامل لید، ✏️ ویرایش و 🔄 تغییر وضعیت را باز می‌کند',
      'وقتی لید ثبت‌نام کرد، از دکمه «تبدیل» او را به دانش‌پذیر تبدیل کنید',
      'چند لید را تیک بزنید تا عملیات گروهی (تغییر وضعیت/حذف) انجام دهید',
    ],
  },
  {
    view: 'kanban',
    title: 'خط لوله لیدها (کانبن)',
    icon: Kanban,
    description:
      'همان لیدها اما به شکل کارت‌های قابل کشیدن روی ستون‌های وضعیت: جدید → تماس گرفته شده → در حال پیگیری → تبدیل شده. برای جابه‌جا کردن کافی است کارت را بکشید و رها کنید.',
    tips: [
      'با کشیدن کارت بین ستون‌ها، وضعیت لید خودکار ذخیره می‌شود',
      'برای دیدن اطلاعات بیشتر روی کارت کلیک کنید',
    ],
  },
  {
    view: 'calendar',
    title: 'تقویم پیگیری‌ها',
    icon: CalendarDays,
    description:
      'همه تماس‌ها و پیگیری‌هایی که برای آینده برنامه‌ریزی شده‌اند، روی تقویم. اینجا می‌فهمید امروز و فردا با چه کسانی باید تماس بگیرید.',
    tips: [
      'هر تعاملی که «زمان پیگیری بعدی» داشته باشد خودکار اینجا می‌افتد',
      'از زنگ اعلان بالای صفحه هم پیگیری‌های نزدیک را می‌بینید',
    ],
  },
  {
    view: 'sales-panel',
    title: 'پنل فروش',
    icon: Headphones,
    description:
      'میزکار روزانه کارشناس فروش: لیدهای اختصاص‌یافته به شما، آمار عملکردتان و دسترسی سریع به ثبت تعامل. مدیران هم وضعیت همه کارشناسان را اینجا می‌بینند.',
    tips: [
      'بعد از هر تماس حتماً یک تعامل ثبت کنید تا تاریخچه کامل بماند',
      'لید بدون مسئول پیگیری معمولاً فراموش می‌شود — آن را به خودتان اختصاص دهید',
    ],
  },
  {
    view: 'roleplay',
    title: 'شبیه‌ساز تماس (هوش مصنوعی)',
    icon: GraduationCap,
    description:
      'یک محیط امن برای تمرین! هوش مصنوعی نقش مشتری سخت‌گیر را بازی می‌کند و شما تمرین می‌کنید چطور با اعتراض قیمت و بهانه‌ها کنار بیایید.',
    tips: [
      'قبل از تماس واقعی با لیدهای مهم، چند دقیقه اینجا تمرین کنید',
      'بازخوردهای AI را جدی بگیرید — نقطه ضعف‌های مکالمه را نشان می‌دهد',
    ],
  },
  {
    view: 'users',
    title: 'مدیریت کاربران',
    icon: ClipboardList,
    description:
      'لیست همه کارکنان سیستم. ادمین از اینجا کاربر جدید می‌سازد، نقش می‌دهد و حساب‌ها را فعال/غیرفعال می‌کند. درخواست‌های ثبت‌نام افراد جدید هم در تب «درخواست‌های تایید نشده» همین صفحه تایید می‌شوند.',
    tips: [
      'ثبت‌نام‌های جدید باید توسط مدیر از تب مخصوص تایید شوند',
      'غیرفعال کردن کاربر یعنی دیگر نمی‌تواند وارد شود، ولی سوابقش حفظ می‌ماند',
    ],
  },
  {
    view: 'courses',
    title: 'دوره‌ها',
    icon: BookOpen,
    description:
      'کاتالوگ دوره‌های آموزشی موسسه با قیمت، ظرفیت و وضعیت برگزاری. دوره‌ها پایه‌ی ثبت‌نام‌ها و پرداخت‌ها هستند.',
    tips: [
      'ظرفیت پر شده؟ دوره را غیرفعال کنید تا در ثبت‌نام‌های جدید ظاهر نشود',
    ],
  },
  {
    view: 'enrollments',
    title: 'ثبت‌نام‌ها',
    icon: GraduationCap,
    description:
      'هر دانش‌پذیری که در دوره‌ای نام‌نویسی کرده، یک ثبت‌نام است. وضعیت پرداخت هر نفر (پرداخت کامل یا اقساطی) اینجا دیده می‌شود و اقساط از همین‌جا مدیریت می‌شوند.',
    tips: [
      'برای افزودن قسط، جزئیات ثبت‌نام را باز کنید و پرداخت جدید اضافه کنید',
      'خروجی CSV برای گزارش‌گیری اکسل موجود است',
    ],
  },
  {
    view: 'interactions',
    title: 'تعاملات',
    icon: MessageSquare,
    description:
      'تاریخچه تمام تماس‌ها، یادداشت‌ها و پیام‌های سیستمی مربوط به لیدها. هر تغییری در وضعیت لید هم به‌صورت خودکار اینجا ثبت می‌شود.',
    tips: [
      'با فیلتر «دارای پیگیری» فقط مواردی را ببینید که زمان پیگیری دارند',
    ],
  },
  {
    view: 'analytics',
    title: 'گزارش‌ها و تحلیل',
    icon: BarChart3,
    description:
      'تصویر بزرگ کسب‌وکار: قیف فروش (چند لید تبدیل شد)، منابع ورود لید، نرخ تبدیل هر کارشناس و روند درآمد. برای جلسات مدیریت عالی است.',
    tips: [
      'اگر قیف فروش وسط راه باریک می‌شود، مشکل در مرحله پیگیری است نه جذب',
      'خروجی CSV همه نمودارها قابل گرفتن است',
    ],
  },
  {
    view: 'financial-dashboard',
    title: 'داشبورد مالی',
    icon: Landmark,
    description:
      'وضعیت مالی کل مجموعه: درآمد کل، پرداخت‌های دریافتی، اقساط معوقه و چک‌های پیش‌رو. واحد مالی اینجا همه‌چیز را رصد می‌کند.',
    tips: [
      'اقساط سررسید گذشته را اولویت اول پیگیری قرار دهید',
    ],
  },
  {
    view: 'purchase-requests',
    title: 'تنخواه و درخواست خرید',
    icon: ShoppingCart,
    description:
      'کارکنان از اینجا درخواست خرید یا تنخواه ثبت می‌کنند و مدیران تایید یا رد می‌کنند. کل گردش کار خرید بدون کاغذ و پیامک انجام می‌شود.',
    tips: [
      'درخواست‌های تاییدشده مستقیماً وارد جریان مالی می‌شوند',
    ],
  },
  {
    view: 'teacher-coordination',
    title: 'هماهنگی اساتید',
    icon: GraduationCap,
    description:
      'لیست اساتید، تخصص‌ها و تاریخچه جلسات کلاس‌ها. مسئول آموزش از اینجا اساتید را به دوره‌ها متصل و جلسات را هماهنگ می‌کند.',
  },
  {
    view: 'activity-logs',
    title: 'لاگ‌های فعالیت',
    icon: History,
    description:
      'رد پای دیجیتال! هر کی، کِی، چه کاری در سیستم انجام داده — از تغییر وضعیت لید تا حذف کاربر. برای حسابرسی و پیدا کردن مقصر خطاهاست.',
    tips: [
      'با جستجو می‌توانید فعالیت یک کاربر خاص را جدا کنید',
    ],
  },
  {
    view: 'settings',
    title: 'تنظیمات',
    icon: Settings,
    description:
      'حساب کاربری خودتان: ویرایش اطلاعات شخصی، یادداشت‌های خصوصی و تنظیمات نمایش. رمز عبور هم از همین‌جا قابل تغییر است.',
  },
]

export default function HelpPage() {
  const { setActiveView } = useCRMStore()
  const [openId, setOpenId] = useState<string | null>('dashboard')

  return (
    <div className="mx-auto max-w-3xl">
      {/* Page header — Notion doc style */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
          <HelpCircle className="size-4" />
          <span>راهنما</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground">راهنمای استفاده از سامانه</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          هر بخش از سیستم چه‌کاری انجام می‌دهد و چطور از آن استفاده کنید.
          روی هر عنوان کلیک کنید تا باز شود؛ برای رفتن به آن بخش، روی «رفتن به بخش» بزنید.
        </p>
      </div>

      {/* Accordion list */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        {helpSections.map((section, idx) => {
          const isOpen = openId === section.view
          const Icon = section.icon
          return (
            <div key={section.view} className={idx > 0 ? 'border-t border-border' : ''}>
              <button
                onClick={() => setOpenId(isOpen ? null : section.view)}
                className="notion-hover w-full flex items-center gap-3 px-4 py-3 text-start"
                aria-expanded={isOpen}
              >
                <div className="flex items-center justify-center size-7 rounded-md bg-secondary shrink-0">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <span className="flex-1 text-sm font-medium text-foreground">{section.title}</span>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 ps-[60px] -mt-1">
                  <p className="text-sm leading-7 text-muted-foreground">{section.description}</p>
                  {section.tips && section.tips.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {section.tips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-[13px] leading-6 text-foreground/80">
                          <span className="mt-[9px] size-1.5 rounded-full bg-primary/60 shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    onClick={() => setActiveView(section.view)}
                    className="notion-hover mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-primary hover:text-primary"
                  >
                    رفتن به بخش «{section.title}»
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        سوال دیگری دارید؟ با مدیر سیستم در میان بگذارید.
      </p>
    </div>
  )
}
