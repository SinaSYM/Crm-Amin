import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { isAgentOwnerOfStudent } from '@/lib/agent-scope'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch existing ticket
    const ticket = await db.ticket.findUnique({
      where: { id },
      include: {
        student: true
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Role-based restrictions
    if (session.userRole === UserRole.STUDENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.userRole === UserRole.SALES_AGENT) {
      // Sales Agents can only modify tickets of students they converted themselves
      const owns = await isAgentOwnerOfStudent(session.userId, ticket.student_id)
      if (!owns) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { status, priority } = body

    const data: Record<string, unknown> = {}
    if (status !== undefined) data.status = status
    if (priority !== undefined) data.priority = priority

    const updated = await db.ticket.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Ticket PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    )
  }
}
