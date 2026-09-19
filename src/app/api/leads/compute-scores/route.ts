import { db } from '@/lib/db'
import { computeScoreFromLead } from '@/lib/lead-scoring/compute'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAuthorized } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAuthorized(session, [
      UserRole.ADMIN,
      UserRole.SALES_MANAGER,
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const leads = await db.lead.findMany({
      include: {
        interactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    const errors: string[] = []
    const updates: { id: string; score: number }[] = []

    for (const lead of leads) {
      try {
        const result = computeScoreFromLead(lead)
        updates.push({ id: lead.id, score: result.score })
      } catch {
        errors.push(`خطا در محاسبه امتیاز لید ${lead.id}`)
      }
    }

    if (updates.length > 0) {
      await db.$transaction(
        updates.map(({ id, score }) =>
          db.lead.update({ where: { id }, data: { score } })
        )
      )
    }

    return NextResponse.json({
      totalLeads: leads.length,
      updatedCount: updates.length,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Batch score computation error:', error)
    return NextResponse.json(
      { error: 'خطا در محاسبه دسته‌ای امتیاز لیدها' },
      { status: 500 }
    )
  }
}
