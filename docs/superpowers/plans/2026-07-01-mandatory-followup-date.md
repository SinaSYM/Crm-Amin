# Mandatory Follow-up Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the next follow-up date mandatory when creating a new lead in the CRM, validating it both on the client-side (frontend) and server-side (backend).

**Architecture:** Add field validation checks on the frontend (`leads-page.tsx`) before sending the POST request and on the backend (`api/leads/route.ts`) POST API handler.

**Tech Stack:** Next.js, React, TailwindCSS, TypeScript, Prisma Client.

## Global Constraints
- Keep RTL and Persian language consistency across all UI components.
- Do not bypass API authorization validation checks.
- Keep components focused, modular, and responsive.

---

### Task 1: Frontend Form Label & Validation

**Files:**
- Modify: `src/components/crm/leads-page.tsx`

**Interfaces:**
- Consumes: `formData.next_followup_date` state variable.
- Produces: Client-side validation toast warning and form submission block.

- [ ] **Step 1: Update form label to indicate field is mandatory**
  Locate the label for follow-up input around line 1344 and change it from:
  ```tsx
  <Label htmlFor="add-followup">تاریخ و ساعت تماس پیگیری (اختیاری)</Label>
  ```
  to:
  ```tsx
  <Label htmlFor="add-followup">تاریخ و ساعت تماس پیگیری *</Label>
  ```

- [ ] **Step 2: Add validation check in handleSubmitLead**
  Locate `handleSubmitLead` around line 423 and add a validation check at the top of the function:
  ```typescript
  if (!isEdit && !formData.next_followup_date) {
    toast.error('وارد کردن تاریخ تماس پیگیری الزامی است')
    return
  }
  ```

- [ ] **Step 3: Verify build success**
  Run command: `npm run build 2>&1 | tail -n 20`
  Expected: exit code 0, successful build.

- [ ] **Step 4: Commit changes**
  ```bash
  git add src/components/crm/leads-page.tsx
  git commit -m "feat: make follow-up date mandatory in lead creation form"
  ```

---

### Task 2: Backend Validation

**Files:**
- Modify: `src/app/api/leads/route.ts`

**Interfaces:**
- Consumes: POST request body payload.
- Produces: HTTP 400 Bad Request error response if `next_followup_date` is missing.

- [ ] **Step 1: Add check for next_followup_date in POST route handler**
  Locate the parameter check in `POST` around line 147 (below the `phone_number` check) and insert:
  ```typescript
  if (!next_followup_date) {
    return NextResponse.json(
      { error: 'next_followup_date is required' },
      { status: 400 }
    )
  }
  ```

- [ ] **Step 2: Verify build success**
  Run command: `npm run build 2>&1 | tail -n 20`
  Expected: exit code 0, successful build.

- [ ] **Step 3: Commit changes**
  ```bash
  git add src/app/api/leads/route.ts
  git commit -m "feat: add backend validation for mandatory next_followup_date on lead creation"
  ```
