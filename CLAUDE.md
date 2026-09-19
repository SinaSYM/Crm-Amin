# CLAUDE.md

این فایل راهنمای Claude Code (claude.ai/code) برای کار کردن با کد این ریپازیتوری است.

## پروژه

سیستم CRM مؤسسه آموزش عالی آزاد امین (Amin Institute). کل رابط کاربری **فارسی و راست‌به‌چپ (RTL)** است (`<html lang="fa" dir="rtl">`، فونت Vazirmatn) — رشته‌های نمایشی به کاربر باید فارسی باشند؛ کد و کامنت‌های کد به انگلیسی می‌مانند.

استک: Next.js 16 (App Router، خروجی standalone)، React 19، TypeScript، Tailwind CSS 4، shadcn/ui (Radix)، Prisma + SQLite، Zustand. ران‌تایم/پکیج‌منیجر **bun** است.

## دستورها

```bash
bun run dev             # سرور dev روی پورت 3000، خروجی در dev.log
bun run build           # next build + کپی static/public داخل .next/standalone
bun run start           # اجرای سرور standalone با bun، خروجی در server.log
bun run lint            # eslint .
bun run db:push         # push کردن schema به SQLite (db/custom.db) — در حالت عادی فایل migration نداریم
bun run db:generate     # بازتولید Prisma client بعد از تغییر schema
bun run bootstrap:admin # ساخت/ریست کاربر ادمین (env: ADMIN_EMAIL / ADMIN_PASSWORD)
```

فریم‌ورک تست وجود ندارد. در `next.config.ts` گزینه‌ی `ignoreBuildErrors: true` ست شده، پس موفق بودن `bun run build` به معنی درست بودن تایپ‌ها **نیست** — برای تایپ‌چک از `npx tsc --noEmit` استفاده کن.

نسخه‌ی production پشت Caddy سرو می‌شود (`Caddyfile`): دامنه‌ی `crm.aitechsite.site` → `localhost:3005`.

## معماری

### اپ تک‌صفحه‌ای سمت کلاینت، بدون page routing

`src/app/page.tsx` تنها صفحه‌ی پروژه است — یک کامپوننت کلاینت بزرگ که صفحه‌ی ورود یا شِل اصلی اپ را رندر می‌کند و صفحات را از طریق `activeView` در استور Zustand (`src/lib/store.ts`) جابه‌جا می‌کند. همه‌ی صفحات در `src/components/crm/*.tsx` هستند. برای افزودن صفحه‌ی جدید: مقدار جدید به `ActiveView` و ورودی‌های `roleNavConfig` در `store.ts` اضافه کن، کامپوننت را در `src/components/crm/` بساز، و آن را داخل `page.tsx` (سایدبار + سوییچ ویو) وصل کن.

### API routeها — تنها سطح سرور

تمام منطق بک‌اند در handlerهای `src/app/api/**/route.ts` قرار دارد. الگوی استاندارد که در همه‌ی routeها تکرار می‌شود:

1. `const session = await getSession(request)` → اگر null بود، خطای 401 (`src/lib/auth.ts`)
2. بررسی نقش (role gate) → خطای 403 (چک نقش مستقیماً روی `session.userRole` انجام می‌شود)
3. اعمال `where` مخصوص Prisma بر اساس نقش/دپارتمان (توضیح در ادامه)
4. routeهای mutation، `logActivity(request, action, description)` را صدا می‌زنند (`src/lib/activity-logger.ts`) → جدول `ActivityLog`
5. خطاها با `NextResponse.json({ error: '...' }, { status })` برگردانده می‌شوند

### احراز هویت و RBAC

