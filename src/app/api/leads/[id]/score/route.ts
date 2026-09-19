import { computeAndSaveLeadScore } from '@/lib/lead-scoring/compute'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.userRole === 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check lead exists
    const lead = await db.lead.findUnique({
      where: { id },
      include: { assigned_to: true }
    })
    if (!lead) {
      return NextResponse.json(
        { error: 'لید یافت نشد' },
        { status: 404 }
      )
    }

    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })

    // Access control check
    if (session.userRole !== 'ADMIN') {
      if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
        if (userProfile?.department) {
          const isLeadDeptMatch = lead.department === userProfile.department
          const isAgentDeptMatch = lead.assigned_to?.department === userProfile.department
          if (!isLeadDeptMatch && !isAgentDeptMatch) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          }
        } else {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        // SALES_AGENT, MENTOR, etc. can only view their own assigned leads
        if (lead.assigned_to_id !== session.userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    const result = await computeAndSaveLeadScore(id)

    if (!result) {
      return NextResponse.json(
        { error: 'خطا در محاسبه امتیاز لید' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      lead_id: id,
      score: result.score,
      breakdown: result.breakdown,
    })
  } catch (error) {
    console.error('Lead score computation error:', error)
    return NextResponse.json(
      { error: 'خطا در محاسبه امتیاز لید' },
      { status: 500 }
    )
  }
}
