import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { PaymentItemStatus, PaymentType, UserRole } from '@prisma/client'
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
    const enrollment_id = searchParams.get('enrollment_id')
    const status = searchParams.get('status') as PaymentItemStatus | null
    const payment_type = searchParams.get('payment_type') as PaymentType | null

    const where: Record<string, any> = {}

    // Load current user profile for department filtering
    const userProfile = await db.user.findUnique({
      where: { id: session.userId },
      select: { department: true },
    })

    const isManager = session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER

    // Restrict access based on user role
    if (session.userRole === UserRole.STUDENT) {
      where.enrollment = {
        student_id: session.userId
      }
    } else if (session.userRole === UserRole.SALES_AGENT) {
      // Sales agents can only see payments of students they converted themselves
      const phoneNumbers = await getAgentStudentPhoneNumbers(session.userId)
      where.enrollment = {
        student: { phone_number: { in: phoneNumbers } }
      }
    } else {
      if (enrollment_id) {
        where.enrollment_id = enrollment_id
      }
    }

    // Apply department filter for managers
    if (isManager && userProfile?.department) {
      where.enrollment = {
        ...(where.enrollment || {}),
        course: {
          department: userProfile.department
        }
      }
    }

    if (status) {
      where.status = status
    }
    if (payment_type) {
      where.payment_type = payment_type
    }

    const payments = await db.payment.findMany({
      where,
      orderBy: { due_date: 'asc' },
      include: {
        enrollment: {
          include: {
            student: {
              select: { id: true, first_name: true, last_name: true, phone_number: true },
            },
            course: {
              select: { id: true, title: true, price: true, department: true },
            },
          },
        },
      },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Payments GET error:', error)
    return NextResponse.json(
      { error: 'خطا در دریافت لیست پرداخت‌ها' },
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

    // Only Admin, Sales Manager, and Dept Manager can manually create payments
    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.DEPT_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const {
      enrollment_id,
      amount,
      payment_type,
      status,
      due_date,
      paid_date,
      description,
    } = body

    if (!enrollment_id || amount === undefined) {
      return NextResponse.json(
        { error: 'enrollment_id و amount الزامی هستند' },
        { status: 400 }
      )
    }

    // Verify enrollment exists
    const enrollment = await db.enrollment.findUnique({
      where: { id: enrollment_id },
    })
    if (!enrollment) {
      return NextResponse.json(
        { error: 'ثبت‌نام یافت نشد' },
        { status: 404 }
      )
    }

    // Verify enrollment's course department matches manager's department
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        const course = await db.course.findUnique({ where: { id: enrollment.course_id } })
        if (course?.department !== userProfile.department) {
          return NextResponse.json({ error: 'Forbidden: Course belongs to another department' }, { status: 403 })
        }
      }
    }

    if (!due_date) {
      return NextResponse.json(
        { error: 'due_date الزامی است' },
        { status: 400 }
      )
    }

    const payment = await db.payment.create({
      data: {
        enrollment_id,
        amount: Number(amount),
        payment_type: payment_type || PaymentType.FULL,
        status: status || PaymentItemStatus.PENDING,
        due_date: new Date(due_date),
        paid_date: paid_date ? new Date(paid_date) : null,
        description: description || '',
      },
      include: {
        enrollment: {
          include: {
            student: {
              select: { id: true, first_name: true, last_name: true, phone_number: true },
            },
            course: {
              select: { id: true, title: true, price: true },
            },
          },
        },
      },
    })

    await logActivity(
      request,
      'CREATE_PAYMENT',
      `Created payment of ${payment.amount} for enrollment ID ${payment.enrollment_id} (Student: ${payment.enrollment.student.first_name} ${payment.enrollment.student.last_name})`
    )

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Payments POST error:', error)
    return NextResponse.json(
      { error: 'خطا در ایجاد پرداخت' },
      { status: 500 }
    )
  }
}
