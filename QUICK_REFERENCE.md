# Quick Reference Card — CRM موسسه امین

## 🚀 دستورات سریع

```bash
# توسعه
bun run dev                    # سرور توسعه (پورت 3000)
bun run lint                   # ESLint
npx tsc --noEmit              # TypeScript check
bun run build                  # بیلد تولید

# دیتابیس
bun run db:generate            # تولید Prisma Client
bun run db:push                # اعمال schema
bun run db:seed                # داده‌های اولیه
bun run db:studio              # Prisma Studio

# اسکریپت‌های ادمین
bun run tsx scripts/list-users.ts
bun run tsx scripts/bootstrap-admin.ts
bun run tsx scripts/reset-password.ts <userId>
bun run tsx scripts/activate-user.ts <userId>
```

---

## 👥 کاربران پیش‌فرض (پس از seed)

| کاربر | تلفن | نقش | رمز |
|-------|------|-----|-----|
| اردلان ابوالفتحی | 09120000001 | ADMIN | 12345678 |
| فاطمه یعقوبی | 09120000002 | EDUCATION_OFFICER | 12345678 |
| سینا غمصاریان | 09120000003 | FINANCIAL_OFFICER | 12345678 |
| سید حسین بنی طبا | 09120000004 | MENTOR | 12345678 |
| نجیبه رمضان‌زاده | 09120000005 | DEPT_MANAGER (MGMT) | 12345678 |
| محمد عدالت | 09120000006 | DEPT_MANAGER (FIN) | 12345678 |
| علی محمدی | 09121234567 | ADMIN | 12345678 |
| سارا احمدی | 09121234568 | SALES_MANAGER | 12345678 |
| رضا کریمی | 09121234569 | SALES_AGENT | 12345678 |
| مریم حسینی | 09121234570 | SALES_AGENT | 12345678 |

---

## 🔐 نقش‌ها و دسترسی‌ها (RBAC)

| نقش | کد | Viewهای مجاز (خلاصه) |
|-----|-----|----------------------|
| ادمین | ADMIN | همه (۲۱ view) |
| مدیر فروش | SALES_MANAGER | لیدها، کانبان، تقویم، پنل فروش، کاربران، دوره‌ها، تعاملات، ثبت‌نام‌ها، آنالیتیکس، درخواست خرید |
| کارشناس فروش | SALES_AGENT | داشبورد، پنل فروش، رول‌پلی، لیدها، کانبان، تقویم، تعاملات، درخواست خرید |
| دانش‌پذیر | STUDENT | داشبورد، دوره‌ها، ثبت‌نام‌ها، تنظیمات |
| مسئول آموزش | EDUCATION_OFFICER | داشبورد، دوره‌ها، تقویم، هماهنگی اساتید، درخواست خرید |
| مسئول مالی | FINANCIAL_OFFICER | داشبورد، ثبت‌نام‌ها، داشبورد مالی، درخواست خرید |
| منتور | MENTOR | داشبورد، لیدها، کانبان، تقویم، تعاملات |
| مدیر دپارتمان | DEPT_MANAGER | داشبورد، لیدها، کانبان، تقویم، پنل فروش، کاربران، دوره‌ها، تعاملات، ثبت‌نام‌ها، آنالیتیکس |

---

## 🗄️ مدل‌های کلیدی دیتابیس

```prisma
User { id, first_name, last_name, phone_number, role, department, personal_notes, admin_notes }
Lead { id, phone_number, first_name, last_name, status, score, department, assigned_to_id, referred_by_id }
Interaction { id, lead_id, agent_id, type(CALL/NOTE/SYSTEM), content, next_followup_date }
Course { id, title, price, capacity, department }
Enrollment { id, student_id, course_id, payment_status }
Payment { id, enrollment_id, amount, type, status, check_number, check_bank, check_date, check_status }
Task { id, agent_id, lead_id, title, due_date, status, reminder_time, reminder_sent }
ActivityLog { id, user_id, user_name, user_role, action, description }
PurchaseRequest { id, requester_id, item_name, amount, quantity, status }
Teacher { id, name, phone_number, email, specialty, status }
```

