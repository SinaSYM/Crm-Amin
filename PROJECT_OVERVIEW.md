# نمای کلی پروژه — CRM مؤسسه امین

تاریخ تهیه: 2026-07-03 — فاز ۱ (Discovery، فقط خواندن)

## ۱. معماری کلی

اپلیکیشن **تک‌صفحه‌ای سمت کلاینت** روی Next.js App Router است، بدون page routing واقعی:

- `src/app/page.tsx` (۵۷۱ خط) تنها صفحه‌ی پروژه است. یک کامپوننت کلاینت بزرگ که بر اساس `isAuthenticated` (از استور Zustand) یا `<LoginPage />` را نشان می‌دهد یا شِل اصلی (سایدبار + هدر + `ViewRenderer`) را.
- ناوبری بین صفحات از طریق state (`activeView`) در `src/lib/store.ts` انجام می‌شود، نه `useRouter`/URL. تغییر view یعنی `setActiveView(...)`؛ هیچ URL جداگانه‌ای برای صفحات وجود ندارد.
- یک `useEffect` در `page.tsx` (خط ۲۳۰–۲۳۴) اگر `activeView` فعلی در `allowedViews` نقش کاربر نباشد، کاربر را به `dashboard` هدایت می‌کند — این گارد فقط بعد از رندر اولیه اجرا می‌شود (احتمال فلش کوتاه یک view غیرمجاز).
- تمام صفحات در `src/components/crm/*.tsx` هستند (۲۳ فایل، مجموعاً ~۱۷٬۵۰۰ خط). بزرگ‌ترین‌ها: `leads-page.tsx` (۲۲۰۸)، `sales-panel.tsx` (۱۳۵۲)، `dashboard.tsx` (۱۳۴۰)، `enrollments-page.tsx` (۱۳۱۳)، `calendar-page.tsx` (۱۱۴۰)، `login-page.tsx` (۱۱۰۲).
- `student-portal.tsx` (۱۰۵۸ خط) یک view مستقل در `ActiveView` نیست؛ از داخل `dashboard.tsx` (خط ۴۹، ۲۵۲) به‌صورت شرطی برای نقش STUDENT رندر می‌شود.

## ۲. استک تکنولوژی

| بخش | تکنولوژی | نسخه |
|---|---|---|
| فریم‌ورک | Next.js (App Router، خروجی standalone) | ^16.1.1 |
| UI | React | ^19.0.0 |
| زبان | TypeScript | ^5 |
| استایل | Tailwind CSS + shadcn/ui (Radix) | Tailwind ^4 |
| State | Zustand (با `persist` middleware) | ^5.0.6 |
| ORM/DB | Prisma + SQLite (`db/custom.db`) | Prisma ^6.11.1 |
| فرم/اعتبارسنجی | react-hook-form + zod | ^7.60 / ^4.0.2 |
| Runtime/PM | bun | — |
| AI | Gemini REST API مستقیم (بدون SDK رسمی) | `gemini-1.5-flash` |

نکته: `next-auth` (^4.24.11) در dependencies هست ولی استفاده نمی‌شود — auth کاملاً سفارشی است (کوکی + جدول Session در Prisma). مدل `Account` در schema هم به شکل NextAuth باقی مانده ولی بلااستفاده است. این یک dependency/schema اضافه‌ی بلاتکلیف است، نه باگ فعال.

## ۳. الگوی API Routes

تمام منطق سرور در `src/app/api/**/route.ts` (۴۳ فایل) است. **هیچ `middleware.ts` در پروژه وجود ندارد** — یعنی هر route مستقل مسئول auth/authorization خودش است، بدون گیت مرکزی.

