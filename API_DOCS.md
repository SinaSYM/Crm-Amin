# مستندات کامل API — CRM موسسه امین

نسخه: 1.0  
تاریخ: ۱۴۰۵/۰۴/۲۰

---

## احراز هویت (Authentication)

### پایه: `src/app/api/auth/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| POST | `/api/auth/login` | ورود با ایمیل/رمز | ❌ | همه |
| POST | `/api/auth/logout` | خروج | ✅ | همه |
| GET | `/api/auth/me` | اطلاعات کاربر جاری | ✅ | همه |
| POST | `/api/auth/signup` | ثبت‌نام عمومی (ایجادید عمومی) | ❌ | همه |
| POST | `/api/auth/signup/approve` | تأیید/رد ثبت‌نام | ✅ | ADMIN |
| POST | `/api/auth/password-reset/initiate` | ارسال لینک بازیابی | ✅ | ADMIN/MANAGER |
| POST | `/api/auth/password-reset/confirm` | تأیید رمز جدید | ❌ | همه |

### ساختار درخواست/پاسخ

**Login Request:**
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "user": {
    "id": "cuid",
    "first_name": "علی",
    "last_name": "محمدی",
    "phone_number": "09121234567",
    "role": "ADMIN",
    "department": null,
    "is_active": true
  }
}
```
*توکن در کوکی `crm_session` (HttpOnly, Secure, SameSite=Lax) ست می‌شود.*

---

## لیدها (Leads)

### پایه: `src/app/api/leads/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/leads` | لیست لیدها (فیلتر نقش/دپارتمان) | ✅ | غیر STUDENT |
| POST | `/api/leads` | ایجاد لید (عمومی - بدون auth) | ❌ | همه (پابلیک) |
| GET | `/api/leads/[id]` | جزئیات لید | ✅ | غیر STUDENT |
| PUT | `/api/leads/[id]` | ویرایش لید | ✅ | غیر STUDENT |
| DELETE | `/api/leads/[id]` | حذف لید | ✅ | ADMIN/MANAGER |
| POST | `/api/leads/[id]/convert` | تبدیل به دانش‌پذیر | ✅ | SALES_AGENT+ |
| POST | `/api/leads/compute-scores` | محاسبه امتیاز همه | ✅ | ADMIN/MANAGER |
| POST | `/api/leads/import` | ایمپورت CSV | ✅ | ADMIN |

### فیلترهای GET `/api/leads`

| پارامتر | نوع | پیش‌فرض | توضیحات |
|----------|-----|---------|---------|
| `status` | string | - | NEW, CONTACTED, IN_PROGRESS, CONVERTED |
| `assigned_to_id` | string | - | آیدی کارشناس |
| `department` | string | - | MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT |
| `search` | string | - | جستجو در نام/شماره |
| `limit` | number | 50 | تعداد نتیجه |
| `offset` | number | 0 | افست |

### Scope بر اساس نقش

```typescript
// SALES_AGENT: فقط لیدهای اختصاص‌داده‌شده
where.assigned_to_id = session.userId

// DEPT_MANAGER / SALES_MANAGER: لیدهای دپارتمان خود
where.department = userProfile.department

