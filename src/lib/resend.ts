import { Resend } from 'resend'

/**
 * Resend client for transactional emails.
 * Requires RESEND_API_KEY env var. If missing, email sending is skipped gracefully
 * so the app keeps working without email configured.
 */
export const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null

export const EMAIL_FROM = process.env.EMAIL_FROM || 'CRM امین <onboarding@resend.dev>'

export function isEmailConfigured(): boolean {
    return !!resend
}
