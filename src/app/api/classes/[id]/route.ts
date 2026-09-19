import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAuthorized } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'
import { UserRole } from '@prisma/client'

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

    const classSession = await db.classSession.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true, department: true },
        },
      },
    })

    if (!classSession) {
      return NextResponse.json({ error: 'Class session not found' }, { status: 404 })
    }

    // Department filtering for managers
    const isManager = session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER'
    if (isManager) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department && classSession.course.department !== userProfile.department) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(classSession)
  } catch (error) {
    console.error('Class session GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class session' },
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

    // Only Admin, Education Officer, and Managers can modify class sessions
    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.EDUCATION_OFFICER, UserRole.DEPT_MANAGER, UserRole.SALES_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { course_id, title, date, link, archive_url } = body

    const existing = await db.classSession.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true, department: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Class session not found' }, { status: 404 })
    }

    const isManager = session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER'
    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })

    if (isManager) {
      if (userProfile?.department && existing.course.department !== userProfile.department) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (course_id !== undefined) {
      if (typeof course_id !== 'string' || course_id === null || course_id.trim() === '') {
        return NextResponse.json({ error: 'course_id must be a valid non-empty string' }, { status: 400 })
      }
      const course = await db.course.findUnique({ where: { id: course_id } })
      if (!course) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 })
      }
      if (isManager) {
        if (userProfile?.department && course.department !== userProfile.department) {
          return NextResponse.json({ error: 'Forbidden: Course belongs to another department' }, { status: 403 })
        }
      }
    }

    const updated = await db.classSession.update({
      where: { id },
      data: {
        ...(course_id !== undefined && { course_id }),
        ...(title !== undefined && { title }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(link !== undefined && { link: link || null }),
        ...(archive_url !== undefined && { archive_url: archive_url || null }),
      },
    })

    await logActivity(
      request,
      'UPDATE_CLASS_SESSION',
      `Updated class session "${updated.title}"`
    )

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Class session PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update class session' },
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

    // Only Admin, Education Officer, and Managers can delete class sessions
    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.EDUCATION_OFFICER, UserRole.DEPT_MANAGER, UserRole.SALES_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existing = await db.classSession.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, title: true, department: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Class session not found' }, { status: 404 })
    }

    const isManager = session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER'
    if (isManager) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department && existing.course.department !== userProfile.department) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await db.classSession.delete({
      where: { id },
    })

    await logActivity(
      request,
      'DELETE_CLASS_SESSION',
      `Deleted class session "${existing.course.title} - ${existing.title}"`
    )

    return NextResponse.json({ message: 'Class session deleted successfully' })
  } catch (error) {
    console.error('Class session DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete class session' },
      { status: 500 }
    )
  }
}
