# گزارش آمادگی CRM برای دیپلوی روی سرور

تاریخ بررسی: ۲۰ تیر ۱۴۰۵ / 2026-07-10  
مسیر پروژه: `/home/sina/CRM`  
هدف: انجام build روی سیستم توسعه، انتقال artifact آماده به سرور با ۲ گیگابایت RAM، اتصال دامنه و فراهم‌کردن دسترسی production به CRM.

## نتیجه اجرایی

پیاده‌سازی آمادگی deployment تکمیل شده و یک release نهایی، versioned و دارای checksum ساخته شده است. این release شامل Next.js standalone، migration runner مستقل، migration اولیه، systemd units، ابزار bootstrap ادمین، backup آنلاین SQLite، تنظیم Caddy و راهنمای install/rollback است.

فایل نهایی تولیدشده:

```text
dist/amin-crm-20260710T205314Z-139ebc3-dirty.tar.gz
dist/amin-crm-20260710T205314Z-139ebc3-dirty.tar.gz.sha256
```

پسوند `dirty` به این معناست که release از تغییرات محلی هنوز commit‌نشده ساخته شده است. قبل از انتقال رسمی بهتر است تغییرات review و commit شوند و یک release نهایی بدون این پسوند ساخته شود.

مشکل محدودیت RAM سرور با ساخت خروجی standalone روی سیستم توسعه حل شده است. تست نهایی نشان داد اجرای برنامه پس از درخواست‌های health/login حدود ۱۴۵ مگابایت RSS مصرف می‌کند؛ بنابراین سرور ۲ گیگابایتی برای یک instance برنامه، Caddy و SQLite مناسب است.

## خلاصه اولویت‌ها

| اولویت | مشکل | سطح اطمینان | اثر روی دیپلوی |
| --- | --- | --- | --- |
| ۱ | نصب dependency قابل تکرار | رفع‌شده | `npm ci` و Bun frozen lock هر دو تأیید شدند؛ Next/Prisma دقیق pin شده‌اند. |
| ۲ | migration و persistence | رفع‌شده | migration اولیه، runner مستقل و مسیر persistent `/var/lib/amin-crm` اضافه شد. |
| ۳ | پورت Caddy و برنامه | رفع‌شده | backend و Caddy روی `127.0.0.1:3005` هماهنگ شدند. |
| ۴ | سازگاری platform سرور | نیازمند بررسی سرور | artifact فعلی برای Linux x86_64 و Prisma OpenSSL 3 ساخته شده است. |
| ۵ | systemd، backup و rollback | رفع‌شده | unitها، installer اتمیک، backup آنلاین و راهنمای rollback اضافه شدند. |
| ۶ | دامنه و HTTPS | نیازمند اجرای سرور | DNS موجود است؛ پاسخ نهایی فقط پس از نصب و reload شدن Caddy قابل تأیید است. |
| ۷ | reminder worker | رفع‌شده/اختیاری | worker داخل release است و فقط بعد از تنظیم webhook واقعی باید enable شود. |
| ۸ | dependency audit | کاهش‌یافته | موارد production از ۶ moderate به ۲ مورد transitive در Next/PostCSS کاهش یافت. |

## اعتبارسنجی‌های انجام‌شده

### نصب dependencyها

در بررسی اولیه `npm ci` با خطای زیر ناموفق بود:

```text
Missing: @swc/helpers@0.5.23 from lock file
```

پس از pin کردن نسخه‌ها و regenerate کردن هر دو lockfile، `npm ci` از صفر با موفقیت اجرا شد. Bun lock نیز با `--frozen-lockfile --lockfile-only` بررسی شد و hash آن تغییر نکرد.

### Prisma Client

در اولین اجرای TypeScript compiler تعداد زیادی خطای زنجیره‌ای درباره نبود enumها و modelهای `@prisma/client` مشاهده شد. علت، تولید نشدن Prisma Client بود.

پس از اجرای دستور زیر:

```bash
prisma generate
```

تمام خطاهای TypeScript برطرف شدند و typecheck موفق بود. در pipeline نهایی باید `prisma generate` صریحاً قبل از typecheck و build اجرا شود.

### lint و typecheck

نتایج تازه:

```text
npm run lint                 PASS
tsc --noEmit                 PASS (پس از prisma generate)
```

