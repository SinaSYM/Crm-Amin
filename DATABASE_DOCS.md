# مستندات پایگاه داده — CRM موسسه امین

نسخه: 1.0  
تاریخ: ۱۴۰۵/۰۴/۲۰

---

## بررسی کلی

- **ORM**: Prisma 6.x
- **دیتابیس توسعه**: SQLite (`file:./db/custom.db`)
- **دیتابیس تولید**: PostgreSQL (Managed: IranServer, ArvanCloud, Liara, Pishgaman, AbrCloud)
- **Migration**: `db:push` (بدون migration فایل‌های رسمی)
- **Naming Convention**: 
  - فیلدهای دامنه: `snake_case` (`first_name`, `assigned_to_id`)
  - فیلدهای سیستمی: `camelCase` (`createdAt`, `passwordHash`)

---

## Enumها

```prisma
enum UserRole {
  ADMIN
  SALES_MANAGER
  SALES_AGENT
  STUDENT
  EDUCATION_OFFICER
  FINANCIAL_OFFICER
  MENTOR
  DEPT_MANAGER
}

enum UserScope {
  STANDARD
  GLOBAL
}

enum LeadStatus {
  NEW
  CONTACTED
  IN_PROGRESS
  CONVERTED
}

enum InteractionType {
  CALL
  NOTE
  SYSTEM
}

enum PaymentStatus {
  PAID
  INSTALLMENT
}

enum PaymentType {
  FULL
  INSTALLMENT
}

enum PaymentItemStatus {
  PENDING
  PAID
  OVERDUE
}

enum CommissionStatus {
  PENDING
  APPROVED
  PAID
}
```

---

## مدل‌ها

### 1. User (کاربر)

```prisma
model User {
  id             String   @id @default(cuid())
  first_name     String
  last_name      String
  phone_number   String   @unique
  role           UserRole @default(SALES_AGENT)
  is_active      Boolean  @default(true)
  referral_code  String?  @unique
  wallet_balance Float    @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  // Auth fields
  email          String?   @unique
  passwordHash   String?
  scope          UserScope @default(STANDARD)
  isApproved     Boolean   @default(false)

  // New fields (Amin Institute)
  department     String?   // MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT
  personal_notes String   @default("")  // دفترچه یادداشت شخصی
  admin_notes    String   @default("")  // یادداشت‌های ادمین درباره کاربر

  // Relations
  sessions       Session[]
  accounts       Account[]              // Unused (NextAuth legacy)
  passwordResetTokens PasswordResetToken[]
  assignedLeads  Lead[]        @relation("AssignedLeads")
  referredLeads  Lead[]        @relation("ReferredLeads")   // Affiliate/referral
  interactions   Interaction[] @relation("AgentInteractions")
  enrollments    Enrollment[]  @relation("StudentEnrollments")
  tickets        Ticket[]      @relation("StudentTickets")
  tasks          Task[]        @relation("AgentTasks")
  commissions    Commission[]  @relation("UserCommissions")
  purchases      PurchaseRequest[] @relation("UserPurchases")

  @@index([department])
}
```

**نکات مهم:**
- `referredLeads` = لیدهایی که این کاربر به عنوان معرف (affiliate) معرفی کرده — **نه** لیدهایی که به اوassigned شده
- تبدیل لید به دانش‌پذیر از طریق match `phone_number` انجام می‌شود، FK مستقیمی نیست
- `isApproved` پیش‌فرض `false` اما در schema `true` ست شده (M4 در ISSUES.md)

### 2. Lead (لید)

```prisma
model Lead {
  id               String     @id @default(cuid())
  phone_number     String
  first_name       String     @default("")
  last_name        String     @default("")
  source           String     @default("manual") // website, manual, campaign
  status           LeadStatus @default(NEW)
  score            Int        @default(0) // 0-100
  segment          String     @default("NORMAL") // DORMANT, HIGH_VALUE, NURTURE, ENGAGED
  notes            String     @default("")
  assigned_to_id   String?
  referred_by_id   String?    // Affiliate relation (Student -> Commission)
  target_course_id String?
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt
  department       String?    // MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT

  // Relations
  assigned_to   User?         @relation("AssignedLeads", fields: [assigned_to_id], references: [id])
  referred_by   User?         @relation("ReferredLeads", fields: [referred_by_id], references: [id], onDelete: SetNull)
  target_course Course?       @relation(fields: [target_course_id], references: [id])
  interactions  Interaction[]
  tasks         Task[]
  commission    Commission?

  @@index([assigned_to_id])
  @@index([status])
  @@index([department])
  @@index([phone_number])
  @@index([target_course_id])
}
```