---

## 🌐 API Endpoints اصلی

### Auth
- `POST /api/auth/login` — ورود
- `POST /api/auth/logout` — خروج
- `GET /api/auth/me` — کاربر جاری
- `POST /api/auth/signup` — ثبت‌نام عمومی
- `POST /api/auth/signup/approve` — تأیید ثبت‌نام

### Leads
- `GET /api/leads` — لیست (فیلتر نقش/دپارتمان)
- `POST /api/leads` — ایجاد (پابلیک: بدون auth)
- `GET /api/leads/[id]` — جزئیات
- `PUT /api/leads/[id]` — ویرایش
- `DELETE /api/leads/[id]` — حذف
- `POST /api/leads/[id]/convert` — تبدیل به دانش‌پذیر

### Users
- `GET /api/users` — لیست کاربران
- `POST /api/users` — ایجاد (Admin)
- `PUT /api/users/[id]` — ویرایش (شامل admin_notes)
- `GET /api/users/export` — CSV

### Tasks & Calendar
- `GET /api/tasks` — لیست تسک‌ها
- `POST /api/tasks` — ایجاد (با reminder_time)
- `PUT /api/tasks/[id]` — ویرایش/تکمیل
- `DELETE /api/tasks/[id]` — حذف

### Purchases
- `GET /api/purchases` — لیست (فیلتر نقش)
- `POST /api/purchases` — ثبت درخواست
- `PUT /api/purchases/[id]` — تایید/رد (Manager/Admin)

### Financial
- `GET /api/payments` — پرداخت‌ها (فیلتر چک)
- `PUT /api/payments/[id]` — ویرایش وضعیت چک

### Teachers
- `GET /api/teachers` — لیست اساتید
- `POST /api/teachers` — ایجاد (Admin/Edu Officer)
- `PUT /api/teachers/[id]` — ویرایش
- `DELETE /api/teachers/[id]` — حذف

### Logs
- `GET /api/logs` — لاگ فعالیت‌ها (فیلتر action, user, role, search)

### AI
- `POST /api/ai/coach` — AI Sales Coach
- `POST /api/ai/generate` — تولید محتوا
- `POST /api/ai/mentor` — منتور هوشمند
- `POST /api/ai/roleplay` — شبیه‌ساز فروش
- `POST /api/ai/diagnostic` — عارضه‌یاب عمومی

---

## 📁 ساختار پروژه

```
CRM/
├── prisma/
│   ├── schema.prisma      # Schema دیتابیس
│   └── seed.ts            # داده‌های اولیه
├── src/
│   ├── app/
│   │   ├── api/           # 43 API Route
│   │   ├── page.tsx       # SPA Entry (تنها page)
│   │   └── globals.css
│   ├── components/
│   │   ├── crm/           # 23 کامپوننت CRM
│   │   └── ui/            # shadcn/ui primitives
│   ├── lib/
│   │   ├── auth.ts        # احراز هویت سفارشی
│   │   ├── db.ts          # Prisma Singleton
│   │   ├── store.ts       # Zustand + RBAC config
│   │   ├── activity-logger.ts
│   │   └── gemini.ts      # AI Client
│   ├── hooks/
│   └── cron/
│       └── reminder-worker.js
├── scripts/               # Admin CLI
├── public/
├── Dockerfile
├── Caddyfile
└── package.json
```

---

## 🎨 کامپوننت‌های CRM اصلی