گزینه `typescript.ignoreBuildErrors` حذف شده است. اکنون هم مرحله مستقل `npm run typecheck` و هم TypeScript داخلی `next build` باید موفق شوند.

### build production

build production با موفقیت انجام شد:

```text
Next.js 16.2.10
Compiled successfully
Generated static pages: 41/41
```

خروجی standalone به‌درستی شامل موارد زیر بود:

- `server.js`
- dependencyهای runtime موردنیاز Next.js
- Prisma Client و query engine
- فایل‌های `.next/static`
- پوشه `public`

### smoke test خروجی standalone

خروجی standalone فقط با Node.js، بدون اجرای سورس اصلی، روی `127.0.0.1:3105` اجرا شد.

| مسیر | نتیجه |
| --- | --- |
| `/` | HTTP 200 |
| `/api/public/courses` | HTTP 200 و پاسخ `[]` روی دیتابیس خالی |
| `/api/auth/me` | HTTP 200 و `{"user":null}` |
| `/api/auth/demo-users` با `DEMO_AUTH=0` | HTTP 404، مطابق انتظار |
| `/api/health` روی release نهایی | HTTP 200 و `database: ok` |
| `/api/auth/login` با ادمین bootstrap‌شده | HTTP 200 |
| `/api/ai/diagnostic` بدون SALES_AGENT | HTTP 200 و ثبت lead بدون FK نامعتبر |
| migration CLI داخل archive | migration اولیه اعمال شد و schema up to date بود |
| backup آنلاین هنگام اجرای برنامه | فایل gzip و SHA-256 معتبر ساخته شد |

هدرهای امنیتی زیر نیز در پاسخ مشاهده شدند:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy`
- `Strict-Transport-Security`

### اندازه و مصرف منابع

| مورد | مقدار تقریبی |
| --- | --- |
| فایل tar.gz نهایی همراه migration CLI | ۸۸ مگابایت |
| release استخراج‌شده همراه ابزارهای ops | حدود ۲۶۵ مگابایت |
| RAM برنامه پس از smoke test | حدود ۱۴۵ مگابایت RSS |

نتیجه: build باید خارج از سرور انجام شود، اما اجرای یک instance روی سرور ۲GB عملی است. برای جلوگیری از فشار حافظه، فقط یک instance برنامه و یک worker محدود اجرا شود و swap کوچک نیز روی سرور در نظر گرفته شود.

## ۱. مشکل lockfile و قابل‌تکرار نبودن build

نسخه‌های حساس اکنون دقیق pin شده‌اند:

- Next.js: `16.2.10`
- Prisma و `@prisma/client`: `6.19.3`
- `eslint-config-next`: `16.2.10`

هر دو lockfile بازتولید و اعتبارسنجی شده‌اند. `build:release` با Bun frozen install در صورت موجود بودن Bun و با `npm ci` به‌عنوان fallback کار می‌کند.

### راه‌حل

1. یک package manager به‌عنوان مبنای release انتخاب شود.
2. هر دو lockfile مطابق قانون فعلی مخزن با نسخه‌های دقیق یکسان regenerate شوند.
3. نصب release فقط با frozen lockfile انجام شود.
4. ترتیب pipeline به شکل زیر باشد:

```text
install --frozen-lockfile
prisma generate
lint
tsc --noEmit
next build
standalone smoke test
package release
```

5. نسخه‌های اصلی Next.js، Prisma و `@prisma/client` ترجیحاً دقیق pin شوند یا تغییر آن‌ها فقط از طریق lockfile review انجام شود.

## ۲. وضعیت دیتابیس SQLite

پروژه از Prisma همراه SQLite استفاده می‌کند:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

اکنون migration اولیه در `prisma/migrations/20260710201548_init` وجود دارد و روی یک دیتابیس تازه از داخل release نهایی با موفقیت اعمال شده است. دیتابیس production عمداً در مخزن و release قرار نمی‌گیرد و روی سرور در `/var/lib/amin-crm/custom.db` ساخته یا منتقل می‌شود.

اسکریپت قدیمی `.zscripts/build.sh` انتظار دارد `db/custom.db` وجود داشته باشد و در غیر این صورت build package را متوقف می‌کند. قرار دادن دیتابیس داخل release نیز خطرناک است؛ چون deploy بعدی ممکن است دیتابیس production را با نسخه خالی یا قدیمی جایگزین کند.

### معماری صحیح persistence

دیتابیس باید خارج از پوشه release نگهداری شود:

```text
/var/lib/amin-crm/custom.db
```

و برنامه از این مقدار استفاده کند:

```env
DATABASE_URL=file:/var/lib/amin-crm/custom.db
```

ساختار پیشنهادی سرور:

```text
/opt/amin-crm/
├── current -> releases/2026-07-10-001
└── releases/
    └── 2026-07-10-001/
        ├── server.js
        ├── node_modules/
        ├── public/
        └── .next/

