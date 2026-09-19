# گزارش بررسی امنیتی (Security Audit) — فاز ۲

تاریخ: 2026-07-03. این گزارش فقط-خواندنی است؛ **هیچ کدی هنوز فیکس نشده**. طبق قانون کاربر، قبل از هرگونه اصلاح، این گزارش برای تأیید ارائه می‌شود.

## ⚠️ فوری‌ترین یافته — زیرساخت (قبل از هر چیز دیگر بخوانید)

### S0 — [Critical] پراکسی معکوس با پورت دلخواه از طریق query string در Caddyfile production
`Caddyfile:2-8`:
```
@transform_port_query {
	query XTransformPort=*
}
handle @transform_port_query {
	reverse_proxy localhost:{query.XTransformPort} { ... }
}
```
دامنه‌ی عمومی `crm.amin-inst.ac.ir` اگر درخواستی با query param `XTransformPort=<هر مقدار>` دریافت کند، آن را مستقیماً به `localhost:{همان مقدار}` روی سرور پراکسی می‌کند — بدون احراز هویت، بدون allow-list پورت. یعنی هر کاربر ناشناس روی اینترنت می‌تواند با یک URL مثل `https://crm.amin-inst.ac.ir/x?XTransformPort=<port>` به هر سرویسی که فقط روی `localhost` سرور گوش می‌دهد (دیتابیس، پنل ادمین داخلی، سرویس دیباگ، هر پورت باز دیگر) از بیرون دسترسی پیدا کند. این عملاً یک **SSRF/port-scanner/gateway باز** روی دامنه‌ی production است.

بررسی شد: هیچ ارجاعی به `XTransformPort` در کد پروژه (`src/`, `scripts/`, `.zscripts/`) پیدا نشد — به نظر می‌رسد باقی‌مانده‌ی یک ابزار زیرساختی/دیباگ خودکار (احتمالاً از محیط توسعه) است که به اشتباه در Caddyfile نهایی مانده. تنها دو commit تاریخچه‌ی این فایل را دارند و هر دو پیام commit خودکار (UUID) دارند — نشان می‌دهد این فایل هیچ‌وقت با نگاه انسانی review نشده.

**این باید فوری و مستقل از بقیه‌ی فازها بررسی و رفع شود** — پیشنهاد: حذف کامل این block از Caddyfile production. منتظر تأیید شما برای اصلاح آن هستم (چون یک فایل زیرساخت production است، طبق قانون شما جزو "تغییرات ریسک‌بالا" حساب می‌شود).

---

## ۱. Authentication & Session

| # | Severity | یافته | محل |
|---|---|---|---|
| A1 | **High** | بدون rate limiting روی `/api/auth/login` (هم مسیر email+password، هم quick-login با `userId` وقتی DEMO_AUTH فعال است). brute-force نامحدود ممکن است. | `src/app/api/auth/login/route.ts` |
| A2 | **High** | timing side-channel در `loginWithCredentials()`: برای ایمیل ناموجود/غیرفعال فوراً return می‌شود، ولی برای ایمیل موجود با پسورد غلط محاسبه‌ی کند scrypt (~200ms) اجرا می‌شود — قابل استفاده برای شمارش ایمیل‌های معتبر از روی زمان پاسخ. | `src/lib/auth.ts:164-172` |
| A3 | **Medium** | سشن‌ها عمر ثابت ۳۰ روزه دارند، بدون sliding expiration، بدون فیلد `createdAt`/IP/User-Agent روی جدول `Session` — امکان ردیابی/ابطال انتخابی سشن‌های مشکوک وجود ندارد. | `prisma/schema.prisma:98-104`, `src/lib/password.ts:63` |
| A4 | **Medium** | بدون CSRF token مجزا؛ اتکای کامل روی `SameSite=Lax`. چند GET side-effect دارد (پایین را ببینید) که با `SameSite=Lax` از طریق navigation سطح-بالا (مثل لینک/img) قابل تریگر است. | `src/app/api/auth/login/route.ts:101-104` |
| A5 | **Medium** | بدون self-service بازیابی رمز عبور؛ دکمه UI فقط toast نمایش می‌دهد. تنها مسیر واقعی، اسکریپت CLI دستی `scripts/reset-password.ts` است که خودش یک یافته‌ی جداست (S/C2 پایین). | `src/components/crm/login-page.tsx:36` |
| A6 | **Medium** | سیاست رمز عبور فقط `min(8)` است، بدون الزام پیچیدگی. | `src/app/api/auth/signup/route.ts:39` |
| A7 | **High** | مکانیزم `DEMO_AUTH=1` — هدرهای خام `X-User-Id`/`X-User-Role` بدون هیچ چک صحت را می‌پذیرد (نقش هدر حتی با نقش واقعی DB مطابقت داده نمی‌شود)؛ در ~۵۰ route جاسازی شده و کلاینت هم به‌صورت خودکار این هدرها را می‌فرستد. در حال حاضر `.env` دارد `DEMO_AUTH=0` (غیرفعال، امن)، ولی معماری آن ریسک باقی‌مانده است اگر یک‌بار فعال شود. | `src/lib/auth.ts:26-32,111-123`, `src/app/page.tsx:239-269` |
| A8 | **Low** | مدل `Account` (فرمت NextAuth) در schema هست ولی استفاده نمی‌شود؛ dependency `next-auth` هم نصب ولی بلااستفاده است — سطح حمله/سردرگمی اضافه بدون فایده. | `prisma/schema.prisma:80-96`, `package.json` |

