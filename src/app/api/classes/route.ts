import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const studentId = searchParams.get('student_id')
    const courseId = searchParams.get('course_id')

    const where: Record<string, unknown> = {}

    if (courseId) {
      where.course_id = courseId
    } else if (studentId) {
      // Find courses the student is enrolled in
      const enrollments = await db.enrollment.findMany({
        where: { student_id: studentId },
        select: { course_id: true },
      })
      const courseIds = enrollments.map((e) => e.course_id)
      where.course_id = { in: courseIds }
    }

    // Filter by course department if manager
    const isManager = session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER'
    if (isManager) {
      const userProfile = await db.user.findUnique({
        where: { id: session.userId },
        select: { department: true },
      })
      if (userProfile?.department) {
        where.course = {
          department: userProfile.department,
        }
      }
    }

    const classes = await db.classSession.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            department: true,
          },
        },
      },
    })

    return NextResponse.json(classes)
  } catch (error) {
    console.error('Classes GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch class sessions' },
      { status: 500 }
    )
  }
}