الگوی استاندارد تکرارشونده در اکثر routeها:
1. `const session = await getSession(request)` → 401 اگر null
2. چک نقش (role gate) روی `session.userRole` → 403
3. فیلتر `where` بر اساس نقش/دپارتمان (ADMIN/officerها همه‌چیز، MANAGERها دپارتمان خود، SALES_AGENT فقط `assigned_to_id` خودش)
4. `logActivity(request, action, description)` روی routeهای mutation (`src/lib/activity-logger.ts`) — خطای لاگ silent-catch می‌شود، هیچ‌وقت response را نمی‌شکند
5. خطاها با `NextResponse.json({ error }, { status })`

الگوی مرجع: `src/app/api/leads/route.ts`. جزئیات انحراف از این الگو در فایل‌های دیگر → `ISSUES.md`.

## ۴. احراز هویت و RBAC

- سیستم auth کاملاً سفارشی: `src/lib/auth.ts` + `src/lib/password.ts`. کوکی `crm_session` (httpOnly، sameSite=lax، secure در production)، توکن تصادفی ۳۲ بایتی، رکورد در جدول `Session` با `expires` (TTL ثابت ۳۰ روز، بدون sliding expiration، بدون CSRF token جداگانه).
- هش پسورد: **scrypt** دستی (نه bcrypt/argon2، ولی پارامترها مطابق حداقل توصیه‌ی OWASP: N=16384, r=8, p=1)، فرمت خودتوصیف‌گر `scrypt$N$r$p$salt$hash`، مقایسه با `timingSafeEqual`.
- `DEMO_AUTH=1` یک مسیر fallback است که به هدرهای `X-User-Id`/`X-User-Role` اعتماد می‌کند (`getDemoSession`, `src/lib/auth.ts:111-123`) — دقیقاً همان‌طور که CLAUDE.md هشدار داده، یک درِ پشتی خطرناک. در حال حاضر `DEMO_AUTH=0` در `.env` (غیرفعال) ولی این مسیر در ده‌ها route و در خود کلاینت (`page.tsx:239-269`, monkey-patch سراسری `window.fetch`) جاسازی شده.
- نقش‌ها (enum `UserRole`): ADMIN, SALES_MANAGER, SALES_AGENT, STUDENT, EDUCATION_OFFICER, FINANCIAL_OFFICER, MENTOR, DEPT_MANAGER. `roleNavConfig` در `store.ts` تعیین می‌کند کدام viewها برای هر نقش نمایش داده شوند (client-side فقط؛ enforcement واقعی سمت API انجام می‌شود).
- جریان ثبت‌نام: signup عمومی → `SignupRequest` با وضعیت PENDING (نه ساخت مستقیم User) → تأیید توسط ADMIN از طریق `signup-approve` → ساخت User با نقش ثابت SALES_AGENT.
- **بدون بازیابی رمز عبور خودکار**: دکمه‌ی "فراموشی رمز عبور" در UI فقط toast نشان می‌دهد ("با مدیر سیستم تماس بگیرید")؛ بازیابی واقعی فقط از طریق اسکریپت CLI دستی (`scripts/reset-password.ts`) ممکن است.

## ۵. دیتابیس

سینگلتون Prisma در `src/lib/db.ts`. فایل SQLite در `db/custom.db`. Schema دو استایل نام‌گذاری دارد: فیلدهای دامنه snake_case (`first_name`, `assigned_to_id`)، فیلدهای فریم‌ورکی camelCase (`createdAt`, `passwordHash`).

مدل‌های دامنه: User, Lead, Interaction, Course, Enrollment, Payment, Ticket, ClassSession, Task, Commission, ActivityLog, PurchaseRequest, Teacher, SignupRequest, Session, Account (بلااستفاده).

