import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const agentId = searchParams.get('agent_id')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}

    // Sales Agents can only see their own tasks
    if (session.userRole === 'SALES_AGENT') {
      where.agent_id = session.userId
    } else if (session.userRole === 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    } else {
      // Managers and admins can filter by agent_id
      if (agentId) {
        where.agent_id = agentId
      }

      // Department isolation for managers — a manager must not see tasks of
      // agents in other departments.
      if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
        const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
        if (userProfile?.department) {
          where.agent = { department: userProfile.department }
        }
      }
    }

    if (status) {
      where.status = status
    }

    const tasks = await db.task.findMany({
      where,
      orderBy: { due_date: 'asc' },
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
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Tasks GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
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
    const { agent_id, lead_id, title, description, due_date, reminder_time } = body

    if (!title || !due_date) {
      return NextResponse.json(
        { error: 'title and due_date are required' },
        { status: 400 }
      )
    }

    // The calendar UI creates tasks for the logged-in user and never sends
    // agent_id — default it to the session user instead of rejecting.
    const resolvedAgentId = agent_id || session.userId

    // Sales agents can only create tasks for themselves
    if (session.userRole === 'SALES_AGENT' && resolvedAgentId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate reminder_time: minutes before due_date, or null for none.
    let reminderTime: number | null = null
    if (reminder_time !== undefined && reminder_time !== null && reminder_time !== '') {
      const parsed = Number(reminder_time)
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 60 * 24 * 30) {
        return NextResponse.json(
          { error: 'reminder_time must be a number of minutes between 0 and 43200' },
          { status: 400 }
        )
      }
      reminderTime = Math.round(parsed)
    }

    const dueDate = new Date(due_date)
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: 'due_date is not a valid date' }, { status: 400 })
    }

    if (lead_id) {
      const leadExists = await db.lead.findUnique({ where: { id: lead_id }, select: { id: true } })
      if (!leadExists) {
        return NextResponse.json({ error: 'لید انتخاب‌شده یافت نشد' }, { status: 400 })
      }
    }

    const agentExists = await db.user.findUnique({ where: { id: resolvedAgentId }, select: { id: true } })
    if (!agentExists) {
      return NextResponse.json({ error: 'کاربر مسئول وظیفه یافت نشد' }, { status: 400 })
    }

    const task = await db.task.create({
      data: {
        agent_id: resolvedAgentId,
        lead_id: lead_id || null,
        title,
        description: description || '',
        due_date: dueDate,
        status: 'PENDING',
        reminder_time: reminderTime,
        reminder_sent: false,
      },
    })

    await logActivity(request, 'CREATE_TASK', `Created task "${title}" due ${dueDate.toISOString()}`)

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}
