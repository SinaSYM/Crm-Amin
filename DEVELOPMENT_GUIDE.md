# راهنمای توسعه — CRM موسسه امین

نسخه: 1.0  
تاریخ: ۱۴۰۵/۰۴/۲۰

---

## شروع سریع

### پیش‌نیازها
- **Bun** (v1.1+) — پکیج منیجر و رن‌تایم
- **Node.js** (v20+) — برای ابزارهای جانبی
- **SQLite** (توسعه) / **PostgreSQL** (تولید)

### نصب و اجرا

```bash
# کلون ریپو
cd CRM

# نصب وابستگی‌ها
bun install

# دیتابیس (SQLite در توسعه)
bun run db:generate
bun run db:push
bun run db:seed

# اجرای سرور توسعه
bun run dev
```

سرویس در `http://localhost:3000` بالا می‌آید.

### کاربران پیش‌فرض (پس از seed)

| کاربر | تلفن | نقش | رمز |
|-------|------|-----|-----|
| اردلان ابوالفتحی | 09120000001 | ADMIN | 12345678 |
| فاطمه یعقوبی | 09120000002 | EDUCATION_OFFICER | 12345678 |
| سینا غمصاریان | 09120000003 | FINANCIAL_OFFICER | 12345678 |
| سید حسین بنی طبا | 09120000004 | MENTOR | 12345678 |
| نجیبه رمضان‌زاده | 09120000005 | DEPT_MANAGER | 12345678 |
| محمد عدالت | 09120000006 | DEPT_MANAGER | 12345678 |
| علی محمدی | 09121234567 | ADMIN | 12345678 |
| سارا احمدی | 09121234568 | SALES_MANAGER | 12345678 |
| رضا کریمی | 09121234569 | SALES_AGENT | 12345678 |
| مریم حسینی | 09121234570 | SALES_AGENT | 12345678 |

---

## معماری پروژه

### Single Page Application (SPA) با State-based Navigation

```typescript
// src/app/page.tsx - تنها page واقعی
// ناوبری از طریق Zustand store
const { activeView, setActiveView } = useCRMStore()
// setActiveView('leads') -> رندر <LeadsPage />
// هیچ URL routing واقعی وجود ندارد
```

**مهم**: گارد مسیر فقط client-side است (`page.tsx:241-244`). enforcement واقعی در API layer است.

### State Management: Zustand

```typescript
// src/lib/store.ts
export const useCRMStore = create<CRMStore>()(
  persist(
    (set) => ({
      activeView: 'dashboard',
      setActiveView: (view) => set({ activeView: view }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),
      isAuthenticated: false,
      login: (user) => set({ currentUser: user, isAuthenticated: true, activeView: 'dashboard' }),
      logout: () => set({ currentUser: null, isAuthenticated: false, activeView: 'login' }),
      selectedLeadId: null,
      setSelectedLeadId: (id) => set({ selectedLeadId: id }),
    }),
    { name: 'crm-store', partialize: (s) => ({ currentUser: s.currentUser, isAuthenticated: s.isAuthenticated }) }
  )
)
```

### Role-Based Navigation Config

```typescript
// src/lib/store.ts
export const roleNavConfig: Record<string, ActiveView[]> = {
  STUDENT: ['dashboard', 'courses', 'enrollments', 'settings'],
  SALES_AGENT: ['dashboard', 'sales-panel', 'roleplay', 'leads', 'kanban', 'calendar', 'interactions', 'lead-detail', 'settings', 'purchase-requests'],
  SALES_MANAGER: ['dashboard', 'leads', 'kanban', 'calendar', 'sales-panel', 'roleplay', 'users', 'courses', 'interactions', 'enrollments', 'analytics', 'lead-detail', 'settings', 'purchase-requests'],
  ADMIN: ['dashboard', 'leads', 'kanban', 'calendar', 'sales-panel', 'roleplay', 'users', 'courses', 'interactions', 'enrollments', 'analytics', 'teacher-coordination', 'purchase-requests', 'financial-dashboard', 'activity-logs', 'lead-detail', 'settings'],
  EDUCATION_OFFICER: ['dashboard', 'courses', 'calendar', 'teacher-coordination', 'purchase-requests', 'settings'],
  FINANCIAL_OFFICER: ['dashboard', 'enrollments', 'financial-dashboard', 'purchase-requests', 'settings'],
  MENTOR: ['dashboard', 'leads', 'kanban', 'calendar', 'interactions', 'lead-detail', 'settings'],
  DEPT_MANAGER: ['dashboard', 'leads', 'kanban', 'calendar', 'sales-panel', 'users', 'courses', 'interactions', 'enrollments', 'analytics', 'lead-detail', 'settings'],
}
```

