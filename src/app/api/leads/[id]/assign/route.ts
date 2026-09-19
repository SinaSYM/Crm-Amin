import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAuthorized } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'
import { UserRole } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.DEPT_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { assigned_to_id } = body

    if (!assigned_to_id) {
      return NextResponse.json(
        { error: 'assigned_to_id is required' },
        { status: 400 }
      )
    }

    // Check lead exists
    const lead = await db.lead.findUnique({ where: { id } })
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Check agent exists and is active
    const agent = await db.user.findUnique({
      where: { id: assigned_to_id },
    })
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }
    if (!agent.is_active) {
      return NextResponse.json(
        { error: 'Agent is not active' },
        { status: 400 }
      )
    }
    if (agent.role !== 'SALES_AGENT' && agent.role !== 'SALES_MANAGER' && agent.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'User is not a sales agent or manager' },
        { status: 400 }
      )
    }

    // Department filtering for managers
    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
    let setDept: string | null | undefined = undefined
    if (session.userRole === UserRole.SALES_MANAGER || session.userRole === UserRole.DEPT_MANAGER) {
      if (userProfile?.department) {
        let existingAgentDept: string | null | undefined = null
        if (lead.assigned_to_id) {
          const existingAgent = await db.user.findUnique({ where: { id: lead.assigned_to_id } })
          existingAgentDept = existingAgent?.department
        }
        
        const isLeadDeptMatch = lead.department === userProfile.department
        const isAgentDeptMatch = existingAgentDept === userProfile.department

        if ((lead.department || lead.assigned_to_id) && !isLeadDeptMatch && !isAgentDeptMatch) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        if (agent.department !== userProfile.department) {
          return NextResponse.json({ error: 'Cannot assign lead to an agent in a different department' }, { status: 403 })
        }
        if (!lead.department) {
          setDept = userProfile.department
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Update lead assignment
    const updatedLead = await db.lead.update({
      where: { id },
      data: {
        assigned_to_id,
        ...(setDept !== undefined && { department: setDept }),
      },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
        target_course: {
          select: { id: true, title: true },
        },
      },
    })

    // Create system interaction for assignment
    await db.interaction.create({
      data: {
        lead_id: id,
        agent_id: assigned_to_id,
        interaction_type: 'SYSTEM',
        content: `Lead assigned to ${agent.first_name} ${agent.last_name}`,
      },
    })

    await logActivity(
      request,
      'ASSIGN_LEAD',
      `Assigned lead "${lead.first_name} ${lead.last_name}" to agent "${agent.first_name} ${agent.last_name}"`
    )

    return NextResponse.json(updatedLead)
  } catch (error) {
    console.error('Lead assign error:', error)
    return NextResponse.json(
      { error: 'Failed to assign lead' },
      { status: 500 }
    )
  }
}
