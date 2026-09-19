import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { getAgentStudentPhoneNumbers, isAgentOwnerOfStudent } from '@/lib/agent-scope'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const studentId = searchParams.get('student_id')

    const where: Record<string, any> = {}

    // Restrict access based on user role
    if (session.userRole === UserRole.STUDENT) {
      where.student_id = session.userId
    } else if (session.userRole === UserRole.SALES_AGENT) {
      // Sales agents can only see tickets of students they converted themselves
      const phoneNumbers = await getAgentStudentPhoneNumbers(session.userId)
      where.student = { phone_number: { in: phoneNumbers } }
    } else {
      if (studentId) {
        where.student_id = studentId
      }
    }

    // Department filter for managers (previously missing — managers saw org-wide tickets)
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        where.student = { ...(where.student || {}), department: userProfile.department }
      }
    }

    const tickets = await db.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Tickets GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
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

    const body = await request.json()
    const { student_id, title, description, priority } = body

    if (!student_id || !title || !description) {
      return NextResponse.json(
        { error: 'student_id, title, and description are required' },
        { status: 400 }
      )
    }

    // Students can only create tickets for themselves
    let targetStudentId = student_id
    if (session.userRole === UserRole.STUDENT) {
      targetStudentId = session.userId
    }

    // Sales agents can only create tickets for students they converted themselves
    if (session.userRole === UserRole.SALES_AGENT) {
      const owns = await isAgentOwnerOfStudent(session.userId, targetStudentId)
      if (!owns) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const ticket = await db.ticket.create({
      data: {
        student_id: targetStudentId,
        title,
        description,
        priority: priority || 'NORMAL',
        status: 'PENDING',
      },
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Tickets POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    )
  }
}