**Department Values:** `MANAGEMENT`, `REAL_ESTATE`, `FINANCE`, `LAW`, `PROJECT_MANAGEMENT`

### 3. Interaction (تعامل/پیگیری)

```prisma
model Interaction {
  id                 String          @id @default(cuid())
  lead_id            String
  agent_id           String
  interaction_type   InteractionType @default(NOTE)
  content            String
  next_followup_date DateTime?
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  // Relations
  lead  Lead @relation(fields: [lead_id], references: [id], onDelete: Cascade)
  agent User @relation("AgentInteractions", fields: [agent_id], references: [id])

  @@index([lead_id])
  @@index([agent_id])
  @@index([next_followup_date])
}
```

### 4. Course (دوره)

```prisma
model Course {
  id        String   @id @default(cuid())
  title     String
  price     Float    @default(0)
  capacity  Int      @default(30)
  is_active Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  department String? // MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT

  // Relations
  leads       Lead[]
  enrollments Enrollment[]
  classes     ClassSession[]
}
```

### 5. Enrollment (ثبت‌نام)

```prisma
model Enrollment {
  id              String        @id @default(cuid())
  student_id      String
  course_id       String
  payment_status  PaymentStatus @default(PAID)
  enrollment_date DateTime      @default(now())
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  student User     @relation("StudentEnrollments", fields: [student_id], references: [id])
  course  Course   @relation(fields: [course_id], references: [id])
  payments Payment[]

  @@index([student_id])
  @@index([course_id])
  @@index([payment_status])
}
```

### 6. Payment (پرداخت/قسط)

```prisma
model Payment {
  id              String           @id @default(cuid())
  enrollment_id   String
  amount          Float
  payment_type    PaymentType      @default(FULL)
  status          PaymentItemStatus @default(PENDING)
  due_date        DateTime
  paid_date       DateTime?
  description     String           @default("")
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  // Check fields (New)
  check_number    String?
  check_bank      String?
  check_date      DateTime?
  check_status    String?          // PENDING, CLEARED, BOUNCED

  // Relations
  enrollment Enrollment @relation(fields: [enrollment_id], references: [id], onDelete: Cascade)

  @@index([enrollment_id])
}
```

**Check Status Values:** `PENDING` (در جریان), `CLEARED` (وصول شده), `BOUNCED` (برگشتی)

### 7. Ticket (تیکت پشتیبانی)

```prisma
model Ticket {
  id          String   @id @default(cuid())
  student_id  String
  title       String
  description String
  status      String   @default("PENDING") // PENDING, IN_PROGRESS, RESOLVED
  priority    String   @default("NORMAL")  // LOW, NORMAL, HIGH
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  student User @relation("StudentTickets", fields: [student_id], references: [id], onDelete: Cascade)

  @@index([student_id])
}
```

### 8. ClassSession (جلسه کلاس)

```prisma
model ClassSession {
  id        String   @id @default(cuid())
  course_id String
  title     String
  date      DateTime
  link      String?  // لینک زنده
  archive_url String? // آرشیو ویدیو/صوتی
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  course Course @relation(fields: [course_id], references: [id], onDelete: Cascade)
}
```

### 9. Task (تسک/وظیفه با یادآوری)

```prisma
model Task {
  id            String   @id @default(cuid())
  agent_id      String
  lead_id       String?
  title         String
  description   String   @default("")
  due_date      DateTime
  status        String   @default("PENDING") // PENDING, COMPLETED
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  reminder_time Int?       // دقیقه قبل از due_date (null = بدون یادآوری)
  reminder_sent Boolean   @default(false)

  // Relations
  agent User  @relation("AgentTasks", fields: [agent_id], references: [id], onDelete: Cascade)
  lead  Lead? @relation(fields: [lead_id], references: [id], onDelete: SetNull)

  @@index([agent_id])
  @@index([due_date])
}
```