/var/lib/amin-crm/
└── custom.db

/etc/amin-crm.env
```

### migration

برای production نباید `prisma db push` به‌صورت دائمی و بدون سابقه migration استفاده شود.

پیشنهاد:

1. migration اولیه در محیط توسعه ساخته شود.
2. اگر دیتابیس واقعی موجود است، ابتدا baseline شود.
3. برای نسخه‌های بعدی فقط `prisma migrate deploy` اجرا شود.
4. قبل از هر migration از دیتابیس backup سازگار گرفته شود.

### bootstrap ادمین

اسکریپت `scripts/bootstrap-admin.ts` credential را از این متغیرها می‌گیرد:

```env
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

اما این اسکریپت داخل standalone نهایی وجود ندارد. بنابراین یکی از این دو روش باید انتخاب شود:

- دیتابیس اولیه روی builder ساخته، schema روی آن اعمال و ادمین bootstrap شود؛ سپس DB فقط در اولین deploy منتقل شود.
- یک ops bundle محدود شامل Prisma schema و ابزار bootstrap جداگانه ساخته شود.

`ADMIN_PASSWORD` نباید بعد از bootstrap در environment دائمی سرور باقی بماند.

### backup دیتابیس

کپی ساده فایل DB هنگام فعال بودن برنامه ممکن است snapshot ناسازگار ایجاد کند، به‌خصوص در صورت فعال شدن WAL. گزینه‌های مناسب:

- دستور `.backup` در SQLite CLI
- `VACUUM INTO`
- SQLite Online Backup API
- توقف کوتاه سرویس و سپس کپی فایل، در صورتی که downtime پذیرفته باشد

backup باید خارج از همان دیسک یا حداقل در storage جداگانه نگهداری شود و restore آن نیز آزمایش شود.

## ۳. مشکلات اسکریپت‌های فعلی build و start

اسکریپت `.zscripts/build.sh` برای محیط دیگری نوشته شده و این مسیر ثابت را دارد:

```text
/home/z/my-project
```

این مسیر در سیستم فعلی صحیح نیست. همین اسکریپت DB آزمایشی را نیز داخل artifact کپی می‌کند که برای production مناسب نیست.

اسکریپت `.zscripts/start.sh` نیز:

- دیتابیس پیش‌فرض را `/app/db/custom.db` فرض می‌کند.
- `PORT=3000` را پیش‌فرض می‌گذارد.
- برنامه را با Bun اجرا می‌کند.
- Caddy را در همان process tree برنامه اجرا می‌کند.
- در صورت extract شدن release خارج از `/app` دیتابیس را پیدا نمی‌کند.

### راه‌حل

اسکریپت‌های قدیمی باید با release pipeline جدید جایگزین شوند:

- build فقط artifact برنامه را بسازد.
- دیتابیس را هرگز داخل releaseهای بعدی کپی نکند.
- Caddy و Next.js دو سرویس جدا باشند.
- برنامه با Node.js اجرا شود؛ standalone نیازی به Bun روی سرور ندارد.
- systemd مدیریت restart، signal و log را انجام دهد.

## ۴. Caddy، پورت و دامنه

`Caddyfile` فعلی:

```caddyfile
crm.amin-inst.ac.ir {
    reverse_proxy localhost:3005
}
```

اما start script برنامه را به‌صورت پیش‌فرض روی 3000 اجرا می‌کند. نتیجه احتمالی، خطای `502 Bad Gateway` از Caddy خواهد بود.

همچنین backend نباید روی `0.0.0.0` bind شود؛ در غیر این صورت در صورت باز بودن firewall، کاربران می‌توانند Caddy و HTTPS را دور بزنند.

### تنظیم پیشنهادی runtime

```env
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=3005
DATABASE_URL=file:/var/lib/amin-crm/custom.db
DEMO_AUTH=0
GEMINI_API_KEY=...
```

