import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession, isAuthorized } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'
import { UserRole } from '@prisma/client'

type LeadStatus = 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'CONVERTED'

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.DEPT_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, lead_ids, data } = body as {
      action: 'assign' | 'status' | 'delete'
      lead_ids: string[]
      data?: { assigned_to_id?: string; status?: string }
    }

    // Validate lead_ids
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return NextResponse.json(
        { error: 'شناسه لیدها نمی‌تواند خالی باشد' },
        { status: 400 }
      )
    }

    // Load current user profile for department filtering
    const userProfile = await db.user.findUnique({
      where: { id: session.userId },
      select: { department: true },
    })

    // Fetch the target leads to check departments
    const targetLeads = await db.lead.findMany({
      where: { id: { in: lead_ids } },
      include: { assigned_to: true }
    })

    if (session.userRole !== 'ADMIN') {
      if (session.userRole === UserRole.SALES_MANAGER || session.userRole === UserRole.DEPT_MANAGER) {
        if (userProfile?.department) {
          const hasForbiddenLeads = targetLeads.some(lead => {
            const isLeadDeptMatch = lead.department === userProfile.department
            const isAgentDeptMatch = lead.assigned_to?.department === userProfile.department
            return !isLeadDeptMatch && !isAgentDeptMatch
          })
          if (hasForbiddenLeads) {
            return NextResponse.json(
              { error: 'Forbidden: One or more leads belong to another department' },
              { status: 403 }
            )
          }
        } else {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        // SALES_AGENT, MENTOR, etc. can only update their own leads
        const hasForbiddenLeads = targetLeads.some(l => l.assigned_to_id !== session.userId)
        if (hasForbiddenLeads) {
          return NextResponse.json(
            { error: 'Forbidden: You can only bulk update your own leads' },
            { status: 403 }
          )
        }
      }
    }

    let successCount = 0
    const errors: string[] = []

    switch (action) {
      case 'assign': {
        if (!data?.assigned_to_id) {
          return NextResponse.json(
            { error: 'کارشناس فروش باید مشخص شود' },
            { status: 400 }
          )
        }

        // Verify the agent exists
        const agent = await db.user.findUnique({
          where: { id: data.assigned_to_id },
        })
        if (!agent) {
          return NextResponse.json(
            { error: 'کارشناس فروش یافت نشد' },
            { status: 404 }
          )
        }

        // Verify agent department matches manager's department
        if (session.userRole === UserRole.SALES_MANAGER || session.userRole === UserRole.DEPT_MANAGER) {
          if (userProfile?.department && agent.department !== userProfile.department) {
            return NextResponse.json(
              { error: 'Forbidden: Agent belongs to another department' },
              { status: 403 }
            )
          }
        }

        for (const leadId of lead_ids) {
          try {
            const lead = targetLeads.find(l => l.id === leadId)
            if (!lead) {
              errors.push(`لید ${leadId} یافت نشد`)
              continue
            }

            await db.lead.update({
              where: { id: leadId },
              data: { assigned_to_id: data.assigned_to_id },
            })

            // Create system interaction for the assignment
            await db.interaction.create({
              data: {
                lead_id: leadId,
                agent_id: data.assigned_to_id,
                interaction_type: 'SYSTEM',
                content: `تخصیص دسته‌ای لید به ${agent.first_name} ${agent.last_name}`,
              },
            })

            successCount++
          } catch {
            errors.push(`خطا در تخصیص لید ${leadId}`)
          }
        }
        break
      }

      case 'status': {
        if (!data?.status) {
          return NextResponse.json(
            { error: 'وضعیت جدید باید مشخص شود' },
            { status: 400 }
          )
        }

        const validStatuses = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'CONVERTED']
        if (!validStatuses.includes(data.status)) {
          return NextResponse.json(
            { error: 'وضعیت نامعتبر' },
            { status: 400 }
          )
        }

        for (const leadId of lead_ids) {
          try {
            const lead = targetLeads.find(l => l.id === leadId)
            if (!lead) {
              errors.push(`لید ${leadId} یافت نشد`)
              continue
            }

            await db.lead.update({
              where: { id: leadId },
              data: { status: data.status as LeadStatus },
            })

            // Create system interaction for the status change
            const agentId = lead.assigned_to_id || session.userId
            await db.interaction.create({
              data: {
                lead_id: leadId,
                agent_id: agentId,
                interaction_type: 'SYSTEM',
                content: `تغییر وضعیت دسته‌ای از ${lead.status} به ${data.status}`,
              },
            })

            successCount++
          } catch {
            errors.push(`خطا در تغییر وضعیت لید ${leadId}`)
          }
        }
        break
      }

      case 'delete': {
        for (const leadId of lead_ids) {
          try {
            const lead = targetLeads.find(l => l.id === leadId)
            if (!lead) {
              errors.push(`لید ${leadId} یافت نشد`)
              continue
            }

            // Delete interactions first (though cascade should handle this)
            await db.interaction.deleteMany({
              where: { lead_id: leadId },
            })

            // Delete the lead
            await db.lead.delete({
              where: { id: leadId },
            })

            successCount++
          } catch {
            errors.push(`خطا در حذف لید ${leadId}`)
          }
        }
        break
      }

      default:
        return NextResponse.json(
          { error: 'عملیات نامعتبر. مقادیر مجاز: assign, status, delete' },
          { status: 400 }
        )
    }

    await logActivity(
      request,
      'BULK_ACTION_LEADS',
      `Performed bulk "${action}" on ${successCount} leads (Failed: ${errors.length})`
    )

    return NextResponse.json({
      success: true,
      successCount,
      errorCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json(
      { error: 'خطا در پردازش عملیات دسته‌ای' },
      { status: 500 }
    )
  }
}