**Reminder Logic:**
- `reminder_time`: دقیقه قبل از `due_date` که وبهوک صدا زده شود
- Worker هر ۶۰ ثانیه چک می‌کند: `due_date - reminder_time <= now`
- پس از ارسال: `reminder_sent = true` + `ActivityLog` ثبت می‌شود

### 10. Commission (کمیسیون/معرفی)

```prisma
model Commission {
  id              String           @id @default(cuid())
  referrer_id     String
  referee_lead_id String           @unique
  amount          Float
  status          CommissionStatus @default(PENDING)
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  // Relations
  referrer     User @relation("UserCommissions", fields: [referrer_id], references: [id], onDelete: Cascade)
  referee_lead Lead @relation(fields: [referee_lead_id], references: [id], onDelete: Cascade)
}
```

### 11. ActivityLog (لاگ فعالیت)

```prisma
model ActivityLog {
  id          String   @id @default(cuid())
  user_id     String
  user_name   String
  user_role   String
  action      String   // LOGIN, CREATE_LEAD, UPDATE_LEAD_STATUS, CONVERT_LEAD, ...
  description String
  createdAt   DateTime @default(now())
}
```

**Action Values رایج:**
- `LOGIN`, `LOGOUT`
- `CREATE_LEAD`, `UPDATE_LEAD`, `UPDATE_LEAD_STATUS`, `DELETE_LEAD`, `CONVERT_LEAD`
- `CREATE_USER`, `UPDATE_USER`, `DELETE_USER`
- `CREATE_ENROLLMENT`, `CREATE_PAYMENT`, `UPDATE_PAYMENT`
- `CREATE_INTERACTION`, `UPDATE_INTERACTION`
- `CREATE_TASK`, `UPDATE_TASK`, `COMPLETE_TASK`
- `CREATE_PURCHASE_REQUEST`, `APPROVE_PURCHASE`, `REJECT_PURCHASE`
- `CREATE_TEACHER`, `UPDATE_TEACHER`, `DELETE_TEACHER`
- `CREATE_COURSE`, `UPDATE_COURSE`, `DELETE_COURSE`
- `REMINDER_DISPATCH_SUCCESS`, `REMINDER_DISPATCH_FAILURE`
- `SIGNUP_APPROVE`, `SIGNUP_REJECT`

### 12. PurchaseRequest (درخواست خرید/تنخواه)

```prisma
model PurchaseRequest {
  id           String   @id @default(cuid())
  requester_id String
  item_name    String
  amount       Float
  quantity     Int      @default(1)
  description  String   @default("")
  status       String   @default("PENDING") // PENDING, APPROVED, REJECTED
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  requester User @relation("UserPurchases", fields: [requester_id], references: [id], onDelete: Cascade)
}
```

**Approval Rights:** `ADMIN`, `FINANCIAL_OFFICER`, `DEPT_MANAGER` (برای دپارتمان خودش)

### 13. Teacher (استاد)

```prisma
model Teacher {
  id           String   @id @default(cuid())
  name         String
  phone_number String
  email        String?
  specialty    String
  status       String   @default("ACTIVE") // ACTIVE, INACTIVE, ON_LEAVE
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

**Management:** فقط `ADMIN` و `EDUCATION_OFFICER` می‌توانند CRUD کنند.

### 14. SignupRequest (درخواست ثبت‌نام عمومی)

```prisma
model SignupRequest {
  id                 String   @id @default(cuid())
  email              String   @unique
  first_name         String
  last_name          String
  phone_number       String
  desired_department String?
  passwordHash       String
  status             String   @default("PENDING") // PENDING, APPROVED, REJECTED
  reviewed_by_id     String?
  reviewed_at        DateTime?
  review_note        String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}
```

**Flow:** عمومی ثبت‌نام → `PENDING` → ادمین تایید/رد → اگر تایید: User ایجاد می‌شود با `SALES_AGENT`

### 15. Session (جلسه کاربری)

```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### 16. Account (بلااستفاده - NextAuth Legacy)

```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}
```