### معماری شبکه پیشنهادی

```text
Internet
   │
   ▼
Caddy :80 / :443
   │  HTTPS termination
   ▼
Next.js standalone 127.0.0.1:3005
   │
   ▼
/var/lib/amin-crm/custom.db
```

پورت 3005 باید در firewall عمومی بسته باشد. فقط 22، 80 و 443 بر اساس نیاز مدیریت سرور باز بمانند.

### وضعیت دامنه در زمان بررسی

دامنه زیر:

```text
crm.amin-inst.ac.ir
```

به IP زیر resolve شد:

```text
185.204.168.11
```

اتصال TCP به پورت‌های 80 و 443 برقرار شد، اما درخواست HTTP و TLS handshake در زمان بررسی timeout شدند. قبل از deploy باید تأیید شود:

1. این IP همان سرور مقصد است.
2. Caddy واقعاً روی 80 و 443 در حال اجراست.
3. NAT یا firewall ترافیک را به همان سرور هدایت می‌کند.
4. هیچ وب‌سرور دیگری پورت‌ها را اشغال نکرده است.
5. DNS قبل از درخواست certificate به IP صحیح اشاره می‌کند.

## ۵. سازگاری artifact با سرور

build آزمایشی روی این platform انجام شد:

```text
Linux x86_64
Ubuntu
glibc 2.43
Node.js 22.22.1
```

artifact شامل Prisma engine زیر بود:

```text
libquery_engine-debian-openssl-3.0.x.so.node
```

بنابراین انتقال مستقیم فقط وقتی قابل اتکاست که سرور مقصد از نظر معماری و کتابخانه‌های native سازگار باشد.

قبل از release باید روی سرور بررسی شود:

```bash
uname -m
cat /etc/os-release
openssl version
node --version
```

حداقل Node.js موردنیاز نسخه فعلی Next.js برابر `>=20.9.0` است. Node.js 22 LTS انتخاب مناسبی برای سرور است.

اگر سرور ARM64، Alpine یا platform متفاوتی دارد، یکی از این روش‌ها لازم است:

- build روی یک محیط مشابه سرور
- افزودن `binaryTargets` مناسب Prisma
- ساخت Docker image برای platform دقیق مقصد با Buildx

## ۶. مدیریت process در production

سه unit مربوط به systemd اضافه شده‌اند:

- `amin-crm-migrate.service`
- `amin-crm.service`
- `amin-crm-reminder.service` (اختیاری و پیش‌فرض غیرفعال)

پیشنهاد اصلی برای سرور ۲GB، اجرای standalone با systemd است؛ چون نسبت به Docker ساده‌تر است و overhead کمتری دارد.

خصوصیات موردنیاز سرویس:

- اجرای برنامه با یک user غیر root
- `WorkingDirectory` روی release جاری
- خواندن environment از `/etc/amin-crm.env`
- `Restart=always` یا `on-failure`
- محدودیت restart loop
- log از طریق journald
- دسترسی write فقط به مسیر دیتابیس و مسیرهای ضروری
- اجرای `node server.js` بدون pipeline به `tee`

از `server.log` بدون rotation نباید استفاده شود؛ چون logهای دائمی می‌توانند فضای دیسک را پر کنند.

## ۷. logging و Prisma

Prisma Client در production اکنون فقط خطاها را log می‌کند:

```ts
new PrismaClient({
    log: ['error'],
})
```

query logging فقط در development فعال باقی مانده است و logهای production توسط journald مدیریت می‌شوند.

## ۸. امنیت و dependencyها

### DEMO_AUTH

`DEMO_AUTH` باید همیشه در production برابر صفر باشد:

```env
DEMO_AUTH=0
```

smoke test تأیید کرد که در این حالت endpoint کاربران دمو قابل دسترسی نیست.

### dependency audit

دستور زیر اجرا شد:

```bash
npm audit --omit=dev
```

دو dependency بلااستفاده `next-intl` و `react-syntax-highlighter` حذف شدند. نتیجه نهایی production audit:

```text
moderate: 2
high: 0
critical: 0
```

دو مورد باقی‌مانده مربوط به زنجیره Next.js/PostCSS هستند و npm در نسخه فعلی fix سازگار ارائه نمی‌کند.