## ۲. Authorization / IDOR

**به‌روزرسانی (فاز ۳)**: در حین پیاده‌سازی فیچر بازیابی پسورد، یک یافته‌ی Critical دیگر که در بررسی اولیه دیده نشده بود کشف و بلافاصله فیکس شد:

| # | Severity | یافته | محل |
|---|---|---|---|
| Z0 | **Critical** (کشف‌شده در فاز ۳، فیکس‌شده) | `GET /api/users` و `GET /api/users/[id]` بدون `select`/`omit` صدا زده می‌شدند، یعنی Prisma به‌صورت پیش‌فرض **تمام ستون‌ها از جمله `passwordHash`** را در پاسخ JSON برمی‌گرداند. هر کاربر لاگین‌شده‌ای که به این endpointها دسترسی داشت (اکثر نقش‌ها، با محدودیت دپارتمان/خود) هش رمز عبور کاربران دیگر را دریافت می‌کرد — قابل استفاده برای cracking آفلاین. فیکس شد با افزودن `omit: { passwordHash: true }`. | `src/app/api/users/route.ts`, `src/app/api/users/[id]/route.ts` |
| Z1 | **Critical** | `enrollments/[id]/payments/route.ts` هیچ `getSession`/چک نقشی ندارد — GET و POST کاملاً بدون احراز هویت‌اند. هر کاربر ناشناس می‌تواند اطلاعات enrollment/دانشجو/پرداخت هر id را بخواند و طرح اقساط جدید بسازد. | `src/app/api/enrollments/[id]/payments/route.ts:1-173` |
| Z2 | **High** | باگ سیستمیک scope اشتباه برای SALES_AGENT در ۵ فایل (۷ محل): از رابطه‌ی افیلیت `referred_by_id`/`referredLeads` به‌جای `assigned_to_id` برای فیلتر دیدن enrollment/payment/ticket استفاده می‌شود. نتیجه: agent می‌تواند داده‌ی دانشجوی agent دیگر را ببیند و برعکس دانشجوی خودش را نبیند. | `enrollments/route.ts:24-32`, `enrollments/[id]/route.ts:44-53`, `payments/route.ts:33-43`, `payments/[id]/route.ts:48-58`, `tickets/route.ts:21-29,85-92`, `tickets/[id]/route.ts:35-46` |
| Z3 | **Medium** | `ai/coach` و `ai/generate` هیچ scope مالکیت/دپارتمان روی `lead_id` ورودی ندارند — کاربر مجاز با نقش درست می‌تواند یادداشت هر لید دلخواه (حتی دپارتمان دیگر) را از طریق این endpoint ببیند. | `src/app/api/ai/coach/route.ts:31-44`, `src/app/api/ai/generate/route.ts:31-40` |
| Z4 | **Medium** | `enrollments/export` و `users/export` بدون فیلتر دپارتمان کل داده را CSV می‌دهند، برخلاف نسخه‌ی GET معادل‌شان که دپارتمان را اسکوپ می‌کند — راه دور زدن ایزوله‌سازی دپارتمان از طریق export. | `src/app/api/enrollments/export/route.ts`, `src/app/api/users/export/route.ts` |
| Z5 | **Medium** | `tickets/route.ts` GET بدون فیلتر دپارتمان برای managerها — همه‌ی تیکت‌های سازمان دیده می‌شود. | `src/app/api/tickets/route.ts:21-29` |
| Z6 | **Low** | User-ID enumeration oracle: در PUT `users/[id]`، چک "کاربر وجود دارد" (404) قبل از چک "دسترسی مجاز است" (403) اجرا می‌شود — کاربر کم‌دسترسی می‌تواند بفهمد یک id معتبر است یا نه. | `src/app/api/users/[id]/route.ts` (حوالی خط ۹۹-۱۱۷) |
| Z7 | **Low** | Enumeration در signup: پیام‌های 409 متفاوت برای "ایمیل در User موجود است" در برابر "ایمیل در صف تأیید SignupRequest است" به مهاجم ناشناس اجازه می‌دهد وضعیت یک ایمیل خاص را حدس بزند. | `src/app/api/auth/signup/route.ts:65-75` |
| Z8 | **Low** | دو GET side-effect دارند (نه صرفاً read): auto-generate کد معرف در `affiliate` GET و auto-persist امتیاز لید در `leads` GET. با `SameSite=Lax` از طریق top-level navigation قابل تریگر (تأثیر کم چون فقط داده‌ی خود کاربر لاگین‌شده را تغییر می‌دهد). | `src/app/api/affiliate/route.ts:46-49`, `src/app/api/leads/route.ts:105-108` |

