import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAuthorized } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { logActivity } from '@/lib/activity-logger'
import { isAgentOwnerOfStudent } from '@/lib/agent-scope'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const enrollment = await db.enrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, phone_number: true, role: true },
        },
        course: {
          select: { id: true, title: true, price: true, is_active: true, department: true },
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      )
    }

    // Students can only view their own enrollments
    if (session.userRole === UserRole.STUDENT && enrollment.student_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Sales Agents can only view enrollments of students they converted themselves
    if (session.userRole === UserRole.SALES_AGENT) {
      const owns = await isAgentOwnerOfStudent(session.userId, enrollment.student_id)
      if (!owns) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Department filtering for managers
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department && enrollment.course.department !== userProfile.department) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(enrollment)
  } catch (error) {
    console.error('Enrollment GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrollment' },
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

    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.DEPT_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { payment_status, enrollment_date } = body

    // Check enrollment exists
    const existing = await db.enrollment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      )
    }

    // Department filtering for managers
    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const course = await db.course.findUnique({ where: { id: existing.course_id } })
      if (userProfile?.department && course?.department !== userProfile.department) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const enrollment = await db.enrollment.update({
      where: { id },
      data: {
        ...(payment_status !== undefined && { payment_status }),
        ...(enrollment_date !== undefined && {
          enrollment_date: new Date(enrollment_date),
        }),
      },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, phone_number: true },
        },
        course: {
          select: { id: true, title: true, price: true },
        },
      },
    })

    await logActivity(
      request,
      'UPDATE_ENROLLMENT',
      `Updated enrollment status/details for "${enrollment.student.first_name} ${enrollment.student.last_name}" (Course: ${enrollment.course.title})`
    )

    return NextResponse.json(enrollment)
  } catch (error) {
    console.error('Enrollment PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update enrollment' },
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

    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.DEPT_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check enrollment exists
    const existing = await db.enrollment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      )
    }

    // Department filtering for managers
    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const course = await db.course.findUnique({ where: { id: existing.course_id } })
      if (userProfile?.department && course?.department !== userProfile.department) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await db.enrollment.delete({ where: { id } })

    await logActivity(
      request,
      'DELETE_ENROLLMENT',
      `Deleted enrollment ID ${id} for student ID ${existing.student_id}`
    )

    return NextResponse.json({ message: 'Enrollment deleted successfully' })
  } catch (error) {
    console.error('Enrollment DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete enrollment' },
      { status: 500 }
    )
  }
}
