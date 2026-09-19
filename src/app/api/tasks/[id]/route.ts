import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

/**
 * Resolve the task and enforce role/department/ownership access.
 * Returns either the task or a NextResponse to short-circuit with.
 */
async function resolveAuthorizedTask(request: NextRequest, id: string) {
  const session = await getSession(request)
  if (!session) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  if (session.userRole === 'STUDENT') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  const existingTask = await db.task.findUnique({ where: { id } })
  if (!existingTask) {
    return { error: NextResponse.json({ error: 'Task not found' }, { status: 404 }) }
  }

  // Sales agents can only modify their own tasks
  if (session.userRole === 'SALES_AGENT' && existingTask.agent_id !== session.userId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  // Department isolation for managers
  if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
    if (userProfile?.department) {
      const taskAgent = await db.user.findUnique({ where: { id: existingTask.agent_id }, select: { department: true } })
      if (taskAgent?.department !== userProfile.department) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
      }
    }
  }

  return { task: existingTask, session }
}

async function parseUpdateData(body: Record<string, unknown>): Promise<{ data: Record<string, unknown>; error?: string }> {
  const { status, title, description, due_date, reminder_time } = body
  const data: Record<string, unknown> = {}

  if (status !== undefined) data.status = status
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description
  if (due_date !== undefined) {
    const dueDate = new Date(String(due_date))
    if (Number.isNaN(dueDate.getTime())) return { data: {}, error: 'due_date is not a valid date' }
    data.due_date = dueDate
  }
  if (reminder_time !== undefined) {
    if (reminder_time === null || reminder_time === '') {
      data.reminder_time = null
    } else {
      const parsed = Number(reminder_time)
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 60 * 24 * 30) {
        return { data: {}, error: 'reminder_time must be a number of minutes between 0 and 43200' }
      }
      data.reminder_time = Math.round(parsed)
      // A changed reminder plan should be eligible to fire again.
      data.reminder_sent = false
    }
  }

  return { data }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolved = await resolveAuthorizedTask(request, (await params).id)
    if (resolved.error) return resolved.error

    const task = await db.task.findUnique({
      where: { id: (await params).id },
      include: {
        lead: {
          select: { id: true, first_name: true, last_name: true, phone_number: true, status: true },
        },
      },
    })
    return NextResponse.json(task)
  } catch (error) {
    console.error('Task GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 })
  }
}

// The client sends PUT for status toggles; keep PATCH for API consistency.
// Both apply the same partial update.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resolved = await resolveAuthorizedTask(request, id)
    if (resolved.error) return resolved.error

    const body = await request.json()
    const { data, error } = await parseUpdateData(body)
    if (error) return NextResponse.json({ error }, { status: 400 })

    const updated = await db.task.update({ where: { id }, data })
    await logActivity(request, 'UPDATE_TASK', `Updated task "${updated.title}" (${id})`)
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Task PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resolved = await resolveAuthorizedTask(request, id)
    if (resolved.error) return resolved.error

    const body = await request.json()
    const { data, error } = await parseUpdateData(body)
    if (error) return NextResponse.json({ error }, { status: 400 })

    const updated = await db.task.update({ where: { id }, data })
    if (data.status === 'COMPLETED') {
      await logActivity(request, 'COMPLETE_TASK', `Completed task "${updated.title}" (${id})`)
    } else {
      await logActivity(request, 'UPDATE_TASK', `Updated task "${updated.title}" (${id})`)
    }
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Task PUT error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const resolved = await resolveAuthorizedTask(request, id)
    if (resolved.error) return resolved.error

    await db.task.delete({ where: { id } })
    await logActivity(request, 'DELETE_TASK', `Deleted task (${id})`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Task DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
  }
}