## ۳. Input Validation (SQLi / XSS / CSRF)

| # | Severity | یافته | محل |
|---|---|---|---|
| I1 | — | **SQL Injection: ریسکی پیدا نشد.** هیچ استفاده‌ای از `$queryRaw`/`$executeRaw` در کل `src/` وجود ندارد؛ تمام دسترسی DB از طریق Prisma query builder است. | — |
| I2 | — | **XSS فعال پیدا نشد.** تنها `dangerouslySetInnerHTML` از config استاتیک توسعه‌دهنده تغذیه می‌شود (`chart.tsx:83`)، نه از داده‌ی کاربر. `react-markdown` برای رندر `lead.notes` استفاده می‌شود ولی بدون `rehype-raw`/`rehype-sanitize` — یعنی HTML خام در notes به‌صورت متن escape‌شده نمایش داده می‌شود، نه به‌عنوان HTML اجرا. **هشدار پیشگیرانه**: اگر در آینده `rehype-raw` اضافه شود، باید همراه `rehype-sanitize` باشد. | `src/components/crm/{sales-panel,leads-page,lead-detail-page}.tsx` |
| I3 | **Medium** | **CSRF**: بدون توکن CSRF در کل پروژه. اتکا کامل روی کوکی httpOnly + `SameSite=Lax` + الزام `Content-Type: application/json`. هیچ route ای هدر `Origin`/`Referer`/`X-Requested-With` را چک نمی‌کند. تکنیک‌های شناخته‌شده‌ی دور زدن CSRF با فرم HTML ساده (`enctype="text/plain"` + JSON) نظری قابل بررسی است، چون `Content-Type` هیچ‌جا قبل از `request.json()` اعتبارسنجی نمی‌شود. | همه‌ی route های POST/PUT/PATCH/DELETE |
| I4 | **Medium** | ~۴۷ از ۵۰ route فاقد zod یا هر لایه‌ی validation دیگر هستند (فقط ۳ route auth از zod استفاده می‌کنند). اعتبارسنجی فقط truthy-check ساده است؛ بدون محدودیت طول رشته، بدون allow-list مقادیر enum، بدون گارد NaN روی فیلدهای عددی (`Number(price)` بدون `isNaN` چک). | مثال‌ها: `leads/route.ts:137-157`, `tasks/route.ts:71-79`, `courses/route.ts:70-78`, `users/route.ts:125-133`, `interactions/route.ts:85-93` |
| I5 | **Medium** | آپلود CSV (`leads/import`) فقط پسوند فایل (`.csv`) را چک می‌کند، نه نوع محتوا/magic bytes؛ **بدون محدودیت حجم فایل** در کد یا `next.config.ts` — کل فایل قبل از هر اعتبارسنجی در حافظه بافر می‌شود؛ ردیف‌به‌ردیف بدون سقف تعداد ردیف پردازش می‌شود → مسیر DoS بالقوه با فایل بزرگ. | `src/app/api/leads/import/route.ts:21-32` |
| I6 | **Low** | خطای هر ردیف CSV import شامل متن خام `err.message` (احتمالاً جزئیات DB/Prisma) است که به کلاینت برگردانده می‌شود — تنها استثنا در الگوی یکدست "پیام عمومی + console.error" که در بقیه‌ی پروژه رعایت شده. | `src/app/api/leads/import/route.ts:98-101` |

