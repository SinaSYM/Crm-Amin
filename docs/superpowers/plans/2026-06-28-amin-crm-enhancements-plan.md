# Amin CRM Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the new requirements for Amin Institute CRM including activity logging, task scheduler calendar, personal and admin notes, new roles (Education Officer, Financial Affairs, Mentor, Department Manager) and department isolation.

**Architecture:** Extend Prisma schema to support the new models and attributes, implement background scheduling via systemd + node script, apply data isolation at the API and store levels, and create custom front-end views for new panels.

**Tech Stack:** Next.js, Node.js, Prisma, SQLite, Tailwind CSS, Shadcn UI, Zustand, Systemd.

## Global Constraints
- Keep RTL and Persian language consistency across all UI components.
- Do not bypass API authorization validation checks.
- Keep components focused, modular, and responsive.

---

### Task 1: Database Migration & Schema Extensions

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`

**Interfaces:**
- Updates `UserRole` enum in schema.
- Adds `ActivityLog`, `PurchaseRequest`, and `Teacher` models.
- Updates `User`, `Lead`, `Course`, `Payment`, and `Task` models with new fields.

- [ ] **Step 1: Edit `prisma/schema.prisma`**
  Modify `/root/CRM/prisma/schema.prisma` to add new roles, departments, logging, checks, and reminder fields:
  ```prisma
  // 1. Expansion of UserRole
  enum UserRole {
    ADMIN
    SALES_MANAGER
    SALES_AGENT
    STUDENT
    
    // Amin Institute Roles
    EDUCATION_OFFICER
    FINANCIAL_OFFICER
    MENTOR
    DEPT_MANAGER
  }

  // 2. Updated User Model
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

    department     String?  // MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT
    personal_notes String   @default("")
    admin_notes    String   @default("")

    assignedLeads  Lead[]        @relation("AssignedLeads")
    referredLeads  Lead[]        @relation("ReferredLeads")
    interactions   Interaction[]  @relation("AgentInteractions")
    enrollments    Enrollment[]  @relation("StudentEnrollments")
    tickets        Ticket[]      @relation("StudentTickets")
    tasks          Task[]        @relation("AgentTasks")
    commissions    Commission[]  @relation("UserCommissions")
    purchases      PurchaseRequest[] @relation("UserPurchases")
  }

  // 3. New ActivityLog Model
  model ActivityLog {
    id          String   @id @default(cuid())
    user_id     String
    user_name   String
    user_role   String
    action      String
    description String
    createdAt   DateTime @default(now())
  }

  // 4. New PurchaseRequest Model
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

    requester    User     @relation("UserPurchases", fields: [requester_id], references: [id], onDelete: Cascade)
  }

  // 5. New Teacher Model
  model Teacher {
    id           String   @id @default(cuid())
    name         String
    phone_number String
    email        String?
    specialty    String
    status       String   @default("ACTIVE")
    createdAt    DateTime @default(now())
    updatedAt    DateTime @updatedAt
  }

  // 6. Updated Lead Model
  model Lead {
    // ... keep existing ...
    department       String?    // MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT
  }

  // 7. Updated Course Model
  model Course {
    // ... keep existing ...
    department       String?    // MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT
  }

  // 8. Updated Payment Model
  model Payment {
    // ... keep existing ...
    check_number    String?
    check_bank      String?
    check_date      DateTime?
    check_status    String?    // PENDING, CLEARED, BOUNCED
  }

  // 9. Updated Task Model
  model Task {
    // ... keep existing ...
    reminder_time   Int?       // Minutes offset, null = no reminder
    reminder_sent   Boolean    @default(false)
  }
  ```

- [ ] **Step 2: Update Seed Script `prisma/seed.ts`**
  Modify `/root/CRM/prisma/seed.ts` to include the specific demo users and departments:
  ```typescript
  // Add new users during seeding
  // Ardalan Abolfathi - ADMIN
  // Fatemeh Yaghoubi - EDUCATION_OFFICER
  // Sina Ghamsarian - FINANCIAL_OFFICER
  // Seyyed Hossein Bani Taba - MENTOR
  // Najibe Ramezanzadeh - DEPT_MANAGER (MANAGEMENT)
  // Mohammad Edalat - DEPT_MANAGER (FINANCE)
  ```
  Ensure existing models are cleared and new models are populated with sample data.

- [ ] **Step 3: Run Database Migrations**
  Run: `npx prisma db push && npx prisma db seed`
  Expected: DB structure updated, client generated, database seeded successfully.

- [ ] **Step 4: Commit Changes**
  Run:
  ```bash
  git add prisma/schema.prisma prisma/seed.ts
  git commit -m "db: update schema and seed for new roles and logging models"
  ```

---

### Task 2: Navigation & Store Config

**Files:**
- Modify: `src/lib/store.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/components/crm/login-page.tsx`

- [ ] **Step 1: Update `src/lib/store.ts`**
  Extend `ActiveView` and `roleNavConfig` inside `/root/CRM/src/lib/store.ts` to include the new views:
  `teacher-coordination`, `purchase-requests`, `financial-dashboard`, `activity-logs` and role maps.

- [ ] **Step 2: Update `src/app/page.tsx`**
  - Add breadcrumbs, imports, icon imports, and translation labels for the new roles.
  - Integrate new component renderers under `ViewRenderer`:
    - `teacher-coordination` -> `<TeacherCoordination key={refreshKey} />`
    - `purchase-requests` -> `<PurchaseRequestsPage key={refreshKey} />`
    - `financial-dashboard` -> `<FinancialDashboard key={refreshKey} />`
    - `activity-logs` -> `<ActivityLogsPage key={refreshKey} />`

- [ ] **Step 3: Update `src/components/crm/login-page.tsx`**
  Add the new roles and translation titles so they appear in the Demo Users listing on the login screen.

- [ ] **Step 4: Verify login page options**
  Run: `npm run build` to verify compiling is correct.
  Expected: Success.

- [ ] **Step 5: Commit changes**
  Run:
  ```bash
  git add src/lib/store.ts src/app/page.tsx src/components/crm/login-page.tsx
  git commit -m "feat: align panel navigation configuration and demo login users"
  ```

---

### Task 3: Backend API Handlers (Logging, Webhook, Actions)

**Files:**
- Create: `src/app/api/logs/route.ts`
- Create: `src/app/api/purchases/route.ts`
- Create: `src/app/api/purchases/[id]/route.ts`
- Create: `src/app/api/teachers/route.ts`
- Create: `src/app/api/teachers/[id]/route.ts`
- Create: `src/app/api/classes/[id]/route.ts`
- Modify: Existing handlers in `src/app/api/leads`, `src/app/api/users`, `src/app/api/enrollments`, `src/app/api/payments`, `src/app/api/classes`

- [ ] **Step 1: Create activity log API**
  Write `/root/CRM/src/app/api/logs/route.ts` to retrieve and filter historical logs.

- [ ] **Step 2: Create Purchase Request APIs**
  Create `/root/CRM/src/app/api/purchases/route.ts` and `/root/CRM/src/app/api/purchases/[id]/route.ts` to manage purchases.

- [ ] **Step 3: Create Teacher APIs**
  Create `/root/CRM/src/app/api/teachers/route.ts` and `/root/CRM/src/app/api/teachers/[id]/route.ts` to manage teachers.

- [ ] **Step 4: Create ClassSession details API**
  Create `/root/CRM/src/app/api/classes/[id]/route.ts` to allow PUT (update class) and DELETE (delete class) methods.

- [ ] **Step 5: Apply Logging Hook in Core APIs**
  Inject database call to `db.activityLog.create` inside core POST/PUT/DELETE handlers to log user actions.

- [ ] **Step 6: Apply Department Data Filter**
  Ensure leads, users, and enrollments fetch actions restrict queries based on role-based headers (`X-User-Role` and `X-User-Id`).
  - Specialists: `assigned_to_id = userId`.
  - Dept Managers: `department = userDepartment`.

- [ ] **Step 7: Commit changes**
  Run: `git commit` with appropriate message.

---

### Task 4: Scheduler Worker & systemd Service Configuration

**Files:**
- Create: `src/cron/reminder-worker.js`
- Create: `/etc/systemd/system/crm-scheduler.service`

- [ ] **Step 1: Write `src/cron/reminder-worker.js`**
  Implement the polling loop using Prisma Client to fetch tasks due for reminders. Implement the node `fetch` POST dispatch to generic Webhook. Update `reminder_sent = true` and log the dispatch success or error to `ActivityLog`.

- [ ] **Step 2: Create `/etc/systemd/system/crm-scheduler.service`**
  Define the service file to execute `/root/CRM/src/cron/reminder-worker.js`.

- [ ] **Step 3: Load, Enable, and Start Scheduler Service**
  Run: `systemctl daemon-reload && systemctl enable crm-scheduler && systemctl start crm-scheduler && systemctl status crm-scheduler`
  Expected: Active and running.

- [ ] **Step 4: Commit changes**
  Run: `git add src/cron/reminder-worker.js` and commit.

---

### Task 5: Frontend UI - Notes and User Management Alignments

**Files:**
- Modify: `src/components/crm/settings-page.tsx`
- Modify: `src/components/crm/users-page.tsx`
- Modify: `src/components/crm/dashboard.tsx`

- [ ] **Step 1: Add Personal Notepad**
  - Add text field or Markdown notepad component to `/root/CRM/src/components/crm/dashboard.tsx` and settings page showing personal notepad (`personal_notes`).
  - Send PUT request to `/api/users/profile` (or similar endpoint) to save changes.

- [ ] **Step 2: Add Admin Notes Field**
  - In `/root/CRM/src/components/crm/users-page.tsx`, under the user card or details dialog, display a review notes area (`admin_notes`) visible/editable only by Admin and Department Managers.
  - Save changes to database via PUT `/api/users/[id]`.

- [ ] **Step 3: Add Department selection to User Forms**
  - Add department selector dropdown in Create/Edit user form.
  - Ensure department info is rendered in the user lists.

- [ ] **Step 4: Commit changes**
  Run: `git commit` with appropriate message.

---

### Task 6: Frontend UI - New Panel Views

**Files:**
- Create: `src/components/crm/teacher-coordination.tsx`
- Create: `src/components/crm/purchase-requests.tsx`
- Create: `src/components/crm/financial-dashboard.tsx`
- Create: `src/components/crm/activity-logs.tsx`

- [ ] **Step 1: Create `src/components/crm/teacher-coordination.tsx`**
  Renders list of teachers, specialties, and a form to add/edit. Shows class assignment schedules.

- [ ] **Step 2: Create `src/components/crm/purchase-requests.tsx`**
  Renders procurement dashboard. Staff can submit purchase requests. Managers/Admins see approval buttons.

- [ ] **Step 3: Create `src/components/crm/financial-dashboard.tsx`**
  Renders financial lists. Shows checks (cheque list) with check number, due date, status dropdown (PENDING, CLEARED, BOUNCED) with action button to update status.

- [ ] **Step 4: Create `src/components/crm/activity-logs.tsx`**
  Renders audit history table with action tags, timestamps, and search filters.

- [ ] **Step 5: Commit changes**
  Run: `git commit` with appropriate message.

---

### Task 7: Calendar Scheduler Upgrades with Reminders

**Files:**
- Modify: `src/components/crm/calendar-page.tsx`

- [ ] **Step 1: Fetch Tasks in Calendar**
  Update `/root/CRM/src/components/crm/calendar-page.tsx` to fetch both interactions (follow-up dates) and scheduled tasks (`/api/tasks`). Display them as events in the monthly calendar cells.

- [ ] **Step 2: Implement Create Event Form Dialog**
  Add a Dialog to create a task when clicking on a calendar day:
  - Form fields: Title, description, Time (hour/minutes), Associated Lead (dropdown), Reminder Time (None, 15 min, 1 hr, 24 hr).
  - Submit calls POST to `/api/tasks`.

- [ ] **Step 3: Add Mark Complete / Delete Actions**
  - Clicking on a task event in the calendar list opens a detail popover with a button to toggle completion status (`PENDING` -> `COMPLETED`) or delete.

- [ ] **Step 4: Commit changes**
  Run: `git add src/components/crm/calendar-page.tsx` and commit.