// ADMIN / EDUCATION_OFFICER / FINANCIAL_OFFICER: همه لیدها
// بدون فیلتر اضافه
```

### POST `/api/leads` (فرم عمومی وب‌سایت)

**Request (بدون Auth):**
```json
{
  "first_name": "فاطمه",
  "last_name": "موسوی",
  "phone_number": "09129999001",
  "source": "website",
  "target_course_id": "course_cuid_optional",
  "notes": "از طریق سایت ثبت‌نام کرده"
}
```

**Response (201):**
```json
{
  "id": "lead_cuid",
  "first_name": "فاطمه",
  "last_name": "موسوی",
  "phone_number": "09129999001",
  "source": "website",
  "status": "NEW",
  "score": 0,
  "segment": "NORMAL",
  "notes": "از طریق سایت ثبت‌نام کرده",
  "target_course_id": "course_cuid_optional",
  "createdAt": "2026-07-11T..."
}
```

> ⚠️ **مهم**: در حال حاضر این endpoint چک `getSession` دارد و برای کاربر ناشناس 401 برمی‌گرداند (بلاگ C3 در ISSUES.md). نیاز به endpoint عمومی جداگانه دارد.

---

## تعاملات (Interactions)

### پایه: `src/app/api/interactions/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/interactions` | لیست (فیلتر lead_id, agent_id) | ✅ | غیر STUDENT |
| POST | `/api/interactions` | ثبت تعامل جدید | ✅ | SALES_AGENT+ |
| PUT | `/api/interactions/[id]` | ویرایش تعامل | ✅ | مالک/ADMIN |
| DELETE | `/api/interactions/[id]` | حذف تعامل | ✅ | ADMIN |

### GET `/api/interactions?lead_id=xxx`

**Query Params:**
- `lead_id` (required): آیدی لید
- `agent_id`: آیدی کارشناس
- `has_followup`: `true` - فقط آیتم‌های دارای `next_followup_date`

---

## کاربران (Users)

### پایه: `src/app/api/users/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/users` | لیست کاربران (فیلتر role) | ✅ | غیر SALES_AGENT/STUDENT |
| POST | `/api/users` | ایجاد کاربر (Admin) | ✅ | ADMIN |
| GET | `/api/users/[id]` | جزئیات کاربر | ✅ | غیر SALES_AGENT/STUDENT |
| PUT | `/api/users/[id]` | ویرایش کاربر (شامل admin_notes) | ✅ | ADMIN/DEPT_MANAGER |
| DELETE | `/api/users/[id]` | غیرفعال/حذف کاربر | ✅ | ADMIN |
| GET | `/api/users/export` | خروجی CSV | ✅ | ADMIN/MANAGER |

### فیلدهای کاربر

| فیلد | نوع | توضیحات |
|-------|-----|---------|
| `id` | string | CUID |
| `first_name` | string | نام |
| `last_name` | string | نام خانوادگی |
| `phone_number` | string | یکتا |
| `email` | string | یکتا (اختیاری) |
| `role` | enum | UserRole |
| `is_active` | boolean | پیش‌فرض true |
| `department` | string? | MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT |
| `personal_notes` | string | دفترچه یادداشت شخصی |
| `admin_notes` | string | یادداشت ادمین (فقط ADMIN/DEPT_MANAGER قابل ویرایش) |
| `referral_code` | string? | کد معرف یکتا |
| `wallet_balance` | float | موجودی کیف پول |
| `scope` | enum | STANDARD / GLOBAL |
| `isApproved` | boolean | پیش‌فرض false |

### PUT `/api/users/[id]`

**Request:**
```json
{
  "first_name": "علی",
  "last_name": "احمدی",
  "phone_number": "09121234567",
  "role": "SALES_AGENT",
  "is_active": true,
  "department": "REAL_ESTATE",
  "admin_notes": "کارشناس ارشد، عملکرد عالی"
}
```

---

## دوره‌ها (Courses)

### پایه: `src/app/api/courses/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/courses` | لیست دوره‌ها | ✅ | غیر STUDENT |
| POST | `/api/courses` | ایجاد دوره | ✅ | ADMIN/EDU_OFFICER |
| GET | `/api/courses/[id]` | جزئیات دوره | ✅ | غیر STUDENT |
| PUT | `/api/courses/[id]` | ویرایش دوره | ✅ | ADMIN/EDU_OFFICER |
| DELETE | `/api/courses/[id]` | حذف دوره | ✅ | ADMIN |

### فیلدهای دوره

| فیلد | نوع | توضیحات |
|-------|-----|---------|
| `department` | string? | MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT |
| `capacity` | int | ظرفیت (پیش‌فرض ۳۰) |
| `price` | float | قیمت (تومان) |
| `is_active` | boolean | پیش‌فرض true |

---

## ثبت‌نام‌ها (Enrollments)

### پایه: `src/app/api/enrollments/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/enrollments` | لیست (فیلتر دوره/دانش‌پذیر/وضعیت) | ✅ | غیر SALES_AGENT |
| POST | `/api/enrollments` | ایجاد ثبت‌نام | ✅ | ADMIN/FIN_OFFICER |
| GET | `/api/enrollments/[id]` | جزئیات + پرداخت‌ها | ✅ | غیر SALES_AGENT |
| PUT | `/api/enrollments/[id]` | ویرایش ثبت‌نام | ✅ | ADMIN/FIN_OFFICER |
| DELETE | `/api/enrollments/[id]` | حذف ثبت‌نام | ✅ | ADMIN |
| GET | `/api/enrollments/export` | خروجی CSV | ✅ | ADMIN/MANAGER |

### POST `/api/enrollments/[id]/payments`

**Request:**
```json
{
  "amount": 5000000,
  "payment_type": "INSTALLMENT",
  "due_date": "2026-08-01T00:00:00Z",
  "description": "قسط اول",
  "check_number": "123456",
  "check_bank": "ملی",
  "check_date": "2026-07-15T00:00:00Z"
}
```

> ⚠️ **C1 در ISSUES.md**: این endpoint هیچ احراز هویتی ندارد — IDOR کامل.

---

## پرداخت‌ها (Payments)

### پایه: `src/app/api/payments/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/payments` | لیست پرداخت‌ها | ✅ | غیر STUDENT |
| GET | `/api/payments/[id]` | جزئیات پرداخت | ✅ | غیر STUDENT |
| PUT | `/api/payments/[id]` | ویرایش (شامل وضعیت چک) | ✅ | FIN_OFFICER/ADMIN |

### فیلدهای چک در Payment

| فیلد | نوع | مقادیر |
|-------|-----|--------|
| `check_number` | string? | شماره چک |
| `check_bank` | string? | نام بانک |
| `check_date` | DateTime? | تاریخ چک |
| `check_status` | string? | PENDING, CLEARED, BOUNCED |

---

## تسک‌ها (Tasks) و تقویم

### پایه: `src/app/api/tasks/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/tasks` | لیست تسک‌ها (فیلتر agent_id) | ✅ | غیر STUDENT |
| POST | `/api/tasks` | ایجاد تسک با یادآور | ✅ | SALES_AGENT+ |
| GET | `/api/tasks/[id]` | جزئیات تسک | ✅ | غیر STUDENT |
| PUT | `/api/tasks/[id]` | ویرایش/تکمیل تسک | ✅ | مالک/ADMIN |
| DELETE | `/api/tasks/[id]` | حذف تسک | ✅ | مالک/ADMIN |

### فیلدهای یادآور (Reminder)

| فیلد | نوع | توضیحات |
|-------|-----|---------|
| `reminder_time` | int? | دقیقه قبل از due_date (null = بدون یادآور) |
| `reminder_sent` | boolean | پیش‌فرض false |

### نحوه کار Worker یادآور

```javascript
// در src/cron/reminder-worker.js
// هر 60 ثانیه:
// 1. پیدا کردن تسک‌ها:
//    status = 'PENDING' AND reminder_sent = false AND reminder_time != null
//    AND due_date <= now() + 24h
// 2. برای هر تسک: triggerTime = due_date - reminder_time دقیقه
// 3. اگر now >= triggerTime: POST به REMINDER_WEBHOOK_URL
// 4. آپدیت reminder_sent = true + لاگ ActivityLog
```

### قالب پیش‌فرض Payload وبهوک

```json
{
  "recipient_phone": "{recipient_phone}",
  "title": "{title}",
  "due_date": "{due_date}",
  "description": "{description}"
}
```

متغیرهای قابل استفاده: `{recipient_phone}`, `{agent_phone}`, `{lead_phone}`, `{title}`, `{due_date}`, `{description}`

---

## اساتید (Teachers)

### پایه: `src/app/api/teachers/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/teachers` | لیست اساتید (فیلتر status, specialty) | ✅ | غیر STUDENT |
| POST | `/api/teachers` | ایجاد استاد | ✅ | ADMIN/EDU_OFFICER |
| GET | `/api/teachers/[id]` | جزئیات استاد | ✅ | غیر STUDENT |
| PUT | `/api/teachers/[id]` | ویرایش استاد | ✅ | ADMIN/EDU_OFFICER |
| DELETE | `/api/teachers/[id]` | حذف استاد | ✅ | ADMIN/EDU_OFFICER |

---

## درخواست خرید (Purchase Requests)

### پایه: `src/app/api/purchases/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/purchases` | لیست (فیلتر status, requester_id) | ✅ | غیر STUDENT |
| POST | `/api/purchases` | ثبت درخواست خرید | ✅ | غیر STUDENT |
| GET | `/api/purchases/[id]` | جزئیات | ✅ | غیر STUDENT |
| PUT | `/api/purchases/[id]` | تایید/رد (status) | ✅ | ADMIN/FIN_OFFICER/DEPT_MGR |

### Scope دسترسی

| نقش | دیدگاه |
|------|--------|
| SALES_AGENT | فقط درخواست‌های خودش |
| DEPT_MANAGER / SALES_MANAGER | درخواست‌های دپارتمان خودش |
| ADMIN / FIN_OFFICER / EDU_OFFICER | همه (با فیلتر requester_id اختیاری) |

### Status Values
- `PENDING` — در انتظار بررسی
- `APPROVED` — تایید شده
- `REJECTED` — رد شده

---

## لاگ فعالیت (Activity Logs)

### پایه: `src/app/api/logs/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/logs` | لیست لاگ‌ها (فیلتر پیشرفته) | ✅ | غیر STUDENT/SALES_AGENT |

### فیلترها

| پارامتر | نوع | توضیحات |
|----------|-----|---------|
| `action` | string | CREATE_LEAD, UPDATE_LEAD_STATUS, CONVERT_LEAD, ... |
| `user_id` | string | آیدی کاربر |
| `role` | string | نقش کاربر |
| `search` | string | جستجو در نام/عملیات/توضیحات |
| `limit` | number | پیش‌فرض ۵۰ |
| `offset` | number | پیش‌فرض ۰ |

### Action Types ثبت‌شده

```typescript
'LOGIN' | 'LOGOUT' | 'CREATE_LEAD' | 'UPDATE_LEAD' | 'UPDATE_LEAD_STATUS' 
| 'CONVERT_LEAD' | 'DELETE_LEAD' | 'CREATE_USER' | 'UPDATE_USER' | 'DELETE_USER'
| 'CREATE_ENROLLMENT' | 'CREATE_PAYMENT' | 'UPDATE_PAYMENT' | 'CREATE_INTERACTION'
| 'CREATE_COURSE' | 'UPDATE_COURSE' | 'DELETE_COURSE' | 'CREATE_TEACHER'
| 'CREATE_PURCHASE_REQUEST' | 'APPROVE_PURCHASE' | 'REJECT_PURCHASE'
| 'REMINDER_DISPATCH_SUCCESS' | 'REMINDER_DISPATCH_FAILURE'
| 'CREATE_TASK' | 'UPDATE_TASK' | 'COMPLETE_TASK'
| ... و موارد دیگر
```

---

## AI Endpoints

### پایه: `src/app/api/ai/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| POST | `/api/ai/coach` | AI Sales Coach | ✅ | SALES_AGENT+ |
| POST | `/api/ai/generate` | تولید محتوای هوشمند | ✅ | SALES_AGENT+ |
| POST | `/api/ai/mentor` | AI Mentor (دانش‌پذیر) | ✅ | STUDENT/MENTOR+ |
| POST | `/api/ai/roleplay` | شبیه‌ساز فروش | ✅ | SALES_AGENT+ |
| POST | `/api/ai/diagnostic` | عارضه‌یاب عمومی | ❌ | عمومی |