## ۴. Secrets

| # | Severity | یافته | محل |
|---|---|---|---|
| S1 | **Critical** | `scripts/reset-password.ts` رمز عبور واقعی و ایمیل یک کاربر مشخص را هاردکد کرده و رمز جدید را در کنسول لاگ می‌کند. این یک credential نشت‌شده در تاریخچه‌ی گیت است. | `scripts/reset-password.ts:7-8,17` |
| S2 | **High** | `scripts/bootstrap-admin.ts` یک ایمیل/رمز پیش‌فرض هاردکد به‌عنوان fallback ادمین دارد اگر env var ست نشده باشد. | `scripts/bootstrap-admin.ts:8-9` |
| S3 | **Medium** | فایل `.env` از **همان Initial commit** در گیت tracked است (تأیید شد با `git ls-files`/`git log`)؛ قانون `.gitignore` (`.env*`, خط ۳۴) بعداً اضافه شده و به‌صورت retroactive این فایل را untrack نمی‌کند. محتوای فعلی `.env` شامل secret واقعی نیست (`DATABASE_URL` مسیر لوکال، بدون `SESSION_SECRET`/API key)، ولی **عادت commit کردن `.env`** ریسک فرآیندی است — هر secret جدیدی که بعداً به آن اضافه شود، در تاریخچه‌ی گیت ماندگار می‌شود. این مستقیماً برخلاف قانون صریح خود شما ("فایل .env یا هر secret را هرگز commit نکن") است، هرچند این عادت از قبل از این گفتگو در پروژه وجود داشته. | `.env` (tracked)، `.gitignore:34` |
| S4 | — | هیچ API key یا credential هاردکدشده‌ی دیگری در `src/` پیدا نشد. `GEMINI_API_KEY` درست از env خوانده می‌شود با fallback خالی امن. | — |

## ۵. Dependencies

`npm audit` (bun روی این محیط در دسترس نبود، از npm audit معادل استفاده شد) — همه‌ی یافته‌ها **moderate**، هیچ high/critical نیست:

| # | Severity | Package | جزئیات |
|---|---|---|---|
| D1 | Moderate | `js-yaml` (وابسته‌ی `@mdxeditor/editor`) | DoS با پیچیدگی درجه‌دوم در merge-key handling (GHSA-h67p-54hq-rp68). فیکس: ارتقا `@mdxeditor/editor` به ≥4.0.4 (semver-major). یادآوری: `@mdxeditor/editor` در `src/` اصلاً import نمی‌شود (یافته L2 در ISSUES.md) — ساده‌ترین رفع، حذف کامل این dependency بلااستفاده است. |
| D2 | Moderate | `postcss` (وابسته‌ی `next`) | XSS از طریق `</style>` escape‌نشده در CSS stringify (GHSA-qx2v-qp2m-jg93). فیکس در دست Next.js maintainers است (نیازمند ارتقای `next`). |
| D3 | Moderate | `prismjs` | آسیب‌پذیری DOM Clobbering (GHSA-x7hr-w5r2-h6wg). |
| D4 | Moderate | `next-auth` (وابسته `uuid`) | آسیب‌پذیری وابسته به `uuid`. چون `next-auth` اصلاً استفاده نمی‌شود (A8/L2)، حذف کامل dependency این ریسک را هم صفر می‌کند. |

**پیشنهاد سریع کم‌ریسک**: حذف دو dependency بلااستفاده (`next-auth`, `@mdxeditor/editor`) هم‌زمان کد را تمیزتر می‌کند و ۲ از ۴ آسیب‌پذیری را کاملاً حذف می‌کند — این یک تغییر کم‌ریسک است (چون هیچ import ی از این دو در `src/` وجود ندارد) و در فاز ۳ می‌تواند زودهنگام انجام شود، منتظر تأیید شما.

## ۶. File Upload / Rate Limiting / CORS-HTTPS

