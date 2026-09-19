import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { InteractionType } from '@prisma/client'
import { getSession } from '@/lib/auth'

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
    const lead_id = searchParams.get('lead_id')
    const agent_id = searchParams.get('agent_id')
    const interaction_type = searchParams.get('interaction_type') as InteractionType | null
    const has_followup = searchParams.get('has_followup')

    const where: Record<string, unknown> = {}

    if (lead_id) {
      where.lead_id = lead_id
    }

    // Sales Agents can only view their own interactions
    if (session.userRole === 'SALES_AGENT') {
      where.agent_id = session.userId
    } else {
      if (agent_id) {
        where.agent_id = agent_id
      }

      // Department isolation for managers — without this a manager could
      // read every department's interactions via the list or ?lead_id=.
      if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
        const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
        if (userProfile?.department) {
          where.lead = {
            OR: [
              { department: userProfile.department },
              { assigned_to: { department: userProfile.department } },
            ],
          }
        }
      }
    }

    if (interaction_type) {
      where.interaction_type = interaction_type
    }
    if (has_followup === 'true') {
      where.next_followup_date = { not: null }
    }

    const interactions = await db.interaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            status: true,
          },
        },
        agent: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
      },
    })

    return NextResponse.json(interactions)
  } catch (error) {
    console.error('Interactions GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch interactions' },
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
    const { lead_id, agent_id, interaction_type, content, next_followup_date } = body

    if (!lead_id || !agent_id || !content) {
      return NextResponse.json(
        { error: 'lead_id, agent_id, and content are required' },
        { status: 400 }
      )
    }

    // Sales agents can only create interactions for themselves
    if (session.userRole === 'SALES_AGENT' && agent_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check lead exists
    const lead = await db.lead.findUnique({ where: { id: lead_id }, include: { assigned_to: true } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Sales agents can only interact with their own assigned leads
    if (session.userRole === 'SALES_AGENT' && lead.assigned_to_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Managers can only interact with leads in their own department
    if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        const isLeadDeptMatch = lead.department === userProfile.department
        const isAgentDeptMatch = lead.assigned_to?.department === userProfile.department
        if (!isLeadDeptMatch && !isAgentDeptMatch) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    // Check agent exists
    const agent = await db.user.findUnique({ where: { id: agent_id } })
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const interaction = await db.interaction.create({
      data: {
        lead_id,
        agent_id,
        interaction_type: interaction_type || InteractionType.NOTE,
        content,
        next_followup_date: next_followup_date ? new Date(next_followup_date) : null,
      },
      include: {
        lead: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone_number: true,
          },
        },
        agent: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    })

    // Auto-update lead status to CONTACTED if it was NEW
    if (lead.status === 'NEW') {
      await db.lead.update({
        where: { id: lead_id },
        data: { status: 'CONTACTED' },
      })
    }

    return NextResponse.json(interaction, { status: 201 })
  } catch (error) {
    console.error('Interactions POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create interaction' },
      { status: 500 }
    )
  }
}
