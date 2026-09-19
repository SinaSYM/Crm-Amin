import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { LeadStatus, PaymentStatus, InteractionType } from '@prisma/client'
import { getSession, isAuthorized } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAuthorized(session, [
      UserRole.ADMIN,
      UserRole.SALES_MANAGER,
      UserRole.DEPT_MANAGER,
      UserRole.EDUCATION_OFFICER,
      UserRole.FINANCIAL_OFFICER,
      UserRole.MENTOR,
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
    }

    // Lead funnel data
    const [newLeads, contactedLeads, inProgressLeads, convertedLeads] = await Promise.all([
      db.lead.count({ where: { ...leadWhere, status: LeadStatus.NEW } }),
      db.lead.count({ where: { ...leadWhere, status: LeadStatus.CONTACTED } }),
      db.lead.count({ where: { ...leadWhere, status: LeadStatus.IN_PROGRESS } }),
      db.lead.count({ where: { ...leadWhere, status: LeadStatus.CONVERTED } }),
    ])

    const totalLeads = newLeads + contactedLeads + inProgressLeads + convertedLeads

    // Interaction type distribution
    const [callCount, noteCount, systemCount] = await Promise.all([
      db.interaction.count({ where: { ...interactionWhere, interaction_type: InteractionType.CALL } }),
      db.interaction.count({ where: { ...interactionWhere, interaction_type: InteractionType.NOTE } }),
      db.interaction.count({ where: { ...interactionWhere, interaction_type: InteractionType.SYSTEM } }),
    ])

    // Agent performance
    const agents = await db.user.findMany({
      where: { ...agentWhere, role: { in: ['SALES_AGENT', 'SALES_MANAGER'] } },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        role: true,
        _count: {
          select: {
            assignedLeads: true,
            interactions: true,
          },
        },
        assignedLeads: {
          select: { status: true },
        },
      },
    })

    const agentPerformance = agents.map((agent) => {
      const converted = agent.assignedLeads.filter((l) => l.status === 'CONVERTED').length
      const total = agent.assignedLeads.length
      return {
        id: agent.id,
        name: `${agent.first_name} ${agent.last_name}`,
        role: agent.role,
        totalAssigned: total,
        converted,
        conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : '0',
        interactionsCount: agent._count.interactions,
      }
    })

    // Course popularity
    const courses = await db.course.findMany({
      where: courseWhere,
      select: {
        id: true,
        title: true,
        price: true,
        is_active: true,
      },
    })

    const courseIds = courses.map((c) => c.id)
    const [leadCountsByCourse, enrollmentCountsByCourse] = await Promise.all([
      db.lead.groupBy({
        by: ['target_course_id'],
        where: { ...leadWhere, target_course_id: { in: courseIds } },
        _count: { _all: true },
      }),
      db.enrollment.groupBy({
        by: ['course_id'],
        where: { ...enrollmentWhere, course_id: { in: courseIds } },
        _count: { _all: true },
      }),
    ])

    const leadCountByCourseId = new Map(leadCountsByCourse.map((g) => [g.target_course_id, g._count._all]))
    const enrollmentCountByCourseId = new Map(enrollmentCountsByCourse.map((g) => [g.course_id, g._count._all]))

    const courseAnalytics = courses.map((course) => {
      const lCount = leadCountByCourseId.get(course.id) ?? 0
      const eCount = enrollmentCountByCourseId.get(course.id) ?? 0

      return {
        id: course.id,
        title: course.title,
        price: course.price,
        isActive: course.is_active,
        enrollmentCount: eCount,
        leadCount: lCount,
        revenue: eCount * course.price,
        popularity: eCount + lCount,
      }
    })

    // Lead source effectiveness
    const leadsBySource = await db.lead.findMany({
      where: leadWhere,
      select: { source: true, status: true },
    })

    const sourceEffectiveness: Record<string, { total: number; converted: number; rate: string }> = {}
    for (const lead of leadsBySource) {
      if (!sourceEffectiveness[lead.source]) {
        sourceEffectiveness[lead.source] = { total: 0, converted: 0, rate: '0' }
      }
      sourceEffectiveness[lead.source].total++
      if (lead.status === 'CONVERTED') {
        sourceEffectiveness[lead.source].converted++
      }
    }
    for (const key of Object.keys(sourceEffectiveness)) {
      const s = sourceEffectiveness[key]
      s.rate = s.total > 0 ? ((s.converted / s.total) * 100).toFixed(1) : '0'
    }

    // Monthly enrollment trend (last 6 months) — one query for the whole
    // window, bucketed in memory, instead of one count() per month.
    const now = new Date()
    const trendRangeStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
    const trendEnrollments = await db.enrollment.findMany({
      where: { ...enrollmentWhere, enrollment_date: { gte: trendRangeStart } },
      select: { enrollment_date: true },
    })
    const monthlyTrend: Array<{ month: string; monthShort: string; count: number }> = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const count = trendEnrollments.filter(
        (e) => e.enrollment_date >= start && e.enrollment_date < end
      ).length
      monthlyTrend.push({
        month: start.toLocaleDateString('fa-IR', { month: 'long', year: 'numeric' }),
        monthShort: start.toLocaleDateString('fa-IR', { month: 'short' }),
        count,
      })
    }

    // Payment status summary
    const [paidCount, installmentCount] = await Promise.all([
      db.enrollment.count({ where: { ...enrollmentWhere, payment_status: PaymentStatus.PAID } }),
      db.enrollment.count({ where: { ...enrollmentWhere, payment_status: PaymentStatus.INSTALLMENT } }),
    ])

    // Revenue by course
    const revenueByCourse = courseAnalytics
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)

    const totalRevenue = revenueByCourse.reduce((sum, c) => sum + c.revenue, 0)

    return NextResponse.json({
      leadFunnel: {
        total: totalLeads,
        new: newLeads,
        contacted: contactedLeads,
        inProgress: inProgressLeads,
        converted: convertedLeads,
        conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : '0',
      },
      interactionDistribution: {
        call: callCount,
        note: noteCount,
        system: systemCount,
        total: callCount + noteCount + systemCount,
      },
      agentPerformance,
      courseAnalytics,
      sourceEffectiveness,
      monthlyTrend,
      paymentSummary: {
        paid: paidCount,
        installment: installmentCount,
        total: paidCount + installmentCount,
      },
      revenueByCourse,
      totalRevenue,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}