### AI Coach Request
```json
POST /api/ai/coach
{
  "lead_id": "lead_cuid",
  "context": "تحلیل تاریخچه مکالمات برای تصمیم‌گیری"
}
```

### AI Coach Response
```json
{
  "guidance": [
    "راهنمای ۱: تمرکز بر مزیت‌های منحصر به فرد دوره",
    "راهنمای ۲: مدیریت اعتراض قیمت با ارائه اقساط",
    "راهنمای ۳: ایجاد اضطرار با محدودیت ظرفیت"
  ],
  "next_action": "تماس پیگیری در ۲۴ ساعت آینده با تمرکز بر برنامه‌ریزی مالی",
  "sentiment": "مثبت با نگرانی قیمتی",
  "conversion_probability": 75
}
```

> ⚠️ **M8 در ISSUES.md**: بدون `GEMINI_API_KEY` در `.env`، پاسخ‌های Mock برمی‌گرداند بدون هشدار به کاربر.

---

## تیکت‌ها (Tickets)

### پایه: `src/app/api/tickets/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/tickets` | لیست تیکت‌ها | ✅ | غیر SALES_AGENT |
| POST | `/api/tickets` | ایجاد تیکت (دانش‌پذیر) | ✅ | STUDENT |
| GET | `/api/tickets/[id]` | جزئیات تیکت | ✅ | غیر SALES_AGENT |
| PUT | `/api/tickets/[id]` | ویرایش/پاسخ تیکت | ✅ | مالک/ADMIN |

