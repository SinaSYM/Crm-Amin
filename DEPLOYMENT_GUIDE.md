# راهنمای استقرار (Deployment Guide) — CRM موسسه امین

نسخه: 1.0  
تاریخ: ۱۴۰۵/۰۴/۲۰

---

## معماری استقرار پیشنهادی برای ایران

```
┌─────────────────────────────────────────────────────────────────┐
│                        اینترنت / CDN                            │
│                  (Cloudflare / ArvanCloud / IranCDN)            │
└─────────────────────────────┬───────────────────────────────────┘
                              │ HTTPS (TLS 1.3)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Load Balancer / Reverse Proxy (Nginx / Traefik / Caddy)        │
│  - SSL Termination                                              │
│  - Rate Limiting (WAF)                                          │
│  - Static Asset Caching                                         │
│  - Gzip/Brotli Compression                                      │
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
│  - Connection Pooling: PgBouncer                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Background Workers (PM2 / Systemd)                 │
│  - Reminder Worker (Cron)          - AI Queue Processor         │
│  - Email/SMS Dispatcher            - Report Generator           │
│  - Webhook Handler                 - Backup Job                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## پیش‌نیازهای سرور

### حداقل (Minimal / MVP)
| جزء | مشخصات |
|------|---------|
| **CPU** | 2 vCPU |
| **RAM** | 4 GB |
| **Storage (SSD/NVMe)** | 50 GB |
| **PostgreSQL** | 1 vCPU, 2 GB (Managed) |
| **Redis** | 512 MB (Managed) |
| **Bandwidth** | 1 TB/ماه |
| **SSL** | Let's Encrypt (Auto) |
| **Monitoring** | UptimeRobot (Free) |
| **CDN** | Cloudflare Free / ArvanCloud Free |

### متوسط (Standard / Growth)
| جزء | مشخصات |
|------|---------|
| **CPU** | 4 vCPU |
| **RAM** | 8 GB |
| **Storage** | 100 GB NVMe |
| **PostgreSQL** | 2 vCPU, 4 GB (Managed HA) |
| **Redis** | 1 GB (Cluster) |
| **Bandwidth** | 5 TB/ماه |
| **SSL** | Wildcard (Iran Cert) |
| **Monitoring** | Prometheus + Grafana |
| **CDN** | ArvanCloud Pro |

### پیشرفته (Enterprise / Scale)
| جزء | مشخصات |
|------|---------|
| **CPU** | 8+ vCPU (Multi-instance) |
| **RAM** | 16+ GB |
| **Storage** | 200+ GB (RAID) |
| **PostgreSQL** | 4 vCPU, 16 GB (Patroni HA Cluster) |
| **Redis** | 4 GB (Cluster) |
| **Bandwidth** | Unmetered / 10+ TB |
| **SSL** | EV + WAF |
| **Monitoring** | Zabbix/Grafana + Alerting |
| **CDN** | IranCDN Enterprise |
| **Object Storage** | S3 Compatible (5 TB) برای آرشیو کلاس‌ها |

---

## متغیرهای محیطی (.env)

### الزامی (Required)

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/crm?schema=public&sslmode=require"

# Auth
JWT_SECRET="your-super-secret-jwt-key-minimum-32-characters-long"
NEXTAUTH_URL="https://your-domain.com"

# Production flags
NODE_ENV="production"
DEMO_AUTH="0"  # همیشه 0 در تولید
```

### پیشنهادی (Recommended)

```bash
# AI (اختیاری - بدون آن Mock برمی‌گرداند)
GEMINI_API_KEY="your-google-gemini-api-key"

# Redis (برای Session/Cache در مقیاس بزرگ)
REDIS_URL="redis://user:pass@redis-host:6379"

# Email (برای تیکت‌ها، یادآوری‌ها)
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_USER="noreply@your-domain.com"
SMTP_PASS="your-smtp-password"
EMAIL_FROM="CRM امین <noreply@your-domain.com>"

# SMS (برای یادآوری‌ها - کاوه‌نگار، ملی‌پیام، ایده‌پردازان)
SMS_PROVIDER="kavenegar"  # یا melipayamak, idehpayamak
SMS_API_KEY="your-sms-api-key"
SMS_SENDER="1000xxxxxx"
```

### Reminder Worker (اجرا در سرور جداگانه یا همون سرور)

```bash
# Required for worker
DATABASE_URL="postgresql://user:pass@host:5432/crm?schema=public"
REMINDER_WEBHOOK_URL="https://your-domain.com/api/webhooks/reminder"
REMINDER_WEBHOOK_METHOD="POST"
REMINDER_WEBHOOK_HEADERS='{"Content-Type":"application/json","Authorization":"Bearer your-webhook-secret"}'
REMINDER_WEBHOOK_PAYLOAD_TEMPLATE='{"recipient_phone":"{recipient_phone}","title":"{title}","due_date":"{due_date}","description":"{description}"}'
REMINDER_POLL_INTERVAL_MS=60000
```

### مقیاس بزرگ (Enterprise)

```bash
# Object Storage (S3 Compatible - برای آرشیو کلاس‌ها، بکاپ‌ها)
S3_ENDPOINT="https://s3.ir-thr-at1.arvanstorage.ir"
S3_ACCESS_KEY="your-access-key"
S3_SECRET_KEY="your-secret-key"
S3_BUCKET="crm-backups"
S3_REGION="ir-thr-at1"

# Monitoring
SENTRY_DSN="https://xxx@sentry.io/xxx"  # Error tracking
PROMETHEUS_URL="http://prometheus:9090"  # Metrics

# Backup
BACKUP_ENCRYPTION_KEY="your-32-char-aes-key"
BACKUP_S3_BUCKET="crm-backups-encrypted"
```

---

## بیلد و استقرار

### ۱. بیلد Standalone (تولید)

```bash
# در محیط CI/CD یا سرور بیلد
bun run build

# خروجی در .next/standalone
# ساختار:
.next/standalone/
├── server.js              # Entry point
├── package.json
├── node_modules/          # فقط production dependencies
├── .next/
│   ├── static/            # Static assets
│   └── server/            # Server bundles
└── public/                # Public assets
```

### ۲. کپی به سرور

```bash
# از طریق rsync/scp
rsync -avz .next/standalone/ user@server:/var/www/crm/
rsync -avz public/ user@server:/var/www/crm/public/
rsync -avz .env user@server:/var/www/crm/.env

# یا Docker (ترجیح داده شده)
docker build -t amin-crm:latest .
docker save amin-crm:latest | ssh user@server "docker load"
```

### ۳. Docker (توصیه شده)

**Dockerfile (ریشه پروژه):**
```dockerfile
# Base image
FROM oven/bun:1.1-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Production runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:16-alpine
    env_file:
      - .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    restart: unless-stopped

  # Reminder Worker
  scheduler:
    build: .
    command: node src/cron/reminder-worker.js
    env_file:
      - .env
    restart: unless-stopped
    depends_on:
      - postgres
    deploy:
      resources:
        limits:
          memory: 512M

volumes:
  postgres_data:
  redis_data:
```

```bash
# اجرا
docker-compose -f docker-compose.yml up -d

# لاگ‌ها
docker-compose logs -f app
docker-compose logs -f scheduler
```

---

## Reverse Proxy (Nginx / Caddy)

### Caddy (ساده‌ترین - SSL خودکار)

**Caddyfile:**
```caddy
your-domain.com {
    # Reverse proxy به Next.js
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
    }

    # Rate limiting (basic)
    rate_limit {
        zone api_limit 10r/s
        key {remote}
    }

    # Compression
    encode zstd gzip

    # Static files caching
    @static {
        path /_next/static/*
        path /public/*
    }
    header @static Cache-Control "public, max-age=31536000, immutable"
}
```

```bash
# نصب Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install caddy

# کپی Caddyfile
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

### Nginx (کنترل بیشتر)

**/etc/nginx/sites-available/crm:**
```nginx
upstream crm_backend {
    server 127.0.0.1:3000;
    # برای مقیاس‌پذیری:
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL (Let's Encrypt via Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml application/json;

    # Proxy
    location / {
        proxy_pass http://crm_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
        proxy_send_timeout 90s;
    }

    # Static files
    location /_next/static/ {
        alias /var/www/crm/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /public/ {
        alias /var/www/crm/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check (no rate limit)
    location /api/health {
        limit_req zone=api_limit burst=5 nodelay;
        proxy_pass http://crm_backend;
        proxy_set_header Host $host;
    }
}
```

```bash
# فعال‌سازی
sudo ln -s /etc/nginx/sites-available/crm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL با Certbot
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## Process Management (PM2 / Systemd)

### PM2 (برای Next.js App)

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'crm-app',
      script: './server.js',
      cwd: '/var/www/crm',
      instances: 'max',  // یا تعداد CPU
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_file: '.env',
      error_file: '/var/log/crm/error.log',
      out_file: '/var/log/crm/out.log',
      log_file: '/var/log/crm/combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 5000,
      watch: false,
    },
    {
      name: 'crm-scheduler',
      script: 'src/cron/reminder-worker.js',
      cwd: '/var/www/crm',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      env_file: '.env',
      error_file: '/var/log/crm/scheduler-error.log',
      out_file: '/var/log/crm/scheduler-out.log',
      time: true,
      restart_delay: 10000,
    },
  ],
}
```

```bash
# نصب PM2
npm install -g pm2

# اجرا
pm2 start ecosystem.config.js

# ذخیره برای boot
pm2 startup
pm2 save

# مانیتورینگ
pm2 monit
pm2 logs crm-app
pm2 logs crm-scheduler
```

### Systemd (ساده‌تر، بدون PM2)

**/etc/systemd/system/crm-app.service:**
```ini
[Unit]
Description=CRM Next.js Application
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/crm
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/crm/.env
StandardOutput=append:/var/log/crm/app.log
StandardError=append:/var/log/crm/app-error.log

[Install]
WantedBy=multi-user.target
```

**/etc/systemd/system/crm-scheduler.service:**
```ini
[Unit]
Description=CRM Reminder Worker
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/crm
ExecStart=/usr/bin/node src/cron/reminder-worker.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/var/www/crm/.env
StandardOutput=append:/var/log/crm/scheduler.log
StandardError=append:/var/log/crm/scheduler-error.log

[Install]
WantedBy=multi-user.target
```

```bash
# دایرکتوری لاگ
sudo mkdir -p /var/log/crm
sudo chown www-data:www-data /var/log/crm

# فعال‌سازی
sudo systemctl daemon-reload
sudo systemctl enable crm-app crm-scheduler
sudo systemctl start crm-app crm-scheduler
sudo systemctl status crm-app crm-scheduler
```

---

## دیتابیس PostgreSQL (تولید)

### Managed Services در ایران

| سرویس | مزایا | لینک |
|--------|-------|------|
| **Liara** | ساده، پلاگین بکاپ، SSL خودکار | liara.ir |
| **ArvanCloud** | شبکه ایران، CDN یکپارچه | arvancloud.ir |
| **Pishgaman** | پشتیبانی tốt، مقیاس‌پذیر | pishgaman.net |
| **AbrCloud** | کubernets-native | abrcloud.com |
| **IranServer** | ارزان،sible | iranserver.com |

### کانفیگ پیشنهادی PostgreSQL

```sql
-- در psql یا pgAdmin
-- ایجاد دیتابیس و یوزر اختصاصی
CREATE DATABASE crm;
CREATE USER crm_user WITH ENCRYPTED PASSWORD 'strong-random-password';
GRANT ALL PRIVILEGES ON DATABASE crm TO crm_user;

-- Extensions
\c crm
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- برای جستجوی fuzzy
```

### Connection Pooling (PgBouncer)

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
crm = host=your-db-host port=5432 dbname=crm user=crm_user password=your-password

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 5
```

```bash
# DATABASE_URL برای اپلیکیشن
DATABASE_URL="postgresql://crm_user:password@pgbouncer-host:6432/crm?pgbouncer=true&connection_limit=25"
```

### Backup Strategy

```bash
#!/bin/bash
# /usr/local/bin/crm-backup.sh
set -e

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/crm"
S3_BUCKET="s3://your-bucket/crm-backups"
ENCRYPTION_KEY="your-32-char-aes-key"

mkdir -p $BACKUP_DIR

# دیتابیس
pg_dump -h localhost -U crm_user -d crm --no-owner --no-privileges \
  | gzip | openssl enc -aes-256-cbc -salt -pass pass:$ENCRYPTION_KEY \
  > $BACKUP_DIR/crm_db_$DATE.sql.gz.enc

# آپلود به S3
aws s3 cp $BACKUP_DIR/crm_db_$DATE.sql.gz.enc $S3_BUCKET/db/ --storage-class STANDARD_IA

# نگهداری ۳۰ روزه محلی
find $BACKUP_DIR -name "crm_db_*.sql.gz.enc" -mtime +30 -delete

# لاگ
echo "[$DATE] Backup completed: crm_db_$DATE.sql.gz.enc" >> /var/log/crm/backup.log
```

```bash
# Cron job (هر روز ساعت ۳ بامداد)
0 3 * * * /usr/local/bin/crm-backup.sh
```

### Restore

```bash
#!/bin/bash
# /usr/local/bin/crm-restore.sh <backup-file>

BACKUP_FILE=$1
ENCRYPTION_KEY="your-32-char-aes-key"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file>"
  exit 1
fi

# دانلود از S3 (اگر لازم است)
aws s3 cp s3://your-bucket/crm-backups/db/$BACKUP_FILE /tmp/

# decrypt و restore
openssl enc -d -aes-256-cbc -pass pass:$ENCRYPTION_KEY -in /tmp/$BACKUP_FILE \
  | gunzip | psql -h localhost -U crm_user -d crm

echo "Restore completed from $BACKUP_FILE"
```

---

## Redis (Session/Cache)

### کانفیگ پیشنهادی

```bash
# /etc/redis/redis.conf
bind 127.0.0.1
port 6379
requirepass your-redis-password
maxmemory 1gb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec
```

```bash
# Redis URL برای اپلیکیشن
REDIS_URL="redis://:your-redis-password@127.0.0.1:6379"
```

---

## مانیتورینگ و لاگینگ

### Health Check Endpoint

```typescript
// src/app/api/health/route.ts
export async function GET() {
  try {
    // چک دیتابیس
    await db.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      error: error.message
    }, { status: 503 })
  }
}
```

### Prometheus Metrics (اختیاری)

```bash
# نصب node-exporter
# در Prometheus config:
scrape_configs:
  - job_name: 'crm-app'
    static_configs:
      - targets: ['your-server:9100']
  - job_name: 'crm-node'
    static_configs:
      - targets: ['your-server:3000']  # اگر metrics endpoint دارید
```

### Log Rotation

```bash
# /etc/logrotate.d/crm
/var/log/crm/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload crm-app > /dev/null 2>&1 || true
    endscript
}
```

---

## SSL/TLS

### Let's Encrypt (Certbot) - رایگان و خودکار

```bash
# نصب
sudo apt install certbot python3-certbot-nginx

# صدور گواهی
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# تمدید خودکار (در cron systemd timer)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Wildcard Certificate (برای Enterprise)

```bash
# با DNS challenge (ArvanCloud, Cloudflare)
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "*.your-domain.com" -d "your-domain.com"
```

---

## Security Hardening

### Firewall (UFW)

```bash
# فقط پورت‌های لازم
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (redirect به HTTPS)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Fail2Ban ( محافظت از SSH و Auth)

```bash
sudo apt install fail2ban

# /etc/fail2ban/jail.local
[sshd]
enabled = true
port = ssh
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
```

### Security Headers (در Caddy/Nginx - قبلاً تنظیم شده)

---

## CI/CD Pipeline (GitHub Actions مثال)

**.github/workflows/deploy.yml:**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install --frozen-lockfile
      
      - name: Type check
        run: npx tsc --noEmit
      
      - name: Lint
        run: bun run lint
      
      - name: Build
        run: bun run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      
      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.DOCKER_REGISTRY }}/amin-crm:${{ github.sha }} .
          docker push ${{ secrets.DOCKER_REGISTRY }}/amin-crm:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /var/www/crm
            docker pull ${{ secrets.DOCKER_REGISTRY }}/amin-crm:${{ github.sha }}
            docker-compose up -d --no-deps app
            docker image prune -f
```

---

## چک‌لیست پیش از انتشار (Go-Live Checklist)

### Infrastructure
- [ ] سرور/ها فراهم و سخت‌افزارها تایید شده
- [ ] PostgreSQL Managed Service فعال و در دسترس
- [ ] Redis Managed Service فعال
- [ ] DNS و SSL گواهی‌نامه تنظیم شده
- [ ] CDN (ArvanCloud/Cloudflare) کانفیگ شده
- [ ] Firewall و Security Groups بازبینی شده
- [ ] Backup Strategy پیاده‌سازی و تست شده

### Application
- [ ] `.env` تولید با تمام متغیرها ست شده
- [ ] `JWT_SECRET` قوی و منحصر به فرد (۳۲+ کاراکتر)
- [ ] `DEMO_AUTH=0` در تولید
- [ ] `GEMINI_API_KEY` ست شده (اگر AI لازم است)
- [ ] `REMINDER_WEBHOOK_URL` قابل دسترس و تست شده
- [ ] بیلد `bun run build` موفق
- [ ] `npx tsc --noEmit` بدون خطا
- [ ] `bun run lint` بدون خطا
- [ ] Migration دیتابیس (`db:push`) در staging تست شده
- [ ] Seed داده‌های پیش‌فرض در staging تست شده

### Features Testing
- [ ] Login/Logout کار می‌کند
- [ ] Role-based navigation درست کار می‌کند
- [ ] Department isolation در APIها اعمال شده
- [ ] ایجاد/ویرایش/حذف لید، تعامل، تسک، کاربران
- [ ] تبدیل لید به دانش‌پذیر
- [ ] پرداخت و چک‌tracking
- [ ] تقویم شمسی و یادآوری‌ها
- [ ] AI endpoints (coach, generate, mentor, roleplay)
- [ ] درخواست خرید و تایید
- [ ] لاگ فعالیت ثبت می‌شود
- [ ] Export CSV کار می‌کند
- [ ] پورتال دانش‌پذیر

### Monitoring
- [ ] Health check endpoint پاسخ می‌دهد
- [ ] لاگ‌ها در `/var/log/crm/` جمع‌آوری می‌شوند
- [ ] Log rotation تنظیم شده
- [ ] Uptime monitoring (UptimeRobot/Prometheus) فعال
- [ ] Alerting برای خطاهای 5xx و CPU/Memory بالا
- [ ] Backup cron job در cron.allow و تست شده

### Documentation
- [ ] مستندات API به‌روز
- [ ] Runbook برای incident response
- [ ] اطلاعات تماس تیم پشتیبانی
- [ ] disaster recovery plan مستند شده

---

## Rollback Plan

```bash
# در صورت مشکل در deploy جدید

# 1. Docker rollback
docker-compose pull  # pull image قبلی
docker-compose up -d --no-deps app

# 2. یا با PM2
pm2 stop crm-app
# کپی بکاپ فایل‌های قبلی
pm2 start crm-app

# 3. دیتابیس (اگر migration breaking داشته)
# از بکاپ قبلی restore
/usr/local/bin/crm-restore.sh crm_db_20260710_030000.sql.gz.enc

# 4. چک Gesundheit
curl -f https://your-domain.com/api/health
```

---

## هزینه‌های تقریبی ماهانه (IRR - تومان) - ۱۴۰۵

| پلن | سرور App | PostgreSQL | Redis | CDN/WAF | Monitoring | Backup | مجموع ماهانه |
|-----|----------|------------|-------|---------|------------|--------|-------------|
| **Minimal** | ۵۴م | ۳۶م | ۱۸م | ۰ | ۹م | شامل سرور | **۱۱۷م** |
| **Standard** | ۲۱۶م | ۱۴۴م | ۵۴م | ۷۲م | ۳۶م | ۵۴م | **۵۷۶م** |
| **Enterprise** | ۱,۰۸۰م | ۵۴۰م | ۱۸۰م | ۳۶۰م | ۱۰۸م | ۲۷۰م | **۲,۵۳۸م** |

*نوت: قیمت‌ها تقریبی و بر اساس نرخ دلار ۱۷۰,۰۰۰ تومان است.*

---

## تماس و پشتیبانی

**استقرار:** تیم DevOps موسسه امین  
**مستندات:** این فایل + `README.md` + `API_DOCS.md` + `DEVELOPMENT_GUIDE.md`  
**اژانس‌های هاستینگ پیشنهادی:** Liara, ArvanCloud, Pishgaman, AbrCloud

---

**آخرین به‌روزرسانی:** تیر ۱۴۰۵  
**نسخه:** 1.0