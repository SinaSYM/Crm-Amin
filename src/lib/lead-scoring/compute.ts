import { db } from '@/lib/db'
import type { Lead, Interaction } from '@prisma/client'

interface ScoreBreakdown {
  hasName: number
  hasPhone: number
  sourceScore: number
  hasAgent: number
  hasCourse: number
  statusScore: number
  interactionScore: number
  hasFollowup: number
  hasNotes: number
  recentActivity: number
  total: number
}

type LeadWithInteractions = Lead & { interactions: Interaction[] }

/**
 * Pure scoring logic — takes an already-loaded lead (with its interactions)
 * and does no DB I/O. Lets batch callers load N leads in one query instead
 * of one findUnique per lead.
 */
export function computeScoreFromLead(lead: LeadWithInteractions): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    hasName: 0,
    hasPhone: 0,
    sourceScore: 0,
    hasAgent: 0,
    hasCourse: 0,
    statusScore: 0,
    interactionScore: 0,
    hasFollowup: 0,
    hasNotes: 0,
    recentActivity: 0,
    total: 0,
  }

  // Has first/last name: +10
  if (lead.first_name.trim() && lead.last_name.trim()) {
    breakdown.hasName = 10
  }

  // Has phone number: +5
  if (lead.phone_number.trim()) {
    breakdown.hasPhone = 5
  }

  // Source scoring: dynamic for diagnostic_bot based on AI analysis
  let sourceScore = 5
  if (lead.source === 'website') {
    sourceScore = 15
  } else if (lead.source === 'campaign') {
    sourceScore = 10
  } else if (lead.source === 'manual') {
    sourceScore = 5
  } else if (lead.source === 'diagnostic_bot') {
    // Highly qualified lead: base of 20 + up to 10 points based on their AI diagnostic score (which reflects size/challenges)
    let aiScore = 50 // default fallback
    const match = lead.notes.match(/\[امتیاز عارضه: (\d+)\]/)
    if (match) {
      aiScore = parseInt(match[1], 10)
    }
    // Scale AI score (20-100) to (0-10) bonus points
    const bonus = Math.round(((aiScore - 20) / 80) * 10)
    sourceScore = 20 + Math.max(0, Math.min(bonus, 10)) // 20 to 30 points
  }
  breakdown.sourceScore = sourceScore

  // Has assigned agent: +10
  if (lead.assigned_to_id) {
    breakdown.hasAgent = 10
  }

  // Has target course: +10
  if (lead.target_course_id) {
    breakdown.hasCourse = 10
  }

  // Status scoring
  const statusScores: Record<string, number> = {
    CONTACTED: 10,
    IN_PROGRESS: 15,
    CONVERTED: 20,
  }
  breakdown.statusScore = statusScores[lead.status] ?? 0

  // Number of interactions: +3 per interaction (max +15)
  const interactionCount = lead.interactions.length
  breakdown.interactionScore = Math.min(interactionCount * 3, 15)

  // Has follow-up scheduled: +5
  const hasFollowup = lead.interactions.some(
    (i) => i.next_followup_date !== null
  )
  if (hasFollowup) {
    breakdown.hasFollowup = 5
  }

  // Notes not empty: +5
  if (lead.notes.trim()) {
    breakdown.hasNotes = 5
  }

  // Recent activity (interaction in last 7 days): +5
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const hasRecentActivity = lead.interactions.some(
    (i) => new Date(i.createdAt) >= sevenDaysAgo
  )
  if (hasRecentActivity) {
    breakdown.recentActivity = 5
  }

  // Calculate total, capped at 100
  const total = Math.min(
    breakdown.hasName +
      breakdown.hasPhone +
      breakdown.sourceScore +
      breakdown.hasAgent +
      breakdown.hasCourse +
      breakdown.statusScore +
      breakdown.interactionScore +
      breakdown.hasFollowup +
      breakdown.hasNotes +
      breakdown.recentActivity,
    100
  )

  breakdown.total = total

  return { score: total, breakdown }
}

export async function computeLeadScore(leadId: string): Promise<{ score: number; breakdown: ScoreBreakdown } | null> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: {
      interactions: {
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!lead) return null

  return computeScoreFromLead(lead)
}

export async function computeAndSaveLeadScore(leadId: string): Promise<{ score: number; breakdown: ScoreBreakdown } | null> {
  const result = await computeLeadScore(leadId)
  if (!result) return null

  await db.lead.update({
    where: { id: leadId },
    data: { score: result.score },
  })

  return result
}