> ⚠️ **M6 در ISSUES.md**: `'tickets'` در `ActiveView` (store.ts) نیست — کارمندان UI ندارند.

---

## کلاس‌ها (Class Sessions)

### پایه: `src/app/api/classes/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/classes` | لیست جلسات (فیلتر course_id) | ✅ | غیر STUDENT |
| GET | `/api/classes/[id]` | جزئیات جلسه | ✅ | غیر STUDENT |
| PUT | `/api/classes/[id]` | ویرایش جلسه | ✅ | ADMIN/EDU_OFFICER |
| DELETE | `/api/classes/[id]` | حذف جلسه | ✅ | ADMIN/EDU_OFFICER |

> ⚠️ **L3 در ISSUES.md**: POST برای ساخت کلاس وجود ندارد.

---

## کمیسیون‌ها (Commissions)

### پایه: `src/app/api/commissions/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/commissions` | لیست کمیسیون‌ها | ✅ | ADMIN/FIN_OFFICER |
| PUT | `/api/commissions/[id]` | تایید/پرداخت کمیسیون | ✅ | ADMIN/FIN_OFFICER |

---

## 報表 (Analytics)

### پایه: `src/app/api/analytics/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/analytics` | آمار کلی داشبورد | ✅ | ADMIN/MANAGER |
| GET | `/api/analytics/conversion` | نرخ تبدیل | ✅ | ADMIN/MANAGER |
| GET | `/api/analytics/revenue` | درآمد | ✅ | ADMIN/FIN_OFFICER |
| GET | `/api/analytics/agents` | عملکرد کارشناسان | ✅ | ADMIN/MANAGER |

