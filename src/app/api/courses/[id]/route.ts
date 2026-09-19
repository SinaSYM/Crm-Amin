import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAuthorized } from '@/lib/auth'
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

    // If Student or Sales Agent, we do not include full leads and enrollments lists to protect privacy
    const includeRelations = 
      session.userRole === UserRole.ADMIN || session.userRole === UserRole.SALES_MANAGER

    const course = await db.course.findUnique({
      where: { id },
      include: {
        ...(includeRelations && {
          leads: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              phone_number: true,
              status: true,
            },
          },
          enrollments: {
            include: {
              student: {
                select: { id: true, first_name: true, last_name: true, phone_number: true },
              },
            },
          },
        }),
        _count: {
          select: {
            leads: true,
            enrollments: true,
          },
        },
      },
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Add capacity utilization info
    const courseWithCapacity = {
      ...course,
      capacityInfo: {
        capacity: course.capacity,
        currentEnrollments: course._count.enrollments,
        availableSpots: Math.max(0, course.capacity - course._count.enrollments),
        utilizationPercentage:
          course.capacity > 0
            ? Math.round((course._count.enrollments / course.capacity) * 100)
            : 0,
      },
    }

    return NextResponse.json(courseWithCapacity)
  } catch (error) {
    console.error('Course GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch course' },
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

    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.SALES_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, price, capacity, is_active } = body

    // Check course exists
    const existing = await db.course.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    const course = await db.course.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(price !== undefined && { price: Number(price) }),
        ...(capacity !== undefined && { capacity: Number(capacity) }),
        ...(is_active !== undefined && { is_active }),
      },
    })

    return NextResponse.json(course)
  } catch (error) {
    console.error('Course PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update course' },
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

    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.SALES_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check course exists
    const existing = await db.course.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Detach leads pointing at this course and remove enrollments (payments
    // and class sessions cascade) before deleting — otherwise the FK
    // constraints on Lead.target_course / Enrollment.course make the delete
    // fail with a 500.
    await db.$transaction([
      db.lead.updateMany({ where: { target_course_id: id }, data: { target_course_id: null } }),
      db.enrollment.deleteMany({ where: { course_id: id } }),
      db.course.delete({ where: { id } }),
    ])

    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Course DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete course' },
      { status: 500 }
    )
  }
}
