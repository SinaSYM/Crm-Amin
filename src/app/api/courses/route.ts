import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAuthorized } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const is_active = searchParams.get('is_active')

    const where: Record<string, unknown> = {}

    if (is_active !== null && is_active !== undefined) {
      where.is_active = is_active === 'true'
    }

    // Department isolation for managers — without this a manager sees every
    // department's courses (and revenue data) in dropdowns and lists.
    if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        where.department = userProfile.department
      }
    }

    const courses = await db.course.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            leads: true,
            enrollments: true,
          },
        },
      },
    })

    // Add capacity utilization info
    const coursesWithCapacity = courses.map((course) => ({
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
    }))

    return NextResponse.json(coursesWithCapacity)
  } catch (error) {
    console.error('Courses GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
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

    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.SALES_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { title, price, capacity, is_active } = body

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      )
    }

    const course = await db.course.create({
      data: {
        title,
        price: price !== undefined ? Number(price) : 0,
        capacity: capacity !== undefined ? Number(capacity) : 30,
        is_active: is_active !== undefined ? is_active : true,
      },
    })

    return NextResponse.json(course, { status: 201 })
  } catch (error) {
    console.error('Courses POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    )
  }
}
