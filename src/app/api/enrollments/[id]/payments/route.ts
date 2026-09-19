import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { PaymentType, PaymentItemStatus, UserRole } from '@prisma/client'
import { getSession, isAuthorized } from '@/lib/auth'
import { isAgentOwnerOfStudent } from '@/lib/agent-scope'
import { logActivity } from '@/lib/activity-logger'

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

    // Check enrollment exists
    const enrollment = await db.enrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, phone_number: true },
        },
        course: {
          select: { id: true, title: true, price: true, department: true },
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'ثبت‌نام یافت نشد' },
        { status: 404 }
      )
    }

    // Students can only view their own enrollment's payments
    if (session.userRole === UserRole.STUDENT && enrollment.student_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Sales Agents can only view payments of students they converted themselves
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

    const payments = await db.payment.findMany({
      where: { enrollment_id: id },
      orderBy: { due_date: 'asc' },
    })

    // Calculate summary
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)
    const paidAmount = payments
      .filter((p) => p.status === PaymentItemStatus.PAID)
      .reduce((sum, p) => sum + p.amount, 0)
    const pendingAmount = payments
      .filter((p) => p.status === PaymentItemStatus.PENDING)
      .reduce((sum, p) => sum + p.amount, 0)
    const overdueAmount = payments
      .filter((p) => p.status === PaymentItemStatus.OVERDUE)
      .reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      enrollment,
      payments,
      summary: {
        total: totalAmount,
        paid: paidAmount,
        pending: pendingAmount,
        overdue: overdueAmount,
        count: payments.length,
        paidCount: payments.filter((p) => p.status === PaymentItemStatus.PAID).length,
        pendingCount: payments.filter((p) => p.status === PaymentItemStatus.PENDING).length,
        overdueCount: payments.filter((p) => p.status === PaymentItemStatus.OVERDUE).length,
      },
    })
  } catch (error) {
    console.error('Enrollment payments GET error:', error)
    return NextResponse.json(
      { error: 'خطا در دریافت پرداخت‌های ثبت‌نام' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin, Sales Manager, and Dept Manager can set up installment plans
    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.SALES_MANAGER, UserRole.DEPT_MANAGER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { installments } = body

    // Check enrollment exists
    const enrollment = await db.enrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: { first_name: true, last_name: true },
        },
        course: {
          select: { id: true, title: true, price: true, department: true },
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json(
        { error: 'ثبت‌نام یافت نشد' },
        { status: 404 }
      )
    }

    // Department filtering for managers
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department && enrollment.course.department !== userProfile.department) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Validate installments count (3 or 6)
    const validInstallments = [3, 6]
    if (!installments || !validInstallments.includes(installments)) {
      return NextResponse.json(
        { error: 'تعداد اقساط باید ۳ یا ۶ باشد' },
        { status: 400 }
      )
    }

    // Check if payments already exist for this enrollment
    const existingPayments = await db.payment.findMany({
      where: { enrollment_id: id },
    })
    if (existingPayments.length > 0) {
      return NextResponse.json(
        { error: 'برای این ثبت‌نام قبلاً پرداخت ثبت شده است' },
        { status: 409 }
      )
    }

    const coursePrice = enrollment.course.price
    const installmentAmount = Math.ceil(coursePrice / installments)

    // Create installment payments
    const createdPayments: Array<{ id: string; amount: number; due_date: Date; status: string }> = []
    const now = new Date()

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(now)
      dueDate.setMonth(dueDate.getMonth() + (i + 1))

      // For the last installment, adjust the amount to match the total course price
      const isLast = i === installments - 1
      const amount = isLast
        ? coursePrice - installmentAmount * (installments - 1)
        : installmentAmount

      const payment = await db.payment.create({
        data: {
          enrollment_id: id,
          amount,
          payment_type: PaymentType.INSTALLMENT,
          status: PaymentItemStatus.PENDING,
          due_date: dueDate,
          description: `قسط ${i + 1} از ${installments} - ${enrollment.course.title}`,
        },
      })

      createdPayments.push(payment)
    }

    // Update enrollment payment_status to INSTALLMENT
    await db.enrollment.update({
      where: { id },
      data: { payment_status: 'INSTALLMENT' },
    })

    await logActivity(
      request,
      'CREATE_INSTALLMENT_PLAN',
      `Created ${installments}-installment plan for "${enrollment.student.first_name} ${enrollment.student.last_name}" (Course: ${enrollment.course.title})`
    )

    return NextResponse.json(
      {
        message: `${installments} قسط با موفقیت ایجاد شد`,
        payments: createdPayments,
        totalAmount: coursePrice,
        installmentAmount,
        lastInstallmentAmount: createdPayments[createdPayments.length - 1]?.amount,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Enrollment installments POST error:', error)
    return NextResponse.json(
      { error: 'خطا در ایجاد اقساط' },
      { status: 500 }
    )
  }
}