---

## جستجوی سراسری (Global Search)

### پایه: `src/app/api/search/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/search?q=...` | جستجوی یکپارچه (لید، کاربر، دوره، ...) | ✅ | غیر STUDENT |

---

## داشبورد (Dashboard)

### پایه: `src/app/api/dashboard/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/dashboard` | آمار داشبورد + پیگیری‌های پیش‌رو | ✅ | همه |

### Response
```json
{
  "stats": {
    "totalLeads": 150,
    "newLeads": 23,
    "convertedThisMonth": 12,
    "totalRevenue": 450000000,
    "activeStudents": 89
  },
  "upcomingFollowups": [
    {
      "id": "interaction_cuid",
      "content": "تماس پیگیری",
      "next_followup_date": "2026-07-12T10:00:00Z",
      "lead": { "id": "...", "first_name": "فاطمه", "last_name": "موسوی" },
      "agent": { "id": "...", "first_name": "رضا", "last_name": "کریمی" }
    }
  ]
}
```

---

## پروفایل کاربری (User Profile)

### پایه: `src/app/api/users/profile/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/users/profile` | پروفایل کاربر جاری | ✅ | همه |
| PUT | `/api/users/profile` | ویرایش پروفایل (personal_notes) | ✅ | همه |

---

## Affiliate / سفیر

