import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { LeadStatus, UserRole, PaymentStatus } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.userRole === UserRole.STUDENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { course_id, payment_status } = body

    if (!course_id) {
      return NextResponse.json(
        { error: 'course_id is required' },
        { status: 400 }
      )
    }

    // Validate payment_status
    if (payment_status && !['PAID', 'INSTALLMENT'].includes(payment_status)) {
      return NextResponse.json(
        { error: 'payment_status must be PAID or INSTALLMENT' },
        { status: 400 }
      )
    }

    // Check lead exists
    const lead = await db.lead.findUnique({
      where: { id },
      include: {
        assigned_to: true,
        target_course: {
          select: { id: true, title: true },
        },
      },
    })

    if (!lead) {
      return NextResponse.json(
        { error: 'لید یافت نشد' },
        { status: 404 }
      )
    }

    if (lead.status === LeadStatus.CONVERTED) {
      return NextResponse.json(
        { error: 'این لید قبلاً تبدیل شده است' },
        { status: 400 }
      )
    }

    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })

    // Access control check
    if (session.userRole !== 'ADMIN') {
      if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
        if (userProfile?.department) {
          const isLeadDeptMatch = lead.department === userProfile.department
          const isAgentDeptMatch = lead.assigned_to?.department === userProfile.department
          if (!isLeadDeptMatch && !isAgentDeptMatch) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          }
        } else {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        // SALES_AGENT, MENTOR, etc. can only convert their own assigned leads
        if (lead.assigned_to_id !== session.userId) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    // Check course exists
    const course = await db.course.findUnique({ where: { id: course_id } })
    if (!course) {
      return NextResponse.json(
        { error: 'دوره یافت نشد' },
        { status: 404 }
      )
    }

    // Find or create student user
    let student = await db.user.findUnique({
      where: { phone_number: lead.phone_number },
    })

    if (student) {
      // If user exists but is not STUDENT, we still use them but note it
    } else {
      // Create new student
      student = await db.user.create({
        data: {
          first_name: lead.first_name || 'دانش‌پذیر',
          last_name: lead.last_name || 'جدید',
          phone_number: lead.phone_number,
          role: UserRole.STUDENT,
          is_active: true,
          department: lead.department,
        },
      })
    }

    // Check for duplicate enrollment
    const existingEnrollment = await db.enrollment.findFirst({
      where: { student_id: student.id, course_id },
    })

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'این دانش‌پذیر قبلاً در این دوره ثبت‌نام شده است' },
        { status: 409 }
      )
    }

    // Create enrollment
    const enrollment = await db.enrollment.create({
      data: {
        student_id: student.id,
        course_id,
        payment_status: payment_status === 'INSTALLMENT' ? PaymentStatus.INSTALLMENT : PaymentStatus.PAID,
      },
      include: {
        student: {
          select: { id: true, first_name: true, last_name: true, phone_number: true, role: true },
        },
        course: {
          select: { id: true, title: true, price: true },
        },
      },
    })

    // Update lead status to CONVERTED
    await db.lead.update({
      where: { id },
      data: { status: LeadStatus.CONVERTED },
    })

    // Process referral commission if referred
    if (lead.referred_by_id) {
      const commissionAmount = course.price * 0.05 // 5% commission
      
      // Check if commission already exists
      const existingCommission = await db.commission.findUnique({
        where: { referee_lead_id: lead.id }
      })
      
      if (!existingCommission) {
        await db.commission.create({
          data: {
            referrer_id: lead.referred_by_id,
            referee_lead_id: lead.id,
            amount: commissionAmount,
            status: 'APPROVED',
          },
        })

        // Credit to referrer's wallet balance
        await db.user.update({
          where: { id: lead.referred_by_id },
          data: {
            wallet_balance: {
              increment: commissionAmount,
            },
          },
        })
      }
    }

    // Create system interaction for the conversion
    const agentId = lead.assigned_to_id || student.id
    await db.interaction.create({
      data: {
        lead_id: id,
        agent_id: agentId,
        interaction_type: 'SYSTEM',
        content: `لید به دانش‌پذیر تبدیل شد — ثبت‌نام در دوره: ${course.title} — وضعیت پرداخت: ${payment_status === 'INSTALLMENT' ? 'اقساطی' : 'پرداخت شده'}`,
      },
    })

    await logActivity(
      request,
      'CONVERT_LEAD',
      `Converted lead "${lead.first_name} ${lead.last_name}" (Phone: ${lead.phone_number}) to student (Course: ${course.title})`
    )

    return NextResponse.json({
      message: 'لید با موفقیت به دانش‌پذیر تبدیل شد',
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        phone_number: student.phone_number,
        role: student.role,
      },
      enrollment,
    }, { status: 201 })
  } catch (error) {
    console.error('Lead convert error:', error)
    return NextResponse.json(
      { error: 'خطا در تبدیل لید' },
      { status: 500 }
    )
  }
}