---

## دیتابیس — Prisma + SQLite/PostgreSQL

### Schema اصلی

```bash
# فایل: prisma/schema.prisma
# مدل‌های کلیدی: User, Lead, Interaction, Course, Enrollment, Payment, Task, ActivityLog, PurchaseRequest, Teacher, ...
```

### دستورات دیتابیس

```bash
# تولید Prisma Client (بعد از تغییر schema)
bun run db:generate

# اعمال تغییرات schema به دیتابیس (بدون migration رسمی)
bun run db:push

# سی‌د داده‌های اولیه
bun run db:seed

# باز کردن Prisma Studio
bun run db:studio
```

### نکات مهم Schema

- **نام‌گذاری**: فیلدهای دامنه `snake_case` (`first_name`, `assigned_to_id`)، فیلدهای فریم‌ورک `camelCase` (`createdAt`, `passwordHash`)
- **بدون Migration رسمی**: پروژه از `db:push` استفاده می‌کند — تغییرات schema مستقیماً push می‌شوند
- **Enumهای کلیدی**: `UserRole` (۸ نقش), `LeadStatus` (۴ وضعیت), `PaymentStatus`, `InteractionType`

### Models critical برای توسعه

```prisma
model User {
  id             String   @id @default(cuid())
  first_name     String
  last_name      String
  phone_number   String   @unique
  role           UserRole @default(SALES_AGENT)
  is_active      Boolean  @default(true)
  department     String?  // MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT
  personal_notes String   @default("")
  admin_notes    String   @default("")
  // ... relations
}

model Lead {
  id               String     @id @default(cuid())
  phone_number     String
  first_name       String     @default("")
  last_name        String     @default("")
  source           String     @default("manual")
  status           LeadStatus @default(NEW)
  score            Int        @default(0)
  department       String?    // فیلد جدید برای department isolation
  assigned_to_id   String?
  referred_by_id   String?    // affiliate relation (KELI لید converted student!)
  target_course_id String?
  // ...
}

model Task {
  id            String   @id @default(cuid())
  agent_id      String
  lead_id       String?
  title         String
  description   String   @default("")
  due_date      DateTime
  status        String   @default("PENDING")
  reminder_time Int?     // minutes before due_date
  reminder_sent Boolean  @default(false)
  // ...
}

model ActivityLog {
  id          String   @id @default(cuid())
  user_id     String
  user_name   String
  user_role   String
  action      String
  description String
  createdAt   DateTime @default(now())
}
```

---

## احراز هویت سفارشی (Custom Auth)

### معماری

```
src/lib/auth.ts + src/lib/password.ts
├── getSession(request)           // استخراج session از کوکی
├── loginWithCredentials(email, pass) // بررسی رمز + ایجاد session
├── createSession(userId)         // توکن ۳۲ بایتی + کوکی HttpOnly
├── deleteSession(token)          // logout
├── getDemoSession(request)       // DEMO_AUTH fallback (خطرناک!)
└── hashPassword / verifyPassword // scrypt دستی (N=16384, r=8, p=1)
```

### کوکی Session

| ویژگی | مقدار |
|--------|-------|
| نام | `crm_session` |
| HttpOnly | ✅ بله |
| Secure | در production بله |
| SameSite | Lax |
| TTL | ۳۰ روز (ثابت، بدون sliding expiration) |
| CSRF Token | ❌ نداریم (تکیه روی SameSite=Lax) |

### DEMO_AUTH (خطرناک — فقط توسعه)

```bash
# در .env
DEMO_AUTH=1
```

وقتی فعال است، هدرهای `X-User-Id` و `X-User-Role` به عنوان session پذیرفته می‌شوند. **هرگز در تولید فعال نکنید.**

### monkey-patch fetch در کلاینت

```typescript
// src/app/page.tsx:250-274
// تمام fetchها credentials: 'include' می‌شوند
// و هدرهای X-User-* از localStorage ست می‌شوند (برای DEMO_AUTH)
```

---

## الگوی API Routes

### ساختار استاندارد

```typescript
// src/app/api/leads/route.ts (الگوی مرجع)
import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const session = await getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Role Gate
    if (session.userRole === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // 3. Department/Role Filtering
    const where: Record<string, any> = {}
    if (session.userRole === 'SALES_AGENT') {
      where.assigned_to_id = session.userId
    } else if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) where.department = userProfile.department
    }
    // ADMIN, EDU_OFFICER, FIN_OFFICER: بدون فیلتر

    // 4. Query
    const leads = await db.lead.findMany({ where, orderBy: { createdAt: 'desc' } })
    return NextResponse.json(leads)
  } catch (error) {
    console.error('Leads GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.userRole === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    // validation...

    const lead = await db.lead.create({ data: { ... } })

    // 5. Activity Log (همیشه در mutationها)
    await logActivity(request, 'CREATE_LEAD', `Created lead "${lead.first_name} ${lead.last_name}"`)

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    console.error('Leads POST error:', error)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
```