قبل از production باید نسخه‌های lockشده بررسی و بدون استفاده از `audit fix --force` به نسخه‌های امن ارتقا داده شوند؛ گزینه `--force` ممکن است dependencyهای اصلی را به نسخه ناسازگار downgrade یا upgrade کند.

### rate limiting

rate limiter فعلی in-memory است. برای یک instance قابل استفاده است، ولی:

- با restart شدن برنامه reset می‌شود.
- در چند instance مشترک نیست.
- نباید چند replica بدون Redis یا storage مشترک راه‌اندازی شود.

با توجه به سرور ۲GB، فعلاً یک instance مناسب است.

### تست دسترسی نقش‌ها

قبل از عمومی کردن CRM باید مسیرهای حساس با accountهای نمونه بررسی شوند:

- ADMIN
- SALES_MANAGER
- SALES_AGENT
- DEPT_MANAGER
- FINANCIAL_OFFICER
- EDUCATION_OFFICER
- STUDENT

به‌خصوص عملیات export، payments، enrollments، users، lead assignment و password reset باید تست شوند.

## ۹. سرویس reminder worker

فایل `src/cron/reminder-worker.js` یک loop مستقل یک‌دقیقه‌ای دارد، ولی package start و standalone آن را اجرا نمی‌کنند.

مشکلات فعلی:

1. مسیر `.env` را بر اساس محل سورس محاسبه می‌کند.
2. در صورت نبود متغیرها، فایل `.env` را تغییر می‌دهد.
3. URL پیش‌فرض آن `/api/webhooks/reminders` است، ولی چنین routeای در پروژه وجود ندارد.
4. پس از شکست webhook نیز `reminder_sent=true` ثبت می‌کند.
5. worker داخل artifact standalone نیست.

اگر reminderها برای نسخه اول ضروری نیستند، worker نباید فعال شود. اگر ضروری‌اند، باید ابتدا اصلاح و سپس به‌عنوان systemd service جدا deploy شود.

## ۱۰. قابلیت‌های AI

متغیر زیر اختیاری است:

```env
GEMINI_API_KEY=...
```

اگر تنظیم نشود، سیستم پاسخ‌های mock تولید می‌کند. این رفتار ممکن است برای کاربر نهایی مانند پاسخ واقعی AI دیده شود. قبل از production باید مشخص شود:

- AI فعال است و API key معتبر دارد؛ یا
- قابلیت AI به‌وضوح در UI به‌عنوان mock/غیرفعال نمایش داده شود.

همچنین public diagnostic endpoint در دیتابیس تازه، در صورت نبود کارشناس فروش فعال، ممکن است هنگام ساخت interaction با `agent_id='system'` شکست بخورد. قبل از فعال کردن آن باید حداقل یک SALES_AGENT فعال ساخته شود یا منطق fallback اصلاح شود.

## طرح پیشنهادی release

### مرحله ۱: اصلاح pipeline محلی

```text
sync lockfiles
install frozen dependencies
prisma generate
lint
typecheck
production build
standalone smoke test
tar release
checksum release
```

### مرحله ۲: آماده‌سازی سرور

موارد موردنیاز:

- Node.js 22 LTS
- Caddy
- SQLite CLI برای backup و عملیات مدیریتی
- user اختصاصی مانند `amin-crm`
- پوشه `/opt/amin-crm/releases`
- پوشه writable `/var/lib/amin-crm`
- فایل محافظت‌شده `/etc/amin-crm.env`
- systemd unit برای برنامه
- firewall با دسترسی عمومی فقط به 80/443

### مرحله ۳: دیتابیس

برای اولین deploy:

1. DB جدید ساخته شود یا DB موجود منتقل شود.
2. schema/migration اعمال شود.
3. admin bootstrap شود.
4. login اولیه آزمایش شود.
5. backup پایه گرفته شود.

برای deployهای بعدی:

1. backup سازگار گرفته شود.
2. migration اعمال شود.
3. release جدید فعال شود.
4. DB هرگز با فایل داخل artifact جایگزین نشود.

### مرحله ۴: انتقال و فعال‌سازی اتمیک

پیشنهاد:

```text
upload release.tar.gz
verify checksum
extract into releases/<release-id>
switch current symlink
restart amin-crm.service
run smoke tests
```

اگر smoke test شکست خورد، symlink به release قبلی برگردد. rollback کد نباید دیتابیس را بدون بررسی migration rollback کند.

### مرحله ۵: Caddy و HTTPS