| فایل | خطوط | توضیح |
|------|------|-------|
| `dashboard.tsx` | 1,340 | داشبورد اصلی |
| `leads-page.tsx` | 2,208 | مدیریت لیدها |
| `sales-panel.tsx` | 1,352 | پنل کارشناس فروش |
| `calendar-page.tsx` | 1,140 | تقویم شمسی + تسک‌ها |
| `enrollments-page.tsx` | 1,313 | ثبت‌نام‌ها |
| `users-page.tsx` | 1,056 | مدیریت کاربران + admin_notes |
| `analytics-page.tsx` | 1,100 | نمودارها |
| `kanban-board.tsx` | 1,000 | بورد کانبان |
| `roleplay-page.tsx` | 700 | شبیه‌ساز AI |
| `teacher-coordination.tsx` | 400 | مدیریت اساتید |
| `purchase-requests.tsx` | 500 | درخواست خرید |
| `financial-dashboard.tsx` | 400 | داشبورد مالی + چک‌ها |
| `activity-logs.tsx` | 300 | لاگ فعالیت‌ها |
| `settings-page.tsx` | 780 | تنظیمات + دفترچه یادداشت |
| `login-page.tsx` | 1,102 | ورود + ثبت‌نام عمومی |
| `student-portal.tsx` | 1,058 | پورتال دانش‌پذیر |

---

## ⚠️ باگ‌های критиک (ISSUES.md)

| کد | عنوان | اولویت |
|-----|-------|---------|
| C1 | `/api/enrollments/[id]/payments` بدون Auth | Critical |
| C2 | رمزهای هاردکد در اسکریپت‌ها | Critical |
| C3 | فرم عمومی مشاوره همیشه 401 می‌دهد | Critical |
| H1 | Scope اشتباه SALES_AGENT (5 فایل) | High |
| H2 | بدون Rate Limiting روی Login | High |
| H3 | بدون بازیابی رمز عبور | High |
| H4 | سیاست رمز ضعیف | High |
| H5 | Timing side-channel در Login | High |

---

## 🔧 متغیرهای محیطی کلیدی

```bash
# الزامی
DATABASE_URL="postgresql://..."
JWT_SECRET="32+ chars random"
NEXTAUTH_URL="https://domain.com"
DEMO_AUTH="0"

# AI (اختیاری)
GEMINI_API_KEY=""

# Reminder Worker
REMINDER_WEBHOOK_URL="https://domain.com/api/webhooks/reminder"
REMINDER_WEBHOOK_HEADERS='{"Content-Type":"application/json"}'
REMINDER_POLL_INTERVAL_MS=60000
```

---

## 📦 استقرار سریع (Docker)

```bash
# بیلد
docker build -t amin-crm .

# اجرا با docker-compose
docker-compose up -d

# لاگ‌ها
docker-compose logs -f app
docker-compose logs -f scheduler
```

---

## 📚 مستندات کامل

| فایل | محتوا |
|------|-------|
| `README.md` | نمای کلی پروژه + معماری + استقرار |
| `API_DOCS.md` | مستندات کامل ۴۳+ API Endpoint |
| `DEVELOPMENT_GUIDE.md` | راهنمای توسعه‌دهنده |
| `DATABASE_DOCS.md` | مستندات دیتابیس و Prisma |
| `DEPLOYMENT_GUIDE.md` | راهنمای استقرار تولید |
| `PROJECT_OVERVIEW.md` | معماری، تکنولوژی، Auth، DB |
| `ISSUES.md` | لیست باگ‌ها و ناقص‌ها |
| `SECURITY_AUDIT.md` | حسابرسی امنیتی |
| `PROPOSAL_CRM_IRAN.md` | پروپوزال تجاری + قیمت‌گذاری |

---

## 🆘 عیب‌یابی سریع

| مشکل | بررسی |
|-------|--------|
| لاگین نمی‌شود | `JWT_SECRET` ست شده؟ `DEMO_AUTH=0`؟ کوکی `crm_session`؟ |
| دیتابیس خطا | `bun run db:generate && bun run db:push` |
| Build می‌شود اما خطای تایپ | `npx tsc --noEmit` |
| AI کار نمی‌کند | `GEMINI_API_KEY` در `.env`؟ لاگ سرور؟ |
| Reminder اجرا نمی‌شود | `DATABASE_URL` در env worker؟ `REMINDER_WEBHOOK_URL` قابل‌دسترسی؟ |
| Session منقضی می‌شود | کوکی HttpOnly؟ SameSite=Lax؟ TTL ۳۰ روزه؟ |

---

**آخرین به‌روزرسانی:** تیر ۱۴۰۵  
**نسخه:** 1.0