### Activity Logger

```typescript
// src/lib/activity-logger.ts
export async function logActivity(
  request: NextRequest,
  action: string,
  description: string
) {
  try {
    const session = await getSession(request)
    if (!session) return

    await db.activityLog.create({
      data: {
        user_id: session.userId,
        user_name: `${session.firstName} ${session.lastName}`,
        user_role: session.userRole,
        action,
        description,
      },
    })
  } catch {
    // silent catch - لاگ نباید response را بشکند
  }
}
```

> ⚠️ **L1 در ISSUES.md**: در چندین endpoint لاگ ثبت نمی‌شود (courses PUT/DELETE/POST، interactions، tasks، tickets، ...)

---

## کامپوننت‌های CRM (src/components/crm/)

### Паттерن‌های رایج

```tsx
// فریم‌ها و انیمیشن
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// UI Primitives (shadcn/ui)
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

// Store
import { useCRMStore } from '@/lib/store'

// TypeScript interfaces در ابتدای فایل
interface Lead { ... }

// Custom hooks برای fetch
const fetchData = useCallback(async () => { ... }, [])
useEffect(() => { fetchData() }, [fetchData])
```

### agregar View جدید

1. **فایل کامپوننت** در `src/components/crm/new-view.tsx`
2. **افزودن به ActiveView type** در `src/lib/store.ts`:
   ```typescript
   export type ActiveView = 'dashboard' | ... | 'new-view'
   ```
3. **افزودن به roleNavConfig** در `src/lib/store.ts`
4. **Import و render در ViewRenderer** در `src/app/page.tsx`:
   ```tsx
   import NewView from '@/components/crm/new-view'
   case 'new-view': return <NewView key={refreshKey} />
   ```
5. **افزودن به navSections** در `src/app/page.tsx` برای نمایش در سایدبار
6. **افزودن به sectionMap** برای breadcrumb

---

## تقویم شمسی (Jalali Calendar)

### توابع تبدیل (src/components/crm/calendar-page.tsx)

```typescript
function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number]
function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number]
function getJalaliMonthDays(jy: number, jm: number): number
function getJalaliFirstDayOfWeek(jy: number, jm: number): number // 0=شنبه
```

### ماه‌های فارسی
```typescript
const persianMonthNames = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
]
```

---

## AI Integration (Gemini)

### Client: `src/lib/gemini.ts`

```typescript
// REST مستقیم به Gemini API (بدون SDK رسمی)
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  }
)
```

### Endpointها

| Endpoint | استفاده | نقش‌های مجاز |
|----------|---------|---------------|
| `/api/ai/coach` | تحلیل لید + راهنمای فروش | SALES_AGENT+ |
| `/api/ai/generate` | تولید پیامک/ایمیل شخصی‌سازی | SALES_AGENT+ |
| `/api/ai/mentor` | چت‌بات دانش‌پذیر | STUDENT, MENTOR+ |
| `/api/ai/roleplay` | شبیه‌ساز تماس فروش | SALES_AGENT+ |
| `/api/ai/diagnostic` | عارضه‌یاب عمومی (پابلیک) | همه |

### Fallback Mock

```typescript
// در gemini.ts - وقتی GEMINI_API_KEY تنظیم نیست
return {
  // پاسخ‌های canned فارسی
  guidance: [...],
  next_action: '...',
  sentiment: '...',
  conversion_probability: 50
}
```

> ⚠️ **M8 در ISSUES.md**: هیچ إندیکیتوری به کاربر نمی‌دهد که پاسخ Mock است.

---

## Reminder Worker (Cron)

### فایل: `src/cron/reminder-worker.js`

```javascript
// CommonJS، اجرا با: node src/cron/reminder-worker.js
// Poll هر 60 ثانیه (پیش‌فرض)
// POST به REMINDER_WEBHOOK_URL
// آپدیت reminder_sent = true + ActivityLog
```

### متغیرهای محیطی

```bash
REMINDER_WEBHOOK_URL="https://your-webhook.com/endpoint"
REMINDER_WEBHOOK_METHOD="POST"
REMINDER_WEBHOOK_HEADERS='{"Content-Type":"application/json","Authorization":"Bearer xxx"}'
REMINDER_WEBHOOK_PAYLOAD_TEMPLATE='{"recipient_phone":"{recipient_phone}","title":"{title}","due_date":"{due_date}","description":"{description}"}'
REMINDER_POLL_INTERVAL_MS=60000
DATABASE_URL="postgresql://..."  # مورد نیاز برای worker
```

### Systemd Service

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

---

## اسکریپت‌های ادمین (scripts/)

```bash
# لیست کاربران
bun run tsx scripts/list-users.ts

# ایجاد ادمین اولیه
bun run tsx scripts/bootstrap-admin.ts

# ریست رمز عبور (⚠️ هاردکد دارد - C2 در ISSUES.md)
bun run tsx scripts/reset-password.ts

# فعال‌سازی کاربر
bun run tsx scripts/activate-user.ts <userId>

# تست کوئری
bun run tsx scripts/test-query.ts
```

---

## تست و کیفیات کد

### دستورات

```bash
# لینت
bun run lint

# تایپ‌چک (build تایپ‌چک نمی‌کند!)
npx tsc --noEmit

# بیلد تولید
bun run build
```

### نکات مهم

- **next.config.ts**: `ignoreBuildErrors: true` — بیلد موفق ≠ تایپ‌های درست
- **فریم‌ورک تست وجود ندارد** — تست دستی UI/API
- **برای هر تغییر**: `lint` + `tsc --noEmit` + تست دستی مسیر اثرپذیر

---

## استقرار (Deployment)

### Standalone Build

```bash
bun run build
# خروجی در .next/standalone
# کپی به سرور + npm install --production
# اجرا: node .next/standalone/server.js
```

### Docker

```dockerfile
# Dockerfile در ریشه پروژه
docker build -t amin-crm .
docker run -p 3000:3000 --env-file .env amin-crm
```

### Reverse Proxy (Caddy/Nginx)

```caddy
# Caddyfile
your-domain.com {
    reverse_proxy localhost:3000
}
```

---

## عیب‌یابی رایج

### 1. لاگین نمی‌شود / Session کار نمی‌کند
- چک کنید `JWT_SECRET` در `.env` ست شده باشد
- کوکی `crm_session` در DevTools → Application → Cookies
- `DEMO_AUTH=0` در تولید

### 2. دیتابیس خطا می‌دهد
```bash
bun run db:generate
bun run db:push
```

### 3. Build می‌شود اما TypeError در کنسول مرورگر
```bash
npx tsc --noEmit  # خطاهای تایپ را پیدا کنید
```

### 4. AI کار نمی‌کند / پاسخ عجیب می‌دهد
- `GEMINI_API_KEY` در `.env` ست شده؟
- لاگ‌های سرور: `console.error('Gemini error:', error)`

### 5. Reminder Worker اجرا نمی‌شود
- `DATABASE_URL` در env worker ست است؟
- `REMINDER_WEBHOOK_URL` در دسترس است؟
- `systemctl status crm-scheduler` برای لاگ‌ها

---

## مشارکت و Convension

### Git Commits
```bash
# Conventional Commits
feat: add teacher coordination panel
fix(auth): handle expired session gracefully
db: add check_number to Payment model
chore: update dependencies
```

### Code Style
- ۴ فاصله (Space)
- نقل‌قول تکی (`'`)
- کامنت/کد: انگلیسی
- UI Strings: فارسی
- Keab-case برای فایل‌های CRM: `lead-detail-page.tsx`
- PascalCase برای کامپوننت‌ها
- camelCase برای متغیرها/توابع

### PR Checklist
- [ ] `bun run lint` pass
- [ ] `npx tsc --noEmit` pass
- [ ] UI تست شده در مرورگر (RTL، موبایل، دسکتاپ)
- [ ] API endpointها تست شده (Postman/curl)
- [ ] Activity Log در mutationها ثبت شده
- [ ] Department/Role filtering در لیست‌ها اعمال شده

---

## منابع و مراجع

- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) — معماری کامل
- [ISSUES.md](./ISSUES.md) — باگ‌های شناخته‌شده
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) — حسابرسی امنیتی
- [API_DOCS.md](./API_DOCS.md) — مستندات کامل API
- [PROPOSAL_CRM_IRAN.md](./PROPOSAL_CRM_IRAN.md) — پروپوزال تجاری
- [docs/superpowers/specs/2026-06-28-amin-crm-enhancements-design.md](./docs/superpowers/specs/2026-06-28-amin-crm-enhancements-design.md) — Spec فیچرهای امین
- [docs/superpowers/plans/2026-06-28-amin-crm-enhancements-plan.md](./docs/superpowers/plans/2026-06-28-amin-crm-enhancements-plan.md) — Plan پیاده‌سازی

---

## تماس

پروژه: CRM موسسه آموزش عالی آزاد امین  
توسعه: تیم تکنولوژی امین  
آخرین به‌روزرسانی: تیر ۱۴۰۵