# CRM Enhancements for Amin Institute - Design Specification
**Date:** 2026-06-28  
**Status:** Approved

This design specification details the technical architecture, database migrations, backend APIs, background scheduling worker, and frontend panel alignments required to fulfill the new requirements of the Amin Institute CRM.

---

## 1. Database Schema Specifications (`prisma/schema.prisma`)

We will update the [schema.prisma](file:///root/CRM/prisma/schema.prisma) file to support the new roles, departments, user activity logging, purchasing workflows, check details, and task reminders.

### 1.1 UserRole Enum Expansion
```prisma
enum UserRole {
  ADMIN
  SALES_MANAGER
  SALES_AGENT
  STUDENT
  
  // Amin Institute Roles
  EDUCATION_OFFICER   // Educational & Operations Officer
  FINANCIAL_OFFICER   // Financial Affairs Officer
  MENTOR              // Mentoring Unit Member
  DEPT_MANAGER        // Department Manager
}
```

### 1.2 User Model Upgrades
We will add fields for department assignment, notepad storage, and a relation for purchase requests.
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

  // New Fields
  department     String?  // MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT
  personal_notes String   @default("") // Private notepad for the user
  admin_notes    String   @default("") // Admin review notes about the user

  // Relations
  assignedLeads  Lead[]        @relation("AssignedLeads")
  referredLeads  Lead[]        @relation("ReferredLeads")
  interactions   Interaction[] @relation("AgentInteractions")
  enrollments    Enrollment[]  @relation("StudentEnrollments")
  tickets        Ticket[]      @relation("StudentTickets")
  tasks          Task[]        @relation("AgentTasks")
  commissions    Commission[]  @relation("UserCommissions")
  
  // New Relation
  purchases      PurchaseRequest[] @relation("UserPurchases")
}
```

### 1.3 ActivityLog Model (User Activity Tracking)
This table will store audit logs of user actions.
```prisma
model ActivityLog {
  id          String   @id @default(cuid())
  user_id     String
  user_name   String
  user_role   String
  action      String   // LOGIN, LOGOUT, CREATE_LEAD, UPDATE_LEAD_STATUS, CONVERT_LEAD, etc.
  description String   // Detailed audit text
  createdAt   DateTime @default(now())
}
```

### 1.4 PurchaseRequest Model (Procurement Workflow)
Allows staff to create purchase requests for approval by managers/admins.
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
  requester    User     @relation("UserPurchases", fields: [requester_id], references: [id], onDelete: Cascade)
}
```

### 1.5 Teacher Model
Used by the Education Officer to manage instructors.
```prisma
model Teacher {
  id           String   @id @default(cuid())
  name         String
  phone_number String
  email        String?
  specialty    String
  status       String   @default("ACTIVE") // ACTIVE, INACTIVE
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### 1.6 Lead Model Upgrades
We will add a department field to leads so that department-level visibility can be enforced.
```prisma
model Lead {
  // ... existing fields ...
  department       String?    // MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT
  // ... existing relations ...
}
```

### 1.7 Course Model Upgrades
```prisma
model Course {
  // ... existing fields ...
  department       String?    // MANAGEMENT, REAL_ESTATE, FINANCE, LAW, PROJECT_MANAGEMENT
  // ... existing relations ...
}
```

### 1.8 Payment Model Upgrades (Check Tracking)
```prisma
model Payment {
  // ... existing fields ...
  check_number    String?
  check_bank      String?
  check_date      DateTime?
  check_status    String?    // PENDING, CLEARED, BOUNCED
}
```

### 1.9 Task Model Upgrades (Reminders)
```prisma
model Task {
  // ... existing fields ...
  reminder_time   Int?       // Minutes before due_date to trigger webhook. Null = no reminder
  reminder_sent   Boolean    @default(false)
}
```

---

## 2. Background Scheduler & Webhook Specification

### 2.1 Configuration
Variables in `.env` define the webhook endpoint that receives notifications:
*   `REMINDER_WEBHOOK_URL`: The URL to call.
*   `REMINDER_WEBHOOK_METHOD`: HTTP method (default: `POST`).
*   `REMINDER_WEBHOOK_HEADERS`: Stringified JSON of request headers.
*   `REMINDER_WEBHOOK_PAYLOAD_TEMPLATE`: JSON payload with variables like `{recipient_phone}`, `{title}`, `{due_date}`, `{description}`.

### 2.2 Worker Script (`src/cron/reminder-worker.js`)
*   Run inside a persistent systemd service `crm-scheduler.service` executing `node src/cron/reminder-worker.js`.
*   Polls the SQLite database every 60 seconds.
*   Finds pending tasks where:
    ```sql
    status = 'PENDING' AND
    reminder_sent = false AND
    reminder_time IS NOT NULL AND
    datetime(due_date, '-' || reminder_time || ' minutes') <= datetime('now')
    ```
*   Performs HTTP requests to the webhook URL for each found task.
*   Updates `reminder_sent = true` in the DB.
*   Creates an `ActivityLog` entry recording the webhook dispatch.

---

## 3. Role-Based Navigation & Access Alignment

We will update [src/lib/store.ts](file:///root/CRM/src/lib/store.ts) to define navigation routes per role.

### 3.1 Views Configuration (`roleNavConfig`)
```typescript
export const roleNavConfig: Record<string, ActiveView[]> = {
  STUDENT: ['dashboard', 'courses', 'enrollments', 'settings'],
  SALES_AGENT: ['dashboard', 'sales-panel', 'roleplay', 'leads', 'kanban', 'calendar', 'interactions', 'lead-detail', 'settings'],
  
  // New Roles
  EDUCATION_OFFICER: ['dashboard', 'courses', 'calendar', 'teacher-coordination', 'purchase-requests', 'settings'],
  FINANCIAL_OFFICER: ['dashboard', 'enrollments', 'financial-dashboard', 'purchase-requests', 'settings'],
  MENTOR: ['dashboard', 'leads', 'kanban', 'calendar', 'interactions', 'lead-detail', 'settings'],
  DEPT_MANAGER: ['dashboard', 'leads', 'kanban', 'calendar', 'sales-panel', 'users', 'courses', 'interactions', 'enrollments', 'analytics', 'lead-detail', 'settings'],
  
  SALES_MANAGER: ['dashboard', 'leads', 'kanban', 'calendar', 'sales-panel', 'roleplay', 'users', 'courses', 'interactions', 'enrollments', 'analytics', 'lead-detail', 'settings'],
  ADMIN: ['dashboard', 'leads', 'kanban', 'calendar', 'sales-panel', 'roleplay', 'users', 'courses', 'interactions', 'enrollments', 'analytics', 'lead-detail', 'settings'],
}
```

### 3.2 Hybrid Data Isolation (API Middleware & Handlers)
*   **Sales Specialist (`SALES_AGENT`)**: Query filters ensure `assigned_to_id == currentUserId`.
*   **Department Manager (`DEPT_MANAGER`) / Sales Manager (`SALES_MANAGER`)**: Filter query results by `user.department` (leads and courses must match `user.department`).
*   **Admins / Education / Finance**: No department filter applied.

---

## 4. UI Alignments & New Panels

### 4.1 Personal and Admin Review Notes
*   **Personal Notepad:** Added to the Dashboard and Settings views as a text area allowing all users to edit and save notes (`personal_notes`).
*   **Admin Review Notes:** Added to the User Management detail dialog in `users-page.tsx`. Only accessible to `ADMIN` and `SALES_MANAGER`/`DEPT_MANAGER` to write and save background evaluation notes about their agents (`admin_notes`).

### 4.2 New Panels (Views)
1.  **Teacher Coordination (`teacher-coordination`):** 
    Allows the Education Officer to list instructors, add new teachers, and view class histories.
2.  **Purchase Requests (`purchase-requests`):** 
    Allows staff to submit requests for office items. Managers and Admins see approval actions.
3.  **Financial Dashboard (`financial-dashboard`):** 
    Summarizes overall payments and displays student checks with status updates.
4.  **Activity Logs Tab:** 
    A tab in the Admin/Manager users page or separate view displaying the `ActivityLog` table.

---

## 5. Demo Seeding Alignment

We will update [seed.ts](file:///root/CRM/prisma/seed.ts) and [login-page.tsx](file:///root/CRM/src/components/crm/login-page.tsx) with these specific demo users:
*   **اردلان ابوالفتحی** (Ardalan Abolfathi) - ADMIN
*   **فاطمه یعقوبی** (Fatemeh Yaghoubi) - EDUCATION_OFFICER
*   **سینا قمصریان** (Sina Ghamsarian) - FINANCIAL_OFFICER
*   **سید حسین بنی طبا** (Seyyed Hossein Bani Taba) - MENTOR
*   **نجیبه رمضان زاده** (Najibe Ramezanzadeh) - DEPT_MANAGER (MANAGEMENT department)
*   **محمد عدالت** (Mohammad Edalat) - DEPT_MANAGER (FINANCE department)
