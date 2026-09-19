import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { LeadStatus, UserRole } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.userRole === UserRole.STUDENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    // Validate status value
    const validStatuses = Object.values(LeadStatus) as string[]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Valid values: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Check lead exists
    const existing = await db.lead.findUnique({
      where: { id },
      include: { assigned_to: true }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })

    // Access control check
    if (session.userRole !== 'ADMIN') {
      if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
        if (userProfile?.department) {
          const isLeadDeptMatch = existing.department === userProfile.department
          const isAgentDeptMatch = existing.assigned_to?.department === userProfile.department
          if (!isLeadDeptMatch && !isAgentDeptMatch) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          }
        } else {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        // SALES_AGENT, MENTOR, etc. can only update their own assigned leads
        if (existing.assigned_to_id !== session.userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    const previousStatus = existing.status

    // Update lead status
    const updatedLead = await db.lead.update({
      where: { id },
      data: { status: status as LeadStatus },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
        target_course: {
          select: { id: true, title: true },
        },
      },
    })

    // Create system interaction for status change
    if (previousStatus !== status) {
      await db.interaction.create({
        data: {
          lead_id: id,
          agent_id: session.userId || 'system',
          interaction_type: 'SYSTEM',
          content: `Lead status changed from ${previousStatus} to ${status}`,
        },
      })

      await logActivity(
        request,
        'UPDATE_LEAD_STATUS',
        `Changed status of lead "${existing.first_name} ${existing.last_name}" from ${previousStatus} to ${status}`
      )
    }

    return NextResponse.json(updatedLead)
  } catch (error) {
    console.error('Lead status change error:', error)
    return NextResponse.json(
      { error: 'Failed to change lead status' },
      { status: 500 }
    )
  }
}
