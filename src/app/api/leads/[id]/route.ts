import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

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

    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, role: true, phone_number: true, department: true },
        },
        target_course: {
          select: { id: true, title: true, price: true, is_active: true },
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            agent: {
              select: { id: true, first_name: true, last_name: true },
            },
          },
        },
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Access control check
    if (session.userRole !== 'ADMIN') {
      if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
        const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
        if (userProfile?.department) {
          const isLeadDeptMatch = lead.department === userProfile.department
          const isAgentDeptMatch = lead.assigned_to?.department === userProfile.department
          if (!isLeadDeptMatch && !isAgentDeptMatch) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          }
        }
        // Managers without a department may view any lead
      } else {
        // SALES_AGENT, MENTOR, etc. can only view their own assigned leads
        if (lead.assigned_to_id !== session.userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Lead GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lead' },
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
    const {
      phone_number,
      first_name,
      last_name,
      source,
      status,
      notes,
      assigned_to_id,
      target_course_id,
      department,
      next_followup_date,
    } = body

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
        }
        // Managers without a department may update any lead
      } else {
        // SALES_AGENT, MENTOR, etc. can only update their own assigned leads
        if (existing.assigned_to_id !== session.userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    // Sales Agents cannot reassign lead to other agents
    if (session.userRole === 'SALES_AGENT' && assigned_to_id !== undefined && assigned_to_id !== existing.assigned_to_id) {
      return NextResponse.json({ error: 'Sales agents cannot reassign leads' }, { status: 403 })
    }

    // Prevent managers from assigning to agents in other departments
    if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      if (userProfile?.department && assigned_to_id) {
        const targetAgent = await db.user.findUnique({ where: { id: assigned_to_id } })
        if (targetAgent && targetAgent.department !== userProfile.department) {
          return NextResponse.json({ error: 'Cannot assign lead to an agent in a different department' }, { status: 403 })
        }
      }
    }

    const lead = await db.lead.update({
      where: { id },
      data: {
        ...(phone_number !== undefined && { phone_number }),
        ...(first_name !== undefined && { first_name }),
        ...(last_name !== undefined && { last_name }),
        ...(source !== undefined && { source }),
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(assigned_to_id !== undefined && { assigned_to_id: assigned_to_id || null }),
        ...(target_course_id !== undefined && { target_course_id: target_course_id || null }),
        ...(department !== undefined && { department }),
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

    // Update follow-up if next_followup_date is provided
    if (next_followup_date) {
      const followupDate = new Date(next_followup_date)

      // Delete only the auto-created follow-up reminder task for this lead
      // (never wipe other pending tasks the agent created manually).
      await db.task.deleteMany({
        where: {
          lead_id: id,
          status: 'PENDING',
          title: { contains: 'تماس پیگیری' },
        },
      })

      // Create new task with reminder (calls themselves are logged manually
      // by the agent — the system only schedules the reminder task)
      await db.task.create({
        data: {
          lead_id: id,
          agent_id: lead.assigned_to_id || session.userId,
          title: `تماس پیگیری با لید: ${lead.first_name} ${lead.last_name}`,
          due_date: followupDate,
          reminder_time: 15,
          reminder_sent: false,
        },
      })
    }

    // Create system interaction for status change
    if (status && status !== existing.status) {
      await db.interaction.create({
        data: {
          lead_id: id,
          agent_id: session.userId || 'system',
          interaction_type: 'SYSTEM',
          content: `Lead status changed from ${existing.status} to ${status}`,
        },
      })
      await logActivity(
        request,
        'UPDATE_LEAD_STATUS',
        `Changed lead "${lead.first_name} ${lead.last_name}" status from ${existing.status} to ${status}`
      )
    } else {
      await logActivity(
        request,
        'UPDATE_LEAD',
        `Updated lead details for "${lead.first_name} ${lead.last_name}"`
      )
    }

    return NextResponse.json(lead)
  } catch (error) {
    console.error('Lead PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
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

    // Only Admins, Sales Managers and Dept Managers can delete leads
    if (
      session.userRole !== 'ADMIN' &&
      session.userRole !== 'SALES_MANAGER' &&
      session.userRole !== 'DEPT_MANAGER'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check lead exists
    const existing = await db.lead.findUnique({
      where: { id },
      include: { assigned_to: true }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Department filtering for managers
    if (session.userRole === 'SALES_MANAGER' || session.userRole === 'DEPT_MANAGER') {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        const isLeadDeptMatch = existing.department === userProfile.department
        const isAgentDeptMatch = existing.assigned_to?.department === userProfile.department
        if (!isLeadDeptMatch && !isAgentDeptMatch) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
      // Managers without a department may delete any lead
    }

    // Delete lead (interactions will cascade delete)
    await db.lead.delete({ where: { id } })

    await logActivity(
      request,
      'DELETE_LEAD',
      `Deleted lead "${existing.first_name} ${existing.last_name}" (Phone: ${existing.phone_number})`
    )

    return NextResponse.json({ message: 'Lead deleted successfully' })
  } catch (error) {
    console.error('Lead DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    )
  }
}