### 17. PasswordResetToken

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## روابط کلیدی (Relationships Diagram)

```
User (1) ─────< (N) Lead          [assigned_to_id]
  │                    │
  │                    ├─< (N) Interaction
  │                    ├─< (N) Task
  │                    ├─< (1) Commission
  │                    │
  ├─< (N) Lead         [referred_by_id]  ← Affiliate/Referral
  │
  ├─< (N) Interaction  [agent_id]
  ├─< (N) Enrollment   [student_id]
  ├─< (N) Ticket       [student_id]
  ├─< (N) Task         [agent_id]
  ├─< (N) Commission   [referrer_id]
  ├─< (N) PurchaseRequest [requester_id]
  │
  ├─< (N) Session
  ├─< (N) Account
  ├─< (N) PasswordResetToken
  │
Course (1) ─────< (N) Lead          [target_course_id]
  │
  ├─< (N) Enrollment
  ├─< (N) ClassSession
  │
Enrollment (1) ─< (N) Payment
  │
ClassSession (N) ─< (1) Course
```

---

## Indexها

```prisma
// Lead
@@index([assigned_to_id])
@@index([status])
@@index([department])
@@index([phone_number])
@@index([target_course_id])

// Interaction
@@index([lead_id])
@@index([agent_id])
@@index([next_followup_date])

// Enrollment
@@index([student_id])
@@index([course_id])
@@index([payment_status])

// Payment
@@index([enrollment_id])

// Ticket
@@index([student_id])

// Task
@@index([agent_id])
@@index([due_date])

// User
@@index([department])
```

---

## Seed Data (prisma/seed.ts)

### کاربران پیش‌فرض
```typescript
// بعد از bun run db:seed
const users = [
  { phone: '09120000001', name: 'اردلان ابوالفتحی', role: ADMIN },
  { phone: '09120000002', name: 'فاطمه یعقوبی', role: EDUCATION_OFFICER },
  { phone: '09120000003', name: 'سینا غمصاریان', role: FINANCIAL_OFFICER },
  { phone: '09120000004', name: 'سید حسین بنی طبا', role: MENTOR },
  { phone: '09120000005', name: 'نجیبه رمضان‌زاده', role: DEPT_MANAGER, department: 'MANAGEMENT' },
  { phone: '09120000006', name: 'محمد عدالت', role: DEPT_MANAGER, department: 'FINANCE' },
  // ... کاربران قدیمی برای توسعه
]
```

**رمز عبور پیش‌فرض همه:** `12345678`

### دوره‌های پیش‌فرض
- MBA مشهد (۱۸.۵م تومان)
- مدیر عامل حرفه‌ای (۱۶م تومان)
- MBA تخصصی مالی (۱۵.۵م تومان)
- مشاور املاک (۹.۵م تومان)
- مشاور حقوقی املاک (۸م تومان)
- مدیریت فروش ساختمان (۱۱م تومان)
- داوری حقوقی املاک (۱۰.۵م تومان)
- ارزیابی و قیمت‌گذاری املاک (۱۲م تومان)
- حقوق کاربردی (۱۴م تومان)
- داوری حقوقی (۱۱.۵م تومان)
- MBA مشاور حقوقی (۱۳م تومان)
- مدیریت پروژه DPM (۲۲م تومان)
- بازرسی فنی جوش (۱۲.۵م تومان)

### اساتید پیش‌فرض
- استاد احمدی (مدیریت و MBA)
- استاد رضایی (حقوق و داوری)

### درخواست‌های خرید پیش‌فرض
- کاغذ A4 برای بخش مالی (۱.۵م تومان × ۵) — PENDING
- هدست تماس برای بخش فروش (۳م تومان × ۲) — APPROVED

### لاگ فعالیت پیش‌فرض
- ایجاد کاربر فاطمه یعقوبی توسط اردلان
- ایجاد دوره مدیریت پروژه توسط فاطمه

---

## دستورات دیتابیس

```bash
# تولید Prisma Client
bun run db:generate

# اعمال schema به دیتابیس (dev)
bun run db:push

# اجرای seed
bun run db:seed

# Prisma Studio (GUI)
bun run db:studio

# در تولید (PostgreSQL)
DATABASE_URL="postgresql://..." bun run db:push
DATABASE_URL="postgresql://..." bun run db:seed
```