1. اجرای backend روی `127.0.0.1:3005` تأیید شود.
2. Caddyfile validate شود.
3. Caddy reload شود.
4. certificate issuance و redirect HTTP به HTTPS بررسی شود.
5. کوکی login، API و فایل‌های static از طریق دامنه آزمایش شوند.

## چک‌لیست go-live

### Build

- [ ] lockfileها همگام و معتبر هستند.
- [ ] نصب frozen dependency موفق است.
- [ ] `prisma generate` موفق است.
- [ ] lint پاس است.
- [ ] typecheck پاس است.
- [ ] build پاس است.
- [ ] standalone smoke test پاس است.
- [ ] artifact با platform سرور سازگار است.

### Database

- [ ] DB خارج از release قرار دارد.
- [ ] migration history یا baseline آماده است.
- [ ] admin production ساخته شده است.
- [ ] permission پوشه DB صحیح است.
- [ ] backup و restore آزمایش شده است.

### Runtime

- [ ] Node.js سازگار نصب است.
- [ ] برنامه با user غیر root اجرا می‌شود.
- [ ] `HOSTNAME=127.0.0.1` است.
- [ ] `PORT=3005` است.
- [ ] `DEMO_AUTH=0` است.
- [ ] systemd restart policy فعال است.
- [ ] log rotation/journald محدود شده است.
- [ ] پورت backend از اینترنت بسته است.

### Domain and HTTPS

- [ ] DNS به IP صحیح سرور اشاره می‌کند.
- [ ] پورت‌های 80 و 443 باز هستند.
- [ ] Caddy به backend صحیح وصل می‌شود.
- [ ] certificate معتبر صادر شده است.
- [ ] HTTP به HTTPS redirect می‌شود.
- [ ] login cookie در HTTPS کار می‌کند.

### Application

- [ ] login ادمین موفق است.
- [ ] نقش‌های اصلی تست شده‌اند.
- [ ] عملیات ایجاد و ویرایش داده تست شده است.
- [ ] exportها تست شده‌اند.
- [ ] password reset تست شده است.
- [ ] public lead form تست شده است.
- [ ] AI یا با API key فعال است یا وضعیت mock آن مشخص شده است.
- [ ] وضعیت reminder worker تعیین تکلیف شده است.

## جمع‌بندی نهایی

Core برنامه، Next.js standalone، migration، Prisma/SQLite، bootstrap admin، health endpoint، login، غیرفعال‌بودن demo auth و backup آنلاین همگی از داخل archive نهایی smoke-test شدند. سرور ۲ گیگابایتی برای اجرای یک instance کافی است و هیچ build یا نصب dependency روی سرور لازم نیست.

کارهای باقی‌مانده همگی وابسته به سرور یا اطلاعات production هستند:

1. بررسی `uname -m`، توزیع Linux، OpenSSL و مسیر `/usr/bin/node` روی سرور
2. commit/review تغییرات و ساخت یک release بدون پسوند `dirty`
3. انتقال archive و checksum به سرور و اجرای installer
4. تنظیم `/etc/amin-crm.env` و credentialهای واقعی
5. bootstrap ادمین production و سپس حذف متغیرهای موقت آن
6. نصب/validate کردن Caddyfile و بررسی HTTPS دامنه
7. تست نقش‌های واقعی و مسیرهای حساس با داده production
8. تصمیم درباره `GEMINI_API_KEY` و فعال‌سازی اختیاری reminder webhook

راهنمای دقیق اجرای این مراحل در `deploy/README.md` قرار دارد.

برای اولین نصب روی Debian/Ubuntu می‌توان `deploy/server-setup.sh` را همراه archive و checksum روی سرور کپی کرد. این اسکریپت نصب dependencyهای سیستم، migration، bootstrap ادمین، systemd، Caddy و health-check دامنه `crm.amin-inst.ac.ir` را یکجا انجام می‌دهد.

## منابع رسمی

- [Next.js deployment و standalone output](https://nextjs.org/docs/app/getting-started/deploying)
- [Prisma generator و binary targets](https://docs.prisma.io/docs/orm/v6/prisma-schema/overview/generators)
- [Prisma migrate deploy](https://docs.prisma.io/docs/cli/migrate/deploy)
- [Prisma deployment migrations](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-migrations-from-a-local-environment)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [SQLite Online Backup API](https://www.sqlite.org/backup.html)
