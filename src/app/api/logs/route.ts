import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only non-student and non-sales-agent users can view activity logs
    if (session.userRole === 'STUDENT' || session.userRole === 'SALES_AGENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const action = searchParams.get('action')
    const userId = searchParams.get('user_id')
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const limitParam = searchParams.get('limit')
    const offsetParam = searchParams.get('offset')

    const where: Record<string, any> = {}

    if (action) {
      where.action = action
    }
    if (userId) {
      where.user_id = userId
    }
    if (role) {
      where.user_role = role
    }
    if (search) {
      where.OR = [
        { user_name: { contains: search } },
        { action: { contains: search } },
        { description: { contains: search } },
      ]
    }

    // Department isolation for managers — restrict to logs of users in their
    // own department.
    if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        const deptUsers = await db.user.findMany({
          where: { department: userProfile.department },
          select: { id: true },
        })
        where.user_id = { in: deptUsers.map((u) => u.id) }
      }
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 50
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0

    const logs = await db.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await db.activityLog.count({ where })

    return NextResponse.json({ logs, total })
  } catch (error) {
    console.error('Logs GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activity logs' },
      { status: 500 }
    )
  }
}
