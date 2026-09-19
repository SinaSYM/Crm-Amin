import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { LeadStatus, PaymentStatus } from '@prisma/client'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.userRole === 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

        const { searchParams } = request.nextUrl
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    // Build date filter
    const dateFilter: Record<string, unknown> = {}
    if (startDateStr || endDateStr) {
      dateFilter.createdAt = {
        ...(startDateStr && { gte: new Date(startDateStr) }),
        ...(endDateStr && { lte: new Date(endDateStr) }),
      }
    }

    // Enrollment date filter (uses enrollment_date field)
    const enrollmentDateFilter: Record<string, unknown> = {}
    if (startDateStr || endDateStr) {
      enrollmentDateFilter.enrollment_date = {
        ...(startDateStr && { gte: new Date(startDateStr) }),
        ...(endDateStr && { lte: new Date(endDateStr) }),
      }
    }

    // Follow-up date filter (uses next_followup_date for follow-ups within date range)
    const followupDateFilter: Record<string, unknown> = {}
    if (startDateStr || endDateStr) {
      followupDateFilter.next_followup_date = {
        ...(startDateStr && { gte: new Date(startDateStr) }),
        ...(endDateStr && { lte: new Date(endDateStr) }),
      }
    }

    const hasDateFilter = !!(startDateStr || endDateStr)

    // Load current user profile for department filtering
    const userProfile = await db.user.findUnique({
      where: { id: session.userId },
      select: { department: true },
    })

    const leadWhere: Record<string, any> = {}
    const interactionWhere: Record<string, any> = {}
    const enrollmentWhere: Record<string, any> = {}
    const agentWhere: Record<string, any> = { is_active: true }
    const courseWhere: Record<string, any> = {}
    const userWhere: Record<string, any> = {}

    if (
      session.userRole === 'ADMIN' ||
      session.userRole === 'FINANCIAL_OFFICER' ||
      session.userRole === 'EDUCATION_OFFICER' ||
      session.userRole === 'MENTOR'
    ) {
      // Org-wide officer roles: sees everything (same as ADMIN across the rest of the app)
    } else if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      if (userProfile?.department) {
        leadWhere.OR = [
          { department: userProfile.department },
          { assigned_to: { department: userProfile.department } }
        ]
        interactionWhere.lead = {
          OR: [
            { department: userProfile.department },
            { assigned_to: { department: userProfile.department } }
          ]
        }
        enrollmentWhere.course = { department: userProfile.department }
        agentWhere.department = userProfile.department
        courseWhere.department = userProfile.department
        userWhere.department = userProfile.department
      }
      // Managers without a department see org-wide data
    } else {
      // SALES_AGENT sees only their own assigned leads
      leadWhere.assigned_to_id = session.userId
      interactionWhere.lead = { assigned_to_id: session.userId }
      enrollmentWhere.student = {
        assignedLeads: {
          some: {
            assigned_to_id: session.userId
          }
        }
      }
      agentWhere.id = session.userId
      if (userProfile?.department) {
        courseWhere.department = userProfile.department
      }
      userWhere.id = session.userId
    }

    // Total counts — apply date filter and role/department filters
    const [
      totalLeads,
      newLeads,
      contactedLeads,
      inProgressLeads,
      convertedLeads,
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalInteractions,
      paidEnrollments,
      installmentEnrollments,
    ] = await Promise.all([
      db.lead.count({ where: { ...dateFilter, ...leadWhere } }),
      db.lead.count({ where: { ...dateFilter, ...leadWhere, status: LeadStatus.NEW } }),
      db.lead.count({ where: { ...dateFilter, ...leadWhere, status: LeadStatus.CONTACTED } }),
      db.lead.count({ where: { ...dateFilter, ...leadWhere, status: LeadStatus.IN_PROGRESS } }),
      db.lead.count({ where: { ...dateFilter, ...leadWhere, status: LeadStatus.CONVERTED } }),
      db.user.count({ where: userWhere }),
      db.course.count({ where: courseWhere }),
      db.enrollment.count({ where: { ...(hasDateFilter ? enrollmentDateFilter : {}), ...enrollmentWhere } }),
      db.interaction.count({ where: { ...dateFilter, ...interactionWhere } }),
      db.enrollment.count({ where: { ...(hasDateFilter ? enrollmentDateFilter : {}), ...enrollmentWhere, payment_status: PaymentStatus.PAID } }),
      db.enrollment.count({ where: { ...(hasDateFilter ? enrollmentDateFilter : {}), ...enrollmentWhere, payment_status: PaymentStatus.INSTALLMENT } }),
    ])

    // Conversion rate
    const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0'

    // Leads by source
    const leadsRaw = await db.lead.findMany({
      where: { ...dateFilter, ...leadWhere },
      select: { source: true },
    })
    const leadsBySource: Record<string, number> = {}
    for (const lead of leadsRaw) {
      leadsBySource[lead.source] = (leadsBySource[lead.source] || 0) + 1
    }

    // Recent leads (last 5)
    const recentLeads = await db.lead.findMany({
      where: { ...dateFilter, ...leadWhere },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        assigned_to: {
          select: { id: true, first_name: true, last_name: true, role: true },
        },
        target_course: {
          select: { id: true, title: true },
        },
      },
    })

    // Upcoming follow-ups (next 7) — also include those missed during the
    // last week so agents see (and recover) overdue follow-ups.
    const upcomingFollowupsWhere: Record<string, unknown> = {
      next_followup_date: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      ...interactionWhere,
    }
    if (hasDateFilter) {
      upcomingFollowupsWhere.next_followup_date = {
        gte: new Date(startDateStr || new Date()),
        ...(endDateStr && { lte: new Date(endDateStr) }),
      }
    }

    const upcomingFollowups = await db.interaction.findMany({
      where: upcomingFollowupsWhere,
      take: 7,
      orderBy: { next_followup_date: 'asc' },
      include: {
        lead: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone_number: true,
            status: true,
          },
        },
        agent: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    })

    // Lead status distribution
    const leadStatusDistribution = [
      { status: 'NEW', count: newLeads },
      { status: 'CONTACTED', count: contactedLeads },
      { status: 'IN_PROGRESS', count: inProgressLeads },
      { status: 'CONVERTED', count: convertedLeads },
    ]

    // Recent activity (last 10 interactions across all types)
    const recentActivity = await db.interaction.findMany({
      where: { ...dateFilter, ...interactionWhere },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: { id: true, first_name: true, last_name: true, status: true },
        },
        agent: {
          select: { id: true, first_name: true, last_name: true },
        },
      },
    })

    // Leads per agent
    const agents = await db.user.findMany({
      where: { ...agentWhere, role: { in: ['SALES_AGENT', 'SALES_MANAGER'] } },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        role: true,
        _count: {
          select: {
            assignedLeads: {
              where: dateFilter,
            },
            interactions: {
              where: dateFilter,
            },
          },
        },
      },
    })

    const leadsPerAgent = agents.map((agent) => ({
      id: agent.id,
      name: `${agent.first_name} ${agent.last_name}`,
      role: agent.role,
      leadsCount: agent._count.assignedLeads,
      interactionsCount: agent._count.interactions,
    }))

    // Enrollments per course
    const courses = await db.course.findMany({
      where: { ...courseWhere, is_active: true },
      select: {
        id: true,
        title: true,
        price: true,
      },
    })

    const courseIds = courses.map((c) => c.id)
    const [leadCountsByCourse, enrollmentCountsByCourse] = await Promise.all([
      db.lead.groupBy({
        by: ['target_course_id'],
        where: { ...dateFilter, ...leadWhere, target_course_id: { in: courseIds } },
        _count: { _all: true },
      }),
      db.enrollment.groupBy({
        by: ['course_id'],
        where: { ...(hasDateFilter ? enrollmentDateFilter : {}), ...enrollmentWhere, course_id: { in: courseIds } },
        _count: { _all: true },
      }),
    ])

    const leadCountByCourseId = new Map(leadCountsByCourse.map((g) => [g.target_course_id, g._count._all]))
    const enrollmentCountByCourseId = new Map(enrollmentCountsByCourse.map((g) => [g.course_id, g._count._all]))

    const enrollmentsPerCourse = courses.map((course) => {
      const lCount = leadCountByCourseId.get(course.id) ?? 0
      const eCount = enrollmentCountByCourseId.get(course.id) ?? 0

      return {
        id: course.id,
        title: course.title,
        price: course.price,
        enrollmentsCount: eCount,
        leadsCount: lCount,
        revenue: eCount * course.price,
      }
    })

    // Total revenue estimate
    const totalRevenue = enrollmentsPerCourse.reduce((sum, c) => sum + c.revenue, 0)

    // Payment status distribution
    const paymentDistribution = [
      { status: 'PAID', count: paidEnrollments },
      { status: 'INSTALLMENT', count: installmentEnrollments },
    ]

    return NextResponse.json({
      totalLeads,
      newLeads,
      contactedLeads,
      inProgressLeads,
      convertedLeads,
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalInteractions,
      conversionRate,
      totalRevenue,
      leadsBySource,
      recentLeads,
      upcomingFollowups,
      leadStatusDistribution,
      recentActivity,
      leadsPerAgent,
      enrollmentsPerCourse,
      paymentDistribution,
      dateFilter: hasDateFilter ? { startDate: startDateStr, endDate: endDateStr } : null,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