---

## نکات مهم برای توسعه

### 1. Department Isolation در کوئری‌ها
```typescript
// در API routes برای لیست‌ها
if (session.userRole === 'SALES_AGENT') {
  where.assigned_to_id = session.userId
} else if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
  const userProfile = await db.user.findUnique({ 
    where: { id: session.userId }, 
    select: { department: true } 
  })
  if (userProfile?.department) where.department = userProfile.department
}
// ADMIN, EDU_OFFICER, FIN_OFFICER: بدون فیلتر
```

### 2. Referred vs Assigned Leads
```prisma
//assigned_to_id = کارشناس مسئول (SALES_AGENT)
//referred_by_id = معرف/افیلییت (STUDENT) → کمیسیون
```

### 3. Lead Conversion to Student
```typescript
// leads/[id]/convert/route.ts:97-99
// فقط بر اساس phone_number match می‌شود
const existingStudent = await db.user.findUnique({
  where: { phone_number: lead.phone_number }
})
// FK مستقیمی از Enrollment به Lead وجود ندارد
```

### 4. Activity Log در Mutationها
```typescript
import { logActivity } from '@/lib/activity-logger'

await logActivity(request, 'CREATE_LEAD', `Created lead "${first_name} ${last_name}"`)
// silent catch - لاگ نباید response را بشکند
```

> ⚠️ **L1 در ISSUES.md**: در courses (PUT/DELETE/POST)، interactions، tasks، tickets، leads/compute-scores، leads/import، enrollments/[id]/payments POST لاگ ثبت نمی‌شود.

### 5. Check Tracking در Payment
```typescript
// financial-dashboard.tsx: قابل ویرایش از UI
// API: PUT /api/payments/[id] با { check_status: 'CLEARED' | 'BOUNCED' | 'PENDING' }
```

---

## Migration به PostgreSQL (تولید)

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```bash
# .env.production
DATABASE_URL="postgresql://user:pass@host:5432/crm?schema=public&sslmode=require"

# اعمال
DATABASE_URL="postgresql://..." bun run db:push
DATABASE_URL="postgresql://..." bun run db:seed
```

### Backup Strategy (تولید)
- **Daily PITR** (Point-in-Time Recovery)
- **Weekly Full Backup**
- **Cross-region Replica** برای Disaster Recovery
- **Encryption**: AES-256 برای بکاپ‌ها

---

## پرفورمنس و بهینه‌سازی

### کوئری‌های پرکاربرد که نیاز به Index دارند
✅ همگی پوشش‌داده شده در schema

### N+1 Problems
- `User` relations در list endpoints: از `select` یا `include` دقیق استفاده کنید
- `Lead` با `assigned_to` و `target_course`: `include: { assigned_to: true, target_course: true }`

### Pagination
```typescript
// همیشه limit/offset
const take = 20
const skip = (page - 1) * take
const [data, total] = await Promise.all([
  db.lead.findMany({ where, take, skip, orderBy: { createdAt: 'desc' } }),
  db.lead.count({ where })
])
```

---

## چک‌لیست Schema Changes

قبل از Push در تولید:
- [ ] `bun run db:generate` انجام شده
- [ ] `bun run db:push` در dev تست شده
- [ ] `bun run db:seed` داده‌های پیش‌فرض درست کار می‌کند
- [ ] TypeScript types به‌روز شده (`npx tsc --noEmit`)
- [ ] API routes مربوطه فیلتر department/role دارند
- [ ] Activity Log در mutationهای جدید ثبت می‌شود
- [ ] UI مربوطه (create/edit/list) تست شده
- [ ] Migration plan برای داده‌های موجود (اگر breaking change)

---

## مراجع

- [README.md](./README.md) — نمای کلی پروژه
- [API_DOCS.md](./API_DOCS.md) — مستندات کامل API
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) — راهنمای توسعه
- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) — معماری و تکنولوژی
- [ISSUES.md](./ISSUES.md) — باگ‌های شناخته‌شده
- [prisma/schema.prisma](./prisma/schema.prisma) — منبع اصلی Schema