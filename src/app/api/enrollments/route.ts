import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { PaymentStatus, UserRole } from '@prisma/client'
import { getSession, isAuthorized } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'
import { getAgentStudentPhoneNumbers } from '@/lib/agent-scope'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const student_id = searchParams.get('student_id')
    const course_id = searchParams.get('course_id')
    const payment_status = searchParams.get('payment_status') as PaymentStatus | null

    const where: Record<string, any> = {}

    // Restrict access based on user role
    if (session.userRole === UserRole.STUDENT) {
      where.student_id = session.userId
    } else if (session.userRole === UserRole.SALES_AGENT) {
      // Sales agents can only see enrollments for students they converted themselves
      const phoneNumbers = await getAgentStudentPhoneNumbers(session.userId)
      where.student = { phone_number: { in: phoneNumbers } }
    } else {
      if (student_id) {
        where.student_id = student_id
      }
    }

    // Load current user profile for department filtering
    const userProfile = await db.user.findUnique({
      where: { id: session.userId },
      select: { department: true },
    })

    // Filter by course department for managers
    const isManager = session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER
    if (course_id || (isManager && userProfile?.department)) {
      where.course = {
        ...(course_id && { id: course_id }),
        ...(isManager && userProfile?.department && { department: userProfile.department })
      }
    }

    if (payment_status) {
      where.payment_status = payment_status
    }

    const enrollments = await db.enrollment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, phone_number: true, role: true },
        },
        course: {
          select: { id: true, title: true, price: true, is_active: true, department: true },
        },
      },
    })

    return NextResponse.json(enrollments)
  } catch (error) {
    console.error('Enrollments GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
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

    // Only Admin and Sales Manager can manually create enrollments
    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.DEPT_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { student_id, course_id, payment_status, enrollment_date } = body

    if (!student_id || !course_id) {
      return NextResponse.json(
        { error: 'student_id and course_id are required' },
        { status: 400 }
      )
    }

    // Check student exists
    const student = await db.user.findUnique({ where: { id: student_id } })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Check course exists
    const course = await db.course.findUnique({ where: { id: course_id } })
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Verify course department matches manager's department
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department && course.department !== userProfile.department) {
        return NextResponse.json({ error: 'Forbidden: Course belongs to another department' }, { status: 403 })
      }
    }

    // Check for duplicate enrollment
    const existingEnrollment = await db.enrollment.findFirst({
      where: { student_id, course_id },
    })
    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'Student is already enrolled in this course' },
        { status: 409 }
      )
    }

    const enrollment = await db.enrollment.create({
      data: {
        student_id,
        course_id,
        payment_status: payment_status || PaymentStatus.PAID,
        enrollment_date: enrollment_date ? new Date(enrollment_date) : new Date(),
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
      'CREATE_ENROLLMENT',
      `Enrolled student "${enrollment.student.first_name} ${enrollment.student.last_name}" in course "${enrollment.course.title}"`
    )

    return NextResponse.json(enrollment, { status: 201 })
  } catch (error) {
    console.error('Enrollments POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
      { status: 500 }
    )
  }
}
