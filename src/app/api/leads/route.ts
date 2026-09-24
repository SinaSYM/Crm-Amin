import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { LeadStatus } from '@prisma/client'
import { computeAndSaveLeadScore } from '@/lib/lead-scoring/compute'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.userRole === 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status') as LeadStatus | null
    const assigned_to_id = searchParams.get('assigned_to_id')
    const search = searchParams.get('search')
    const source = searchParams.get('source')
    const target_course_id = searchParams.get('target_course_id')

    const where: Record<string, unknown> = {}

    // Load current user profile for department filtering
    const userProfile = await db.user.findUnique({
      where: { id: session.userId },
      select: { department: true },
    })

    // Restrict based on role hierarchy and department
    if (session.userRole === 'ADMIN') {
      if (assigned_to_id) {
        where.assigned_to_id = assigned_to_id
      }
    } else if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      if (userProfile?.department) {
        where.OR = [
          { department: userProfile.department },
          { assigned_to: { department: userProfile.department } }
        ]
      }
      // Managers without a department see all leads
      if (assigned_to_id) {
        where.assigned_to_id = assigned_to_id
      }
    } else {
      // SALES_AGENT, MENTOR, etc. see only their own assigned leads
      where.assigned_to_id = session.userId
    }

    if (status) {
      where.status = status
    }
    if (source) {
      where.source = source
    }
    if (target_course_id) {
      where.target_course_id = target_course_id
    }
    if (search) {
      const searchOr = [
        { first_name: { contains: search } },
        { last_name: { contains: search } },
        { phone_number: { contains: search } },
        { notes: { contains: search } },
      ]
      if (where.OR) {
        // The department/role OR filter is already set — combine it with the
        // search so searching can never bypass department isolation.
        where.AND = [{ OR: where.OR }, { OR: searchOr }]
        delete where.OR
      } else {
        where.OR = searchOr
      }
    }

    const leads = await db.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
        target_course: {
          select: { id: true, title: true, price: true },
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            agent: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
        _count: {
          select: { interactions: true },
        },
      },
    })

    return NextResponse.json(leads)
  } catch (error) {
    console.error('Leads GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.userRole === 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      phone_number,
      first_name,
      last_name,
      source,
      status,
      notes,
      assigned_to_id,
      target_course_id,
      referral_code,
      department,
      next_followup_date,
    } = body

    if (!phone_number) {
      return NextResponse.json(
        { error: 'phone_number is required' },
        { status: 400 }
      )
    }

    if (!next_followup_date) {
      return NextResponse.json(
        { error: 'next_followup_date is required' },
        { status: 400 }
      )
    }

    // Restrict agents to only assigning leads to themselves
    let targetAgentId = assigned_to_id || null
    if (session.userRole === 'SALES_AGENT') {
      targetAgentId = session.userId
    }

    const userProfile = await db.user.findUnique({
      where: { id: session.userId },
      select: { department: true },
    })

    // Restrict managers to only assigning leads to agents in their department
    if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      if (userProfile?.department && targetAgentId) {
        const targetAgent = await db.user.findUnique({ where: { id: targetAgentId } })
        if (targetAgent && targetAgent.department !== userProfile.department) {
          return NextResponse.json({ error: 'Cannot assign lead to an agent in a different department' }, { status: 403 })
        }
      }
    }

    // Resolve referred_by_id if referral_code is provided
    let referred_by_id: string | null = null
    if (referral_code) {
      const referrer = await db.user.findUnique({
        where: { referral_code },
      })
      if (referrer) {
        referred_by_id = referrer.id
      }
    }

    // Set department automatically to creator's department if creator is a manager
    let leadDept = department || null
    if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      if (userProfile?.department) {
        leadDept = userProfile.department
      }
    } else {
      // For Admins/etc. use target department or fallback to their own
      if (!leadDept && userProfile?.department) {
        leadDept = userProfile.department
      }
    }

    const lead = await db.lead.create({
      data: {
        phone_number,
        first_name: first_name || '',
        last_name: last_name || '',
        source: source || 'manual',
        status: status || LeadStatus.NEW,
        notes: notes || '',
        assigned_to_id: targetAgentId,
        referred_by_id: referred_by_id,
        target_course_id: target_course_id || null,
        department: leadDept,
      },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
        target_course: {
          select: { id: true, title: true, price: true },
        },
      },
    })

    // Create a system interaction for lead creation
    await db.interaction.create({
      data: {
        lead_id: lead.id,
        agent_id: targetAgentId || session.userId || 'system',
        interaction_type: 'SYSTEM',
        content: `Lead created from source: ${source || 'manual'}${referred_by_id ? ' (معرفی شده توسط سیستم سفیران)' : ''}`,
      },
    })

    // Schedule the reminder task if next_followup_date is provided.
    // NOTE: no CALL interaction is auto-created here — follow-up calls are
    // logged manually by the agent from the lead detail page.
    if (next_followup_date) {
      const followupDate = new Date(next_followup_date)

      await db.task.create({
        data: {
          lead_id: lead.id,
          agent_id: targetAgentId || session.userId,
          title: `تماس پیگیری با لید: ${lead.first_name} ${lead.last_name}`,
          due_date: followupDate,
          reminder_time: 15,
          reminder_sent: false,
        },
      })
    }

    // Log Activity
    await logActivity(
      request,
      'CREATE_LEAD',
      `Created lead "${lead.first_name} ${lead.last_name}" (Phone: ${phone_number})`
    )

    // Score this one lead now so it doesn't sit at 0 until the next batch
    // recompute (single-record write, not a loop — safe to do inline)
    const scoreResult = await computeAndSaveLeadScore(lead.id)

    return NextResponse.json(
      scoreResult ? { ...lead, score: scoreResult.score } : lead,
      { status: 201 }
    )
  } catch (error) {
    console.error('Leads POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}