نکته‌ی مهم رابطه‌ای: `Lead.referred_by_id` / `User.referredLeads` رابطه‌ی **افیلیت/معرفی** است (لید معرفی‌شده توسط یک دانشجو برای کمیسیون)، **نه** رابطه‌ای که یک دانشجوی تبدیل‌شده را به agent مسئولش وصل کند. تبدیل لید به دانشجو صرفاً از طریق تطبیق `phone_number` انجام می‌شود (`leads/[id]/convert/route.ts:97-99`) و هیچ FK مستقیمی از Enrollment/User(STUDENT) به `Lead.assigned_to_id` وجود ندارد. چند route اشتباهاً از رابطه‌ی افیلیت برای scope کردن SALES_AGENT استفاده می‌کنند — جزئیات در ISSUES.md.

## ۶. بخش‌های پشتیبان

- **امتیازدهی لید**: `src/lib/lead-scoring/compute.ts` — وزن‌ها هاردکد هستند (بدون UI تنظیم وزن).
- **AI** (`api/ai/{coach,generate,mentor,roleplay,diagnostic}`): `src/lib/gemini.ts` → درخواست مستقیم REST به Gemini؛ بدون `GEMINI_API_KEY` (که در حال حاضر در `.env` خالی/غایب است) بی‌صدا به پاسخ‌های mock/canned فارسی برمی‌گردد — هیچ هشداری به کاربر نهایی نمایش داده نمی‌شود که پاسخ واقعی AI نیست.
- **کرون یادآوری**: `src/cron/reminder-worker.js` — اسکریپت مستقل CommonJS، POST به `REMINDER_WEBHOOK_URL`.
- **اسکریپت‌های ادمین**: `scripts/*.ts` (با tsx) — activate-user, bootstrap-admin, reset-password, list-users, test-query.

## ۷. وضعیت مستندسازی پروژه (ورودی مهم برای قضاوت "چه چیزی کامل است")

- `worklog.md` (۱۶۲۳ خط) تا Phase 7 پیش رفته و بعد از آن متوقف شده. **جدیدترین و حساس‌ترین زیرسیستم (auth سفارشی، RBAC گسترش‌یافته، تفکیک دپارتمان، جریان تأیید signup) هیچ‌جا در worklog مستند نشده** — این کارها بعد از توقف worklog انجام شده‌اند.
- `docs/superpowers/{specs,plans}` فقط دو تلاش فیچر مستند دارد: "Amin CRM enhancements" (۲۸ ژوئن ۲۰۲۶ — کاملاً پیاده‌سازی شده) و "Mandatory follow-up date" (۱ ژوئیه ۲۰۲۶ — پیاده‌سازی شده ولی یک رگرسیون ایجاد کرده، به ISSUES.md نگاه کنید). بخش بزرگی از فیچرهای پیاده‌سازی‌شده (auth/signup/login، AI، affiliate، tickets) هیچ spec/plan ندارند.
- یک commit قدیمی (`5222a69`) یک سند نیازمندی‌های جامع‌تر را حذف کرده که ویژگی‌های بیشتری (leaderboard/gamification، تحلیل تماس ضبط‌شده، wallet withdrawal) را پیش‌بینی می‌کرد که هیچ‌کدام پیاده‌سازی نشده‌اند.
- `agent-ctx/*.md` یادداشت‌های handoff فاز اولیه پروژه‌اند، بدون هشدار خاص.
- `.claude/settings.local.json` نشان می‌دهد یک agent قبلی دقیقاً همین مسیر signup/login/demo-auth را با curl دستی دیباگ می‌کرده — هم‌راستا با یافته‌های این گزارش.

## ۸. Conventions مهم برای رعایت در فازهای بعدی

- کد و کامنت انگلیسی؛ رشته‌های نمایشی فارسی.
- تغییر schema فقط با `db:push` (بدون migration رسمی) — طبق قانون کلی کاربر، هرگونه تغییر ساختاری بزرگ باید قبلاً توضیح داده شود.
- `ignoreBuildErrors: true` در `next.config.ts` یعنی build موفق ≠ تایپ‌های درست؛ برای تایپ‌چک از `npx tsc --noEmit` استفاده شود.
- فریم‌ورک تست وجود ندارد.