سیستم auth سفارشی مبتنی بر کوکی (نه next-auth، با اینکه در dependencyها هست): `src/lib/auth.ts` + `src/lib/password.ts`، سشن‌ها در جدول Prisma با نام `Session` ذخیره می‌شوند. `DEMO_AUTH=1` در `.env` یک مسیر fallback قدیمی را فعال می‌کند که به هدرهای درخواست `X-User-Id`/`X-User-Role` اعتماد می‌کند — این یک درِ پشتی دموی خطرناک است؛ در محیط production همیشه باید خاموش (`0`) باشد و نباید توسعه داده شود.

نقش‌ها (enum `UserRole`): ADMIN، SALES_MANAGER، SALES_AGENT، STUDENT، EDUCATION_OFFICER، FINANCIAL_OFFICER، MENTOR، DEPT_MANAGER. دیده‌شدن داده‌ها به‌صورت per-route کنترل می‌شود، نه مرکزی: ADMIN و نقش‌های افسر سازمانی (EDUCATION_OFFICER، FINANCIAL_OFFICER، MENTOR) همه‌چیز را می‌بینند؛ DEPT_MANAGER/SALES_MANAGER فقط دپارتمان خودشان را می‌بینند؛ SALES_AGENT فقط رکوردهایی که `assigned_to` خودش هستند را می‌بیند؛ STUDENT از routeهای CRM بلاک است. هنگام افزودن endpoint جدید برای لیست/جزئیات، همین الگوی دسترسی را تکرار کن (به `src/app/api/leads/route.ts` به‌عنوان پیاده‌سازی مرجع نگاه کن). `roleNavConfig` در `store.ts` تعیین می‌کند کدام ویوها برای هر نقش در سمت کلاینت نمایش داده شوند.

### دیتابیس

سینگلتون Prisma در `src/lib/db.ts` قرار دارد (فقط `db` را import کن، هرگز خودت `PrismaClient` نساز). فایل SQLite در `db/custom.db` است (متغیر `DATABASE_URL` در `.env`). Schema (`prisma/schema.prisma`) عمداً دو استایل نام‌گذاری دارد: فیلدهای دامنه‌ی کسب‌وکار snake_case هستند (`first_name`، `assigned_to_id`)، فیلدهای فریم‌ورکی camelCase (`createdAt`، `passwordHash`) — استایل فیلدهای مجاور را حفظ کن. مدل‌های دامنه: User، Lead، Interaction، Course، Enrollment، Payment، Ticket، ClassSession، Task، Commission، ActivityLog، PurchaseRequest، Teacher، SignupRequest.

### بخش‌های پشتیبان

- **امتیازدهی لید (Lead scoring)**: `src/lib/lead-scoring/compute.ts`، از routeهای لید و از `api/leads/compute-scores` صدا زده می‌شود.
- **قابلیت‌های AI** (`api/ai/{coach,generate,mentor,roleplay}`): `src/lib/gemini.ts` با `GEMINI_API_KEY` به Gemini API درخواست می‌زند؛ بدون کلید، به‌صورت خاموش پاسخ‌های mock برمی‌گرداند.
- **کرون یادآوری (Reminder cron)**: `src/cron/reminder-worker.js` — اسکریپت مستقل CommonJS (مستقیماً با node/bun اجرا می‌شود، جزو Next نیست) که تسک‌ها/پیگیری‌ها را چک می‌کند و به `REMINDER_WEBHOOK_URL` POST می‌زند؛ هنگام استارت، مقادیر پیش‌فرض `REMINDER_WEBHOOK_*` گم‌شده را داخل `.env` می‌نویسد.
- **اسکریپت‌های ادمین**: `scripts/*.ts` (با `tsx` اجرا می‌شوند) برای فعال‌سازی کاربر، ریست رمز عبور، لیست کاربران.

### مستندات

اسپک‌ها و پلن‌های پیاده‌سازی در `docs/superpowers/{specs,plans}` هستند (فایل‌های مارک‌داون تاریخ‌دار)؛ `worklog.md` لاگ تاریخی ساخت پروژه است. کارهای فیچر جدید معمولاً الگوی spec → plan → implement را دنبال کرده‌اند.
