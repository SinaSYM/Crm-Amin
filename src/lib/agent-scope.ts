import { db } from '@/lib/db'
import { LeadStatus } from '@prisma/client'

/**
 * A SALES_AGENT "owns" a student when the lead that converted into that
 * student was assigned to them. There's no direct FK from a converted
 * student back to the originating lead — conversion matches by
 * phone_number (see leads/[id]/convert/route.ts) — so ownership is
 * resolved the same way here instead of through the unrelated
 * referred_by_id/referredLeads (affiliate) relation.
 */
export async function isAgentOwnerOfStudent(agentId: string, studentId: string): Promise<boolean> {
  const student = await db.user.findUnique({
    where: { id: studentId },
    select: { phone_number: true },
  })
  if (!student) return false

  const lead = await db.lead.findFirst({
    where: {
      phone_number: student.phone_number,
      assigned_to_id: agentId,
      status: LeadStatus.CONVERTED,
    },
    select: { id: true },
  })
  return !!lead
}

export async function getAgentStudentPhoneNumbers(agentId: string): Promise<string[]> {
  const leads = await db.lead.findMany({
    where: { assigned_to_id: agentId, status: LeadStatus.CONVERTED },
    select: { phone_number: true },
  })
  return leads.map((l) => l.phone_number)
}
