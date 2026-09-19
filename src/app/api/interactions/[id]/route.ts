import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

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

    const interaction = await db.interaction.findUnique({
      where: { id },
      include: {
        lead: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            status: true,
            assigned_to_id: true,
          },
        },
        agent: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
      },
    })

    if (!interaction) {
      return NextResponse.json(
        { error: 'Interaction not found' },
        { status: 404 }
      )
    }

    // Sales agents can only view their own interactions
    if (session.userRole === 'SALES_AGENT' && interaction.agent_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Department isolation for managers
    if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        const lead = await db.lead.findUnique({ where: { id: interaction.lead_id }, include: { assigned_to: true } })
        const isLeadDeptMatch = lead?.department === userProfile.department
        const isAgentDeptMatch = lead?.assigned_to?.department === userProfile.department
        if (!isLeadDeptMatch && !isAgentDeptMatch) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    return NextResponse.json(interaction)
  } catch (error) {
    console.error('Interaction GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch interaction' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const body = await request.json()
    const { interaction_type, content, next_followup_date } = body

    // Check interaction exists
    const existing = await db.interaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Interaction not found' },
        { status: 404 }
      )
    }

    // Sales agents can only update their own interactions
    if (session.userRole === 'SALES_AGENT' && existing.agent_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Department isolation for managers
    if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        const lead = await db.lead.findUnique({ where: { id: existing.lead_id }, include: { assigned_to: true } })
        const isLeadDeptMatch = lead?.department === userProfile.department
        const isAgentDeptMatch = lead?.assigned_to?.department === userProfile.department
        if (!isLeadDeptMatch && !isAgentDeptMatch) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    const interaction = await db.interaction.update({
      where: { id },
      data: {
        ...(interaction_type !== undefined && { interaction_type }),
        ...(content !== undefined && { content }),
        ...(next_followup_date !== undefined && {
          next_followup_date: next_followup_date ? new Date(next_followup_date) : null,
        }),
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

    return NextResponse.json(interaction)
  } catch (error) {
    console.error('Interaction PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update interaction' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only managers and admins can delete interactions
    if (
      session.userRole !== 'ADMIN' &&
      session.userRole !== 'SALES_MANAGER' &&
      session.userRole !== 'DEPT_MANAGER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check interaction exists
    const existing = await db.interaction.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Interaction not found' },
        { status: 404 }
      )
    }

    // Department isolation for managers
    if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        const lead = await db.lead.findUnique({ where: { id: existing.lead_id }, include: { assigned_to: true } })
        const isLeadDeptMatch = lead?.department === userProfile.department
        const isAgentDeptMatch = lead?.assigned_to?.department === userProfile.department
        if (!isLeadDeptMatch && !isAgentDeptMatch) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    await db.interaction.delete({ where: { id } })

    return NextResponse.json({ message: 'Interaction deleted successfully' })
  } catch (error) {
    console.error('Interaction DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete interaction' },
      { status: 500 }
    )
  }
}
