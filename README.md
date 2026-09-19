# CRM موسسه آموزش عالی آزاد امین

سیستم مدیریت ارتباط با مشتری (CRM) بومی، فول‌استک، بر پایه Next.js 16 + React 19 + Prisma + SQLite/PostgreSQL برای موسسه آموزش عالی آزاد امین.

## 📋 جدول محتوا

- [معماری و تکنولوژی‌ها](#معماری-و-تکنولوژی‌ها)
- [ماژول‌های اصلی](#ماژول-اصلی)
- [نقش‌ها و دسترسی‌ها](#نقش‌ها-و-دسترسی‌ها)
- [پایگاه داده](#پایگاه-داده)
- [API Routes](#api-routes)
- [کاربرهای پیش‌فرض (Demo)](#کاربرهای-پیش‌فرض-demo)
- [استقرار (Deployment)](#استقرار-deployment)
- [توسعه و دستورالعمل‌ها](#توسعه-و-دستورالعمل‌ها)
- [امنیت](#امنیت)
- [مستندات تکمیلی](#مستندات-تکمیلی)

---

## معماری و تکنولوژی‌ها

| لایه | تکنولوژی | نسخه | هزینه لایسنس |
|------|-----------|-------|-------------|
| **Frontend** | Next.js (App Router) | 16.x | رایگان (MIT) |
| **UI** | React 19, Tailwind CSS 4, shadcn/ui, Radix UI | Latest | رایگان |
| **State** | Zustand, TanStack Query v5 | Latest | رایگان |
| **Charts** | Recharts, Framer Motion | Latest | رایگان |
| **Backend** | Next.js API Routes, Prisma ORM | 6.x | رایگان |
| **DB** | SQLite (dev) / PostgreSQL (prod) | - | رایگان |
| **Auth** | Custom JWT + HttpOnly Cookie | Custom | رایگان |
| **AI** | Google Gemini 1.5 Flash (API) | - | هزینه توکن (بسیار ناچیز) |
| **Cron** | Node.js Worker (standalone) | - | هزینه سرور |
| **Deploy** | Docker/Standalone, Nginx, PM2 | - | هزینه سرور |

---

## ماژول‌های اصلی

| ماژول | توضیحات | سطح پیچیدگی |
|-------|---------|-------------|
| **مدیریت لید (Leads)** | CRUD کامل، وضعیت ۴ حالته (NEW→CONTACTED→IN_PROGRESS→CONVERTED)، امتیازدهی هوشمند، تخصیص اتوماتیک/دستی، عارضه‌یاب عمومی | ⭐⭐⭐⭐ |
| **پنل فروش (Sales Panel)** | مدیریت تعاملی لیدها (تماس/یادداشت/پیگیری)، تسک‌ها، تقویم، کوچ هوش مصنوعی لحظه‌ای، کانبان | ⭐⭐⭐⭐⭐ |
| **داشبورد آنالیتیکس** | نمودارهای real-time (Recharts)، نرخ تبدیل، درآمد، توزیع منبع، پیگیری‌ها، عملکرد کارشناسان | ⭐⭐⭐⭐ |
| **پورتال دانش‌پذیر** | کلاس‌ها/آرشیو ویدیو، تیکت پشتیبانی، منتور هوشمند AI، سیستم سفیر/همکاری در فروش | ⭐⭐⭐⭐ |
| **مدیریت دوره/ثبت‌نام/پرداخت** | دوره‌ها، ظرفیت، اقساط، چک، وضعیت پرداخت، خروجی اکسل | ⭐⭐⭐ |
| **ربات عارضه‌یاب عمومی** | فرم وب‌سایت → تحلیل AI کسب‌وکار → ایجاد لید با امتیاز و چالش اصلی → تخصیص کارشناس کم‌بارترین | ⭐⭐⭐⭐⭐ |
| **کوچ هوش مصنوعی فروش (AI Sales Coach)** | تحلیل تاریخچه مکالمات لید → ۳ راهنمای آموزشی + اقدام بعدی + تحلیل حس + درصد تبدیل | ⭐⭐⭐⭐⭐ |
| **منتور هوشمند دانش‌پذیر (AI Mentor)** | چت‌بات تخصصی با کانتکست دوره، سرفصل‌ها، جلسات گذشته | ⭐⭐⭐⭐ |
| **تولید محتوای هوشمند (AI Content Gen)** | پیامک/ایمیل شخصی‌سازی‌شده بر اساس پلتفرم، لحن، هدف | ⭐⭐⭐ |
| **شبیه‌ساز فروش (AI Roleplay)** | ۳ سناریو (مشتری بی‌حوصله، بودجه محدود، شکاک فنی) + ارزیابی JSON با نمره/نقاط قوت/ضعف/نکات | ⭐⭐⭐⭐⭐ |
| **سیستم کارمندان/دپارتمان/دسترسی** | ۸ نقش، ۵ دپارتمان، Scope (STANDARD/GLOBAL)، لاگ فعالیت کامل | ⭐⭐⭐ |
| **کمیسیون/سفیر/معرفی** | کد معرف، کمیسیون از تبدیل، کیف پول، سفیر دانش‌پذیر | ⭐⭐⭐ |
| **یادآوری خودکار (Cron Worker)** | تسک‌های با reminder_time → Webhook (SMS/پوش/ایمیل) | ⭐⭐⭐ |

---

## نقش‌ها و دسترسی‌ها (RBAC)

### ۸ نقش سیستم

| نقش | کد | توضیحات | دسترسی‌ها اصلی |
|------|-----|---------|----------------|
| **ادمین** | `ADMIN` | دسترسی کامل به کل سیستم | همه viewها، مدیریت کاربران، لاگ فعالیت‌ها |
| **مدیر فروش** | `SALES_MANAGER` | مدیریت تیم فروش، دیدن دپارتمان | لیدها، کانبان، تقویم، پنل فروش، کاربران، دوره‌ها، تعاملات، ثبت‌نام‌ها، آنالیتیکس |
| **کارشناس فروش** | `SALES_AGENT` | کار روی لیدهای اختصاص‌داده‌شده | داشبورد، پنل فروش، رول‌پلی، لیدها، کانبان، تقویم، تعاملات، درخواست خرید |
| **دانش‌پذیر** | `STUDENT` | دسترسی به پورتال دانش‌پذیر | داشبورد، دوره‌ها، ثبت‌نام‌ها، تنظیمات |
| **مسئول آموزش** | `EDUCATION_OFFICER` | هماهنگی اساتید، دوره‌ها | داشبورد، دوره‌ها، تقویم، هماهنگی اساتید، درخواست خرید |
| **مسئول امور مالی** | `FINANCIAL_OFFICER` | مدیریت مالی، پرداخت‌ها | داشبورد، ثبت‌نام‌ها، داشبورد مالی، درخواست خرید |
| **منتور** | `MENTOR` | راهنمایی لیدها | داشبورد، لیدها، کانبان، تقویم، تعاملات |
| **مدیر دپارتمان** | `DEPT_MANAGER` | مدیریت دپارتمان خاص | داشبورد، لیدها، کانبان، تقویم، پنل فروش، کاربران، دوره‌ها، تعاملات، ثبت‌نام‌ها، آنالیتیکس |

### ۵ دپارتمان

- `MANAGEMENT` — مدیریت
- `REAL_ESTATE` — مشاور املاک
- `FINANCE` — مالی
- `LAW` — حقوق
- `PROJECT_MANAGEMENT` — مدیریت پروژه

### تفکیک داده (Data Isolation)

| نقش | فیلتر اعمال شده |
|------|-----------------|
| `SALES_AGENT` | `assigned_to_id == currentUserId` |
| `DEPT_MANAGER` / `SALES_MANAGER` | `department == user.department` (لیدها و دوره‌ها) |
| `ADMIN` / `EDUCATION_OFFICER` / `FINANCIAL_OFFICER` | بدون فیلتر (دسترسی کامل) |

---

## پایگاه داده

### مدل‌های اصلی Prisma (`prisma/schema.prisma`)

```prisma
// Enums
enum UserRole { ADMIN, SALES_MANAGER, SALES_AGENT, STUDENT, EDUCATION_OFFICER, FINANCIAL_OFFICER, MENTOR, DEPT_MANAGER }
enum UserScope { STANDARD, GLOBAL }
enum LeadStatus { NEW, CONTACTED, IN_PROGRESS, CONVERTED }
enum InteractionType { CALL, NOTE, SYSTEM }
enum PaymentStatus { PAID, INSTALLMENT }
enum PaymentType { FULL, INSTALLMENT }
enum PaymentItemStatus { PENDING, PAID, OVERDUE }
enum CommissionStatus { PENDING, APPROVED, PAID }

// Models
model User { ... }
model Lead { ... }
model Interaction { ... }
model Course { ... }
model Enrollment { ... }
model Payment { ... }  // شامل فیلدهای چک: check_number, check_bank, check_date, check_status
model Ticket { ... }
model ClassSession { ... }
model Task { ... }     // شامل reminder_time، reminder_sent
model Commission { ... }
model ActivityLog { ... }
model PurchaseRequest { ... }
model Teacher { ... }
model SignupRequest { ... }
```

### اجرا و مهاجرتی

```bash
# تولید Prisma Client
bun run db:generate

# اعمال تغییرات схما (dev)
bun run db:push

# سیدر دیتابیس
bun run db:seed
```

---

## API Routes

سازماندهی: `src/app/api/{resource}/route.ts`

### احراز هویت و جلسات
| متد | مسیر | توضیحات |
|-----|------|---------|
| POST | `/api/auth/login` | ورود با ایمیل/رمز |
| POST | `/api/auth/logout` | خروج |
| GET | `/api/auth/me` | اطلاعات کاربر جاری |
| POST | `/api/auth/signup` | ثبت‌نام عمومی (PENDING) |
| POST | `/api/auth/signup/approve` | تأیید ثبت‌نام توسط ادمین |

### لیدها (Leads)
| متد | مسیر | توضیحات |
|-----|------|---------|
| GET | `/api/leads` | لیست لیدها (با فیلتر نقش/دپارتمان) |
| POST | `/api/leads` | ایجاد لید (عمومی: بدون auth) |
| GET | `/api/leads/[id]` | جزئیات لید |
| PUT | `/api/leads/[id]` | ویرایش لید |
| DELETE | `/api/leads/[id]` | حذف لید |
| POST | `/api/leads/[id]/convert` | تبدیل لید به دانش‌پذیر |
| POST | `/api/leads/compute-scores` | محاسبه امتیاز لیدها |
| POST | `/api/leads/import` | ایمپورت CSV |

### تعاملات (Interactions)
| متد | مسیر | توضیحات |
|-----|------|---------|
| GET | `/api/interactions` | لیست تعاملات (فیلتر lead_id) |
| POST | `/api/interactions` | ثبت تعامل جدید |
| PUT | `/api/interactions/[id]` | ویرایش تعامل |

### کاربران
| متد | مسیر | توضیحات |
|-----|------|---------|
| GET | `/api/users` | لیست کاربران |
| POST | `/api/users` | ایجاد کاربر (Admin) |
| GET | `/api/users/[id]` | جزئیات کاربر |
| PUT | `/api/users/[id]` | ویرایش کاربر (شامل admin_notes) |
| DELETE | `/api/users/[id]` | غیرفعال/حذف کاربر |
| GET | `/api/users/export` | خروجی CSV |

### دوره‌ها
| متد | مسیر | توضیحات |
|-----|------|---------|
| GET | `/api/courses` | لیست دوره‌ها |
| POST | `/api/courses` | ایجاد دوره |
| GET | `/api/courses/[id]` | جزئیات دوره |
| PUT | `/api/courses/[id]` | ویرایش دوره |
| DELETE | `/api/courses/[id]` | حذف دوره |

### ثبت‌نام‌ها
| متد | مسیر | توضیحات |
|-----|------|---------|
| GET | `/api/enrollments` | لیست ثبت‌نام‌ها |
| POST | `/api/enrollments` | ایجاد ثبت‌نام |
| GET | `/api/enrollments/[id]` | جزئیات |
| PUT | `/api/enrollments/[id]` | ویرایش |
| POST | `/api/enrollments/[id]/payments` | ثبت پرداخت |
| GET | `/api/enrollments/export` | خروجی CSV |

### پرداخت‌ها
| متد | مسیر | توضیحات |
|-----|------|---------|
| GET | `/api/payments` | لیست پرداخت‌ها |
| GET | `/api/payments/[id]` | جزئیات |
| PUT | `/api/payments/[id]` | ویرایش (شامل وضعیت چک) |

### تسک‌ها و تقویم
| متد | مسیر | توضیحات |
|-----|------|---------|
| GET | `/api/tasks` | لیست تسک‌ها |
| POST | `/api/tasks` | ایجاد تسک (با reminder_time) |
| GET | `/api/tasks/[id]` | جزئیات |
| PUT | `/api/tasks/[id]` | ویرایش/تکمیل تسک |
| DELETE | `/api/tasks/[id]` | حذف |

### اساتید
| متد | مسیر | توضیحات |
|-----|------|---------|
| GET | `/api/teachers` | لیست اساتید |
| POST | `/api/teachers` | ایجاد استاد (Admin/Edu Officer) |
| GET | `/api/teachers/[id]` | جزئیات |
| PUT | `/api/teachers/[id]` | ویرایش |
| DELETE | `/api/teachers/[id]` | حذف |

### درخواست خرید
| متد | مسیر | توضیحات |
|-----|------|---------|
| GET | `/api/purchases` | لیست (فیلتر بر اساس نقش) |
| POST | `/api/purchases` | ثبت درخواست |
| GET | `/api/purchases/[id]` | جزئیات |
| PUT | `/api/purchases/[id]` | تایید/رد (Manager/Admin) |

### لاگ فعالیت
| متد | مسیر | توضیحات |
|-----|------|---------|
| GET | `/api/logs` | لیست لاگ‌ها (فیلتر action, user, role, search) |

### AI Endpoints
| متد | مسیر | توضیحات |
|-----|------|---------|
| POST | `/api/ai/coach` | AI Sales Coach |
| POST | `/api/ai/generate` | تولید محتوای هوشمند |
| POST | `/api/ai/mentor` | AI Mentor |
| POST | `/api/ai/roleplay` | شبیه‌ساز فروش |
| POST | `/api/ai/diagnostic` | عارضه‌یاب عمومی |

---

## کاربران پیش‌فرض (Demo)

پس از اجرای `bun run db:seed` کاربران زیر ایجاد می‌شوند:

| نام | شماره تماس | نقش | دپارتمان |
|-----|-----------|-----|----------|
| اردلان ابوالفتحی | 09120000001 | ADMIN | - |
| فاطمه یعقوبی | 09120000002 | EDUCATION_OFFICER | - |
| سینا غمصاریان | 09120000003 | FINANCIAL_OFFICER | - |
| سید حسین بنی طبا | 09120000004 | MENTOR | - |
| نجیبه رمضان‌زاده | 09120000005 | DEPT_MANAGER | MANAGEMENT |
| محمد عدالت | 09120000006 | DEPT_MANAGER | FINANCE |
| علی محمدی (Admin اول) | 09121234567 | ADMIN | - |
| سارا احمدی | 09121234568 | SALES_MANAGER | - |
| رضا کریمی | 09121234569 | SALES_AGENT | - |
| مریم حسینی | 09121234570 | SALES_AGENT | - |
| امیر نوری | 09121234571 | STUDENT | - |
| زهرا رضایی | 09121234572 | STUDENT | - |
| محمد صادقی | 09121234573 | STUDENT | - |

**رمز عبور پیش‌فرض همه کاربران:** `12345678` (تنظیم شده در seed)

---

## استقرار (Deployment)

### معماری پیشنهادی برای ایران

```
┌─────────────────────────────────────────────────────────────────┐
│                        اینترنت / CDN                            │
│                  (Cloudflare / ArvanCloud / IranCDN)            │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS (TLS 1.3)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Load Balancer / Reverse Proxy (Nginx / Traefik)                │
│  - SSL Termination                                              │
│  - Rate Limiting (WAF)                                          │
│  - Static Asset Caching                                         │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Next.js App  │    │  Next.js App  │    │  Next.js App  │  (Horizontal Scaling)
│  Instance #1  │    │  Instance #2  │    │  Instance #N  │
│  (Port 3000)  │    │  (Port 3001)  │    │  (Port 300N)  │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PostgreSQL (Primary) + Redis (Session/Cache)       │
│  - Managed: IranServer, ArvanCloud, Liara, Pishgaman, AbrCloud  │
│  - Backup: Daily PITR + Weekly Full + Cross-region Replica      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Background Workers (PM2 / Systemd)                 │
│  - Reminder Worker (Cron)          - AI Queue Processor         │
│  - Email/SMS Dispatcher            - Report Generator           │
└─────────────────────────────────────────────────────────────────┘
```

### پیش‌نیازها

```bash
# Environment Variables (.env)
DATABASE_URL="postgresql://user:pass@host:5432/crm?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
NEXTAUTH_URL="https://your-domain.com"

# AI (اختیاری - بدون آن Mock برمی‌گرداند)
GEMINI_API_KEY="your-gemini-api-key"

# Reminder Worker
REMINDER_WEBHOOK_URL="https://your-webhook-endpoint.com/reminder"
REMINDER_WEBHOOK_METHOD="POST"
REMINDER_WEBHOOK_HEADERS='{"Content-Type":"application/json","Authorization":"Bearer xxx"}'
REMINDER_WEBHOOK_PAYLOAD_TEMPLATE='{"recipient_phone":"{recipient_phone}","title":"{title}","due_date":"{due_date}","description":"{description}"}'
REMINDER_POLL_INTERVAL_MS=60000
```

### دستورات بیلد و اجرا

```bash
# توسعه
bun run dev

# بیلد تولید
bun run build

# اجرا تولید (Standalone)
bun run start

# دیتابیس
bun run db:generate
bun run db:push
bun run db:seed

# استقرار ادمین اولیه
bun run bootstrap:admin
```

### Docker

```dockerfile
# Dockerfile در ریشه پروژه موجود است
docker build -t amin-crm .
docker run -p 3000:3000 --env-file .env amin-crm
```

### Systemd Service برای Reminder Worker

```ini
# /etc/systemd/system/crm-scheduler.service
[Unit]
Description=CRM Reminder Worker
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/crm
ExecStart=/usr/bin/node src/cron/reminder-worker.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/crm/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable crm-scheduler
sudo systemctl start crm-scheduler
sudo systemctl status crm-scheduler
```

---

## توسعه و دستورالعمل‌ها

### ساختار پروژه

```
CRM/
├── prisma/
│   ├── schema.prisma      # Schema دیتابیس
│   └── seed.ts            # داده‌های اولیه
├── src/
│   ├── app/
│   │   ├── api/           # API Routes (43 endpoint)
│   │   ├── page.tsx       # Single Page App Entry
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── crm/           # 23 کامپوننت CRM (~17,500 خط)
│   │   └── ui/            # shadcn/ui primitives
│   ├── lib/
│   │   ├── auth.ts        # احراز هویت سفارشی
│   │   ├── db.ts          # Prisma Singleton
│   │   ├── store.ts       # Zustand Store + RBAC Config
│   │   ├── activity-logger.ts
│   │   ├── gemini.ts      # AI Client
│   │   └── utils.ts
│   ├── hooks/             # Custom React Hooks
│   ├── cron/
│   │   └── reminder-worker.js
│   └── middleware.ts      # (خالی - احراز هویت در هر route)
├── scripts/               # Admin CLI Scripts
├── public/                # Static Assets
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── Caddyfile              # Reverse Proxy Config
```

### کامپوننت‌های اصلی CRM (`src/components/crm/`)

| فایل | خطوط | توضیحات |
|------|------|---------|
| `dashboard.tsx` | 1,340 | داشبورد اصلی با ویجت‌ها |
| `leads-page.tsx` | 2,208 | مدیریت کامل لیدها |
| `sales-panel.tsx` | 1,352 | پنل کارشناس فروش |
| `calendar-page.tsx` | 1,140 | تقویم شمسی + تسک‌ها + پیگیری‌ها |
| `enrollments-page.tsx` | 1,313 | مدیریت ثبت‌نام‌ها |
| `users-page.tsx` | 1,056 | مدیریت کاربران + admin_notes |
| `analytics-page.tsx` | 1,100 | نمودارها و گزارش‌ها |
| `kanban-board.tsx` | 1,000 | بورد کانبان لیدها |
| `roleplay-page.tsx` | 700 | شبیه‌ساز فروش AI |
| `teacher-coordination.tsx` | 400 | مدیریت اساتید |
| `purchase-requests.tsx` | 500 | درخواست خرید |
| `financial-dashboard.tsx` | 400 | داشبورد مالی + چک‌ها |
| `activity-logs.tsx` | 300 | لاگ فعالیت‌ها |
| `settings-page.tsx` | 780 | تنظیمات + دفترچه یادداشت شخصی |
| `login-page.tsx` | 1,102 | ورود + ثبت‌نام عمومی |
| `student-portal.tsx` | 1,058 | پورتال دانش‌پذیر |

### محتوای مستندات پروژه

| فایل | توضیحات |
|------|---------|
| `PROJECT_OVERVIEW.md` | نمای کلی معماری، تکنولوژی، auth، DB، بخش‌های پشتیبان |
| `ISSUES.md` | لیست باگ‌ها و ناقص‌ها (Critical/High/Medium/Low) |
| `SECURITY_AUDIT.md` | گزارش حسابرسی امنیتی |
| `AGENTS.md` | راهنمای ریپازیتوری برای agentها |
| `CLAUDE.md` | دستورالعمل‌های توسعه |
| `DEPLOYMENT_READINESS_REPORT.md` | گزارش آماده‌سازی استقرار |
| `docs/superpowers/specs/2026-06-28-amin-crm-enhancements-design.md` |_spec_ طراحی فیچرهای امین |
| `docs/superpowers/plans/2026-06-28-amin-crm-enhancements-plan.md` | _plan_ پیاده‌سازی فیچرهای امین |
| `PROPOSAL_CRM_IRAN.md` | پروپوزال تجاری کامل با قیمت‌گذاری |

### دستورات توسعه

```bash
# لینت
bun run lint

# تایپ‌چک (build تایپ‌چک نمی‌کند)
npx tsc --noEmit

# بیلد تولید
bun run build

# اجرای اسکریپت‌های ادمین
bun run tsx scripts/reset-password.ts
bun run tsx scripts/bootstrap-admin.ts
bun run tsx scripts/list-users.ts
```

### قراردادهای کدنویسی

- **زبان**: تایپ‌اسکریپت، کامپوننت‌های تابعی ری‌اکت
- **تورفتگی**: ۴ فاصله (Space)
- **نقل‌قول**: تکی (`'`)
- **نام‌گذاری فایل‌های CRM**: `kebab-case.tsx` (مثال: `lead-detail-page.tsx`)
- **نام‌گذاری کامپوننت**: PascalCase
- **کد/کامنت**: انگلیسی
- **رشته‌های کاربری**: فارسی
- **فیلدهای Prisma**: snake_case (`first_name`, `assigned_to_id`)
- **استفاده مجدد**: اول `src/components/ui` و `src/lib/utils.ts`

---

## امنیت

### چک‌لیست امنیتی

| ردیف | موضوع | وضعیت | اقدام لازم |
|------|--------|--------|------------|
| ۱ | HTTPS/TLS 1.3 | ✅ پیاده‌سازی | گواهینامه SSL معتبر |
| ۲ | کوکی‌های HttpOnly | ✅ فعال | SameSite=Strict برای CSRF |
| ۳ | Rate Limiting | ✅ پیاده‌سازی | WAF در آروان‌کلاد/کلودفلر |
| ۴ | پیشگیری SQL Injection | ✅ Prisma ORM | بازبینی SQL خام در توسعه جداگانه |
| ۵ | RBAC | ✅ کامل | تست دوره‌ای سطوح دسترسی |
| ۶ | Audit Log | ✅ خودکار | انتقال به سیستم append-only |
| ۷ | رمزنگاری در سرور | ❌ غیرفعال | LUKS یا Postgres TDE |
| ۸ | مدیریت Secrets | ⚠️ فایل Env | Doppler یا Vault برای پروژه بزرگ |
| ۹ | بکاپ رمزنگاری‌شده | ❌ نشده | اسکریپت بکاپ با AES-256 |
| ۱۰ | بررسی وابستگی‌ها | ❌ غیرفعال | Snyk یا `npm audit` در CI/CD |

### موارد Криتیcal در `ISSUES.md`

- **C1**: `/api/enrollments/[id]/payments` بدون Auth (IDOR کامل)
- **C2**: رمزهای عبور هاردکد در اسکریپت‌ها
- **C3**: فرم عمومی درخواست مشاوره همیشه 401 برمی‌گرداند
- **H1**: باگ سیستمی scope اشتباه SALES_AGENT (۵ فایل)
- **H2**: بدون Rate Limiting روی Login
- **H3**: بدون جریان بازیابی رمز عبور
- **H4**: سیاست رمز عبور ضعیف
- **H5**: کانال زمانی در لاگین

---

## مستندات تکمیلی

### پروپوزال تجاری
- [`PROPOSAL_CRM_IRAN.md`](./PROPOSAL_CRM_IRAN.md) — پروپوزال کامل با ۳ پلن قیمت‌گذاری (مینیمال/متوسط/پیشرفته)، پکیج‌های AI، محاسبه‌گر هزینه، زمان‌بندی پیاده‌سازی

### گزارش‌های فنی
- [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) — معماری، استک، Auth، DB، بخش‌های پشتیبان
- [`ISSUES.md`](./ISSUES.md) — باگ‌ها و ناقص‌ها با اولویت‌بندی
- [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) — حسابرسی امنیتی جامع
- [`DEPLOYMENT_READINESS_REPORT.md`](./DEPLOYMENT_READINESS_REPORT.md) — آماده‌سازی استقرار

###_specs_ و _plans_
- [`docs/superpowers/specs/2026-06-28-amin-crm-enhancements-design.md`](./docs/superpowers/specs/2026-06-28-amin-crm-enhancements-design.md) — طراحی فنی فیچرهای امین
- [`docs/superpowers/plans/2026-06-28-amin-crm-enhancements-plan.md`](./docs/superpowers/plans/2026-06-28-amin-crm-enhancements-plan.md) — برنامه پیاده‌سازی Task-by-Task

---

## لایسنس و مالکیت

این پروژه برای **موسسه آموزش عالی آزاد امین** توسعه یافته است. حق استفاده، تغییر و توزیع تحت لایسنس خریداری شده است.

---

**نسخه**: 2.0 — تیر ۱۴۰۵  
**آخرین به‌روزرسانی**: جولای ۲۰۲۶