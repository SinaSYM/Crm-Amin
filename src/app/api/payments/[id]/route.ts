import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { PaymentItemStatus, UserRole } from '@prisma/client'
import { getSession, isAuthorized } from '@/lib/auth'
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

    const payment = await db.payment.findUnique({
      where: { id },
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

    if (!payment) {
      return NextResponse.json(
        { error: 'پرداخت یافت نشد' },
        { status: 404 }
      )
    }

    // Students can only view their own payments
    if (session.userRole === UserRole.STUDENT && payment.enrollment.student_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Sales Agents can only view payments of students they converted themselves
    if (session.userRole === UserRole.SALES_AGENT) {
      const owns = await isAgentOwnerOfStudent(session.userId, payment.enrollment.student_id)
      if (!owns) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Department filtering for managers
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department && payment.enrollment.course.department !== userProfile.department) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Payment GET error:', error)
    return NextResponse.json(
      { error: 'خطا در دریافت اطلاعات پرداخت' },
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
    const { amount, status, due_date, paid_date, description } = body

    // Check payment exists
    const existing = await db.payment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'پرداخت یافت نشد' },
        { status: 404 }
      )
    }

    // Department filtering for managers
    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const enrollment = await db.enrollment.findUnique({ where: { id: existing.enrollment_id } })
      if (enrollment) {
        const course = await db.course.findUnique({ where: { id: enrollment.course_id } })
        if (userProfile?.department && course?.department !== userProfile.department) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    // If marking as PAID, set paid_date to now if not provided
    const updateData: Record<string, unknown> = {}
    if (amount !== undefined) updateData.amount = Number(amount)
    if (status !== undefined) {
      // Validate status value
      const validStatuses = Object.values(PaymentItemStatus) as string[]
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `وضعیت نامعتبر. مقادیر معتبر: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      updateData.status = status
      // Auto-set paid_date when marking as PAID
      if (status === PaymentItemStatus.PAID && !paid_date) {
        updateData.paid_date = new Date()
      }
    }
    if (due_date !== undefined) updateData.due_date = new Date(due_date)
    if (paid_date !== undefined) updateData.paid_date = new Date(paid_date)
    if (description !== undefined) updateData.description = description

    const payment = await db.payment.update({
      where: { id },
      data: updateData,
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
      'UPDATE_PAYMENT',
      `Updated payment of ${payment.amount} (Status: ${payment.status}) for enrollment ID ${payment.enrollment_id} (Student: ${payment.enrollment.student.first_name} ${payment.enrollment.student.last_name})`
    )

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Payment PUT error:', error)
    return NextResponse.json(
      { error: 'خطا در بروزرسانی پرداخت' },
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

    // Check payment exists
    const existing = await db.payment.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'پرداخت یافت نشد' },
        { status: 404 }
      )
    }

    // Department filtering for managers
    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const enrollment = await db.enrollment.findUnique({ where: { id: existing.enrollment_id } })
      if (enrollment) {
        const course = await db.course.findUnique({ where: { id: enrollment.course_id } })
        if (userProfile?.department && course?.department !== userProfile.department) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    await db.payment.delete({ where: { id } })

    await logActivity(
      request,
      'DELETE_PAYMENT',
      `Deleted payment of ${existing.amount} (ID: ${id})`
    )

    return NextResponse.json({ message: 'پرداخت با موفقیت حذف شد' })
  } catch (error) {
    console.error('Payment DELETE error:', error)
    return NextResponse.json(
      { error: 'خطا در حذف پرداخت' },
      { status: 500 }
    )
  }
}