| # | Severity | یافته | محل |
|---|---|---|---|
| F1 | (تکرار I5) | بدون محدودیت حجم/نوع فایل واقعی روی آپلود CSV. | `src/app/api/leads/import/route.ts` |
| F2 | **High** | **بدون rate limiting در کل پروژه** — نه فقط لاگین؛ هیچ middleware یا لایه‌ی throttle برای هیچ endpoint ای وجود ندارد (تأیید شد: بدون `middleware.ts`، بدون کتابخانه‌ی rate-limit). | کل `src/app/api` |
| F3 | **Low** | بدون CORS policy صریح در `next.config.ts` (بدون تابع `headers()`)؛ چون اپ single-origin است (کلاینت و API روی همان دامنه) این خطر عملی محدودی دارد، ولی نبود CSP/`X-Frame-Options`/`Strict-Transport-Security` هم در `next.config.ts` و هم در `Caddyfile` قابل توجه است — کلیک‌جکینگ و برخی حملات مبتنی بر مرورگر بدون این هدرها راحت‌ترند. | `next.config.ts`, `Caddyfile` |
| F4 | **Critical** | S0 (بالا) — پراکسی پورت دلخواه در Caddyfile، مرتبط با همین دسته. | `Caddyfile:2-8` |

## ۷. Error Handling

| # | Severity | یافته | محل |
|---|---|---|---|
| E1 | — | الگوی غالب و درست در کل پروژه: `console.error` سمت سرور + پیام عمومی به کلاینت. بررسی شد روی ~۸۰ بلاک catch در ده‌ها فایل — یکدست. | همه‌ی route ها |
| E2 | **Low** | تنها استثنا: خطای هر ردیف در CSV import متن خام `err.message` را به کلاینت برمی‌گرداند (تکرار I6). | `src/app/api/leads/import/route.ts:98-101` |
| E3 | **Low** | بدون `error.tsx`/`global-error.tsx` سفارشی در `src/app` — اتکا کامل به رفتار پیش‌فرض Next.js در production (که stack trace را مخفی می‌کند، ولی این یک تضمین صریح پروژه نیست). | `src/app/` |
| E4 | **Low** | دو route (`auth/me`, `auth/logout`) اصلاً catch block ندارند — یک exception غیرمنتظره (مثلاً قطعی DB) بدون لاگ سمت سرور از این دو مسیر عبور می‌کند، برخلاف کانونشن بقیه‌ی پروژه. | `src/app/api/auth/me/route.ts`, `src/app/api/auth/logout/route.ts` |

## ۸. Logging

| # | Severity | یافته | محل |
|---|---|---|---|
| L1 | — | هیچ رمز عبور یا توکن سشن در هیچ `console.log`/`console.error`/`logActivity` پیدا نشد (بررسی کامل ۲۵ محل فراخوانی `logActivity` + گرپ سراسری `console.log`). | — |
| L2 | **Low** | چند description در `logActivity` شامل شماره تلفن (PII، نه credential) هستند — نکته‌ی data-minimization، نه نشت امنیتی جدی. | `leads/route.ts:269-273`, `leads/[id]/convert/route.ts:194-198` |
| L3 | **Low** | `logActivity` هیچ‌جا برای رویدادهای auth (login موفق/ناموفق، logout، signup) فراخوانی نمی‌شود — یعنی audit trail برای «چه کسی کِی لاگین/ثبت‌نام کرد» وجود ندارد؛ این هم یک gap در قابلیت رهگیری امنیتی است (نه نشت داده). | `src/app/api/auth/**` |

---

## جدول خلاصه بر اساس severity

**Critical (۳):** S0 (Caddy port proxy)، Z1 (بدون auth روی enrollments/[id]/payments)، S1 (رمز هاردکد در reset-password.ts)

**High (۷):** A1 (بدون rate limit لاگین)، A2 (timing enumeration)، A7 (DEMO_AUTH بک‌دور)، Z2 (باگ سیستمیک scope اشتباه)، S2 (fallback ادمین هاردکد)، F2 (بدون rate limit سراسری)

**Medium (۱۳):** A3–A6، I3–I5، Z3–Z5، S3، F3

**Low (~۱۶):** بقیه‌ی موارد جدول‌های بالا

---

## توصیه ترتیب رسیدگی در فاز ۳ (پیشنهادی، منتظر تأیید شما)

۱. **S0** — حذف/محدودسازی block پراکسی پورت دلخواه در Caddyfile (فوری، خارج از چرخه‌ی عادی چون production را الان تحت تأثیر قرار می‌دهد)
۲. **Z1** — افزودن auth/authorization به `enrollments/[id]/payments/route.ts`
۳. **S1/S2** — rotate و حذف رمزهای هاردکد از اسکریپت‌ها
۴. **Z2** — اصلاح باگ سیستمیک scope در ۵ فایل
۵. **A1/F2** — افزودن rate limiting حداقلی روی لاگین (و در ادامه سایر endpointهای حساس)
۶. بقیه بر اساس severity، در commitهای جداگانه طبق قانون شما

منتظر تأیید شما برای شروع فاز ۳ هستم.