### پایه: `src/app/api/affiliate/`

| متد | مسیر | توضیحات | Auth | نقش‌ها |
|-----|------|---------|------|--------|
| GET | `/api/affiliate` | آمار سفیر/کد معرف | ✅ | STUDENT |
| POST | `/api/affiliate/withdraw` | درخواست برداشت (پیاده‌سازی نشده) | ✅ | STUDENT |

> ⚠️ **M7 در ISSUES.md**: هیچ endpoint برداشت/تسویه‌ای وجود ندارد.

---

## کدهای خطای رایج

| کد | پیام | دلیل |
|-----|------|------|
| 401 | Unauthorized | کوکی session نامعتبر/منقضی |
| 403 | Forbidden | نقش کاربر اجازه دسترسی ندارد |
| 404 | Not Found | رکورد یافت نشد |
| 409 | Conflict | تکراری (مثل phone_number یکتا) |
| 422 | Validation Error | بدنه درخواست نامعتبر |
| 500 | Internal Server Error | خطای سرور (لاگ در کنسول) |

---

## نکات مهم برای توسعه‌دهندگان

### 1. هدرهای درخواست
تمام درخواست‌های mutation (POST/PUT/DELETE) باید `Content-Type: application/json` داشته باشند.

### 2. احراز هویت
- سیستم از کوکی `crm_session` استفاده می‌کند (HttpOnly)
- در توسعه با `DEMO_AUTH=1` می‌توان از هدرهای `X-User-Id` و `X-User-Role` استفاده کرد
- کلاینت به صورت خودکار این هدرها را در `fetch` monkey-patch شده ست می‌کند (`page.tsx:250-274`)

### 3. لاگ فعالیت
تمام mutationهای اصلی باید `logActivity(request, action, description)` را صدا بزنند:
```typescript
import { logActivity } from '@/lib/activity-logger'

await logActivity(request, 'CREATE_LEAD', `Created lead "${first_name} ${last_name}"`)
```

> ⚠️ **L1 در ISSUES.md**: در چند endpoint لاگ ثبت نمی‌شود (courses PUT/DELETE/POST، interactions، tasks، tickets، ...)

### 4. فیلتر دپارتمان
برای endpointهای لیست، همیشه Scope را بر اساس نقش اعمال کنید:
```typescript
const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })

if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
  where.department = userProfile?.department
} else if (session.userRole === 'SALES_AGENT') {
  where.assigned_to_id = session.userId
}
// ADMIN, EDU_OFFICER, FIN_OFFICER: بدون فیلتر
```

### 5. تایپ‌های TypeScript
استفاده از `Prisma` types:
```typescript
import { UserRole, LeadStatus, PaymentStatus } from '@prisma/client'
```

---

## محیط توسعه

```bash
# متغیرهای محیطی (.env)
DATABASE_URL="file:./db/custom.db"
JWT_SECRET="dev-secret-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
DEMO_AUTH="0"

# AI (اختیاری)
GEMINI_API_KEY=""

# Reminder Worker
REMINDER_WEBHOOK_URL="https://webhook.site/your-id"
REMINDER_WEBHOOK_METHOD="POST"
REMINDER_WEBHOOK_HEADERS='{"Content-Type":"application/json"}'
REMINDER_POLL_INTERVAL_MS=60000
```

```bash
# اجرا
bun run dev           # Next.js روی پورت ۳۰۰۰
bun run db:push       # اعمال schema
bun run db:seed       # داده‌های اولیه
```

---

## نکاتMigration تولید

```bash
# PostgreSQL در تولید
DATABASE_URL="postgresql://user:pass@host:5432/crm?schema=public"

# بیلد standalone
bun run build

# خروجی در .next/standalone
# کپی به سرور + npm install --production
# اجرا: node .next/standalone/server.js
```