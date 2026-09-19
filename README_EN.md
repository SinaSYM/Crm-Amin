# Amin Institute CRM — Complete Documentation

> **A comprehensive, full-stack, Persian-localized CRM built with Next.js 16, React 19, Prisma, and SQLite/PostgreSQL for Amin Institute of Higher Education.**

---

## 📚 Documentation Index

| Document | Description | Language |
|----------|-------------|----------|
| [`README.md`](./README.md) | Project overview, architecture, deployment, features | Persian |
| [`README_EN.md`](./README_EN.md) | English version of README | English |
| [`API_DOCS.md`](./API_DOCS.md) | Complete API reference (43+ endpoints) | Persian |
| [`DEVELOPMENT_GUIDE.md`](./DEVELOPMENT_GUIDE.md) | Developer guide: setup, patterns, conventions | Persian |
| [`DATABASE_DOCS.md`](./DATABASE_DOCS.md) | Database schema, models, relationships, indexes | Persian |
| [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) | Production deployment: Docker, Nginx/Caddy, systemd | Persian |
| [`QUICK_REFERENCE.md`](./QUICK_REFERENCE.md) | Quick command card, user creds, RBAC, endpoints | Persian |
| [`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md) | Architecture deep-dive, tech stack, auth, DB | Persian |
| [`ISSUES.md`](./ISSUES.md) | Known bugs & gaps (Critical/High/Medium/Low) | Persian |
| [`SECURITY_AUDIT.md`](./SECURITY_AUDIT.md) | Security assessment & compliance checklist | Persian |
| [`PROPOSAL_CRM_IRAN.md`](./PROPOSAL_CRM_IRAN.md) | Commercial proposal with pricing tiers | Persian |
| [`AGENTS.md`](./AGENTS.md) | Repository guidelines for AI agents | English |
| [`CLAUDE.md`](./CLAUDE.md) | Development instructions | English |

---

## 🚀 Quick Start

```bash
cd CRM
bun install
bun run db:generate
bun run db:push
bun run db:seed
bun run dev
# → http://localhost:3000
```

**Default login (after seed):**
| User | Phone | Role | Password |
|------|-------|------|----------|
| اردلان ابوالفتحی | 09120000001 | ADMIN | 12345678 |
| فاطمه یعقوبی | 09120000002 | EDUCATION_OFFICER | 12345678 |
| سینا غمصاریان | 09120000003 | FINANCIAL_OFFICER | 12345678 |
| ...and 10 more | | | |

---

## 🏗️ Architecture at a Glance

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Next.js   │────▶│   Prisma ORM     │────▶│  SQLite /   │
│  App Router │     │   (Type-safe)    │     │  PostgreSQL │
└─────────────┘     └──────────────────┘     └─────────────┘
       │
       ▼
┌──────────────────┐     ┌──────────────────┐
│  Zustand Store   │     │  TanStack Query  │
│  (Client State)  │     │  (Server State)  │
└──────────────────┘     └──────────────────┘
       │
       ▼
┌──────────────────┐
│  shadcn/ui +     │
│  Tailwind CSS 4  │
└──────────────────┘
```

- **SPA with State-based Navigation**: Single `page.tsx` renders views via `activeView` in Zustand
- **Custom Auth**: JWT in HttpOnly cookie, scrypt password hashing, 30-day TTL
- **RBAC**: 8 roles, 5 departments, client + server-side enforcement
- **AI Integration**: Google Gemini 1.5 Flash (REST, no SDK)
- **Background Worker**: Node.js cron for task reminders → webhook

---

## ✨ Key Features

| Module | Highlights |
|--------|------------|
| **Leads** | 4-status pipeline, AI scoring, auto-assignment, public diagnostic bot |
| **Sales Panel** | Interactive lead workspace, Kanban, Calendar, AI Coach (real-time) |
| **Analytics** | Recharts dashboards: conversion, revenue, source distribution, agent KPIs |
| **Student Portal** | Classes/video archive, tickets, AI Mentor, referral/ambassador program |
| **Courses/Enrollments** | Capacity, installments, checks, Excel export |
| **AI Suite** | Sales Coach, Content Gen, Mentor, Roleplay (3 scenarios), Diagnostic Bot |
| **Staff/RBAC** | 8 roles, 5 depts, STANDARD/GLOBAL scope, full audit log |
| **Commissions** | Referral codes, wallet, ambassador payouts |
| **Reminders** | Task `reminder_time` → webhook (SMS/push/email) via cron worker |

---

## 📦 Deployment (Production)

### Minimal Requirements
- 2 vCPU, 4 GB RAM, 50 GB NVMe
- Managed PostgreSQL (1 vCPU, 2 GB)
- Redis 512 MB
- Domain + SSL (Let's Encrypt / ArvanCloud)

### Quick Deploy with Docker
```bash
docker-compose up -d
# Includes: app, postgres, redis, reminder-worker
```

### Reverse Proxy (Caddy - Auto SSL)
```caddy
your-domain.com {
    reverse_proxy localhost:3000
    header Strict-Transport-Security "max-age=31536000"
}
```

### Systemd for Reminder Worker
```ini
# /etc/systemd/system/crm-scheduler.service
[Service]
ExecStart=/usr/bin/node /var/www/crm/src/cron/reminder-worker.js
Restart=always
EnvironmentFile=/var/www/crm/.env
```

---

## 🔒 Security Checklist

| Item | Status | Notes |
|------|--------|-------|
| HTTPS/TLS 1.3 | ✅ | Via Caddy/Nginx |
| HttpOnly Cookies | ✅ | `crm_session` |
| Rate Limiting | ⚠️ | WAF (Arvan/Cloudflare) |
| SQL Injection | ✅ | Prisma ORM |
| RBAC | ✅ | Server + client |
| Audit Log | ✅ | `ActivityLog` model |
| Disk Encryption | ❌ | Enable LUKS / TDE |
| Secrets Management | ⚠️ | Use Doppler/Vault in prod |
| Encrypted Backups | ❌ | Implement AES-256 |
| Dependency Scanning | ❌ | Add Snyk/npm audit to CI |

**Critical Issues (from ISSUES.md):**
- **C1**: `/api/enrollments/[id]/payments` has NO auth
- **C2**: Hardcoded passwords in `scripts/reset-password.ts` & `bootstrap-admin.ts`
- **C3**: Public "consultation request" form always returns 401

---

## 🛠️ Development Commands

```bash
# Code quality
bun run lint
npx tsc --noEmit   # REQUIRED: next.config has ignoreBuildErrors: true

# Database
bun run db:generate
bun run db:push
bun run db:seed
bun run db:studio

# Admin scripts
bun run tsx scripts/list-users.ts
bun run tsx scripts/bootstrap-admin.ts
bun run tsx scripts/reset-password.ts <userId>
```

---

## 📋 Adding a New View (Checklist)

1. Create `src/components/crm/new-view.tsx`
2. Add to `ActiveView` type in `src/lib/store.ts`
3. Add to `roleNavConfig` in `src/lib/store.ts`
4. Import & render in `ViewRenderer` in `src/app/page.tsx`
5. Add to `navSections` in `src/app/page.tsx` (sidebar)
6. Add to `sectionMap` in `src/app/page.tsx` (breadcrumbs)
7. Create API routes under `src/app/api/new-resource/`
8. Add activity logging in mutations
9. Apply department/role filters in GET handlers
10. Test with each role

---

## 📄 License & Ownership

Developed for **Amin Institute of Higher Education (amin-inst.ac.ir)**.  
Source code license transferred upon purchase.  
White-label rights included in Enterprise tier.

---

## 🤝 Support & Contact

- **Technical Issues**: Create GitHub issue or check `ISSUES.md`
- **Security**: See `SECURITY_AUDIT.md` for responsible disclosure
- **Commercial**: See `PROPOSAL_CRM_IRAN.md` for pricing tiers

---

**Last Updated**: Tir 1405 (July 2026)  
**Version**: 2.0