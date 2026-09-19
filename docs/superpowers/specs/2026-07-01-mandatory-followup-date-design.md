# Design Spec: Mandatory Follow-up Date for Lead Creation

This spec defines the changes to make the follow-up date field mandatory when creating a new lead in the Amin CRM.

## Proposed Changes

### 1. Frontend Form Label & Validation
- In `src/components/crm/leads-page.tsx`, update the label for `add-followup` input in the Add Lead Dialog to include `*`.
- Update `handleSubmitLead` to perform client-side validation to ensure `next_followup_date` is filled when `isEdit` is false. Show a toast error if missing.

### 2. Backend Validation
- In `src/app/api/leads/route.ts` `POST`, add a validation check to ensure `next_followup_date` is present in the request body. Return a 400 response if missing.
