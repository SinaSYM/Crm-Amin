import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { getSession, isAuthorized } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

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
      UserRole.FINANCIAL_OFFICER
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const role = searchParams.get('role') as UserRole | null
    const isActive = searchParams.get('is_active')

    const where: Record<string, unknown> = {}

    // Load current user profile for department filtering
    const userProfile = await db.user.findUnique({
      where: { id: session.userId },
      select: { department: true },
    })

    // Restrict based on role hierarchy and department
    if (session.userRole !== UserRole.ADMIN) {
      if (userProfile?.department) {
        if (role === UserRole.STUDENT) {
          where.role = UserRole.STUDENT
          where.enrollments = {
            some: {
              course: {
                department: userProfile.department
              }
            }
          }
        } else if (role === UserRole.SALES_AGENT) {
          where.role = UserRole.SALES_AGENT
          where.department = userProfile.department
        } else if (role) {
          // Other roles are forbidden for non-admins
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        } else {
          // Managers see their department's agents and students enrolled in department courses
          where.OR = [
            {
              role: UserRole.SALES_AGENT,
              department: userProfile.department
            },
            {
              role: UserRole.STUDENT,
              enrollments: {
                some: {
                  course: {
                    department: userProfile.department
                  }
                }
              }
            }
          ]
        }
      }
      // Managers without a department see all users
    } else {
      if (role) {
        where.role = role
      }
    }

    if (isActive !== null && isActive !== undefined) {
      where.is_active = isActive === 'true'
    }

    const users = await db.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      omit: { passwordHash: true },
      include: {
        _count: {
          select: {
            assignedLeads: true,
            interactions: true,
            enrollments: true,
          },
        },
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Users GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
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

    if (!isAuthorized(session, [
      UserRole.ADMIN,
      UserRole.SALES_MANAGER,
      UserRole.DEPT_MANAGER,
      UserRole.EDUCATION_OFFICER
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { first_name, last_name, phone_number, role, is_active, department } = body

    if (!first_name || !last_name || !phone_number) {
      return NextResponse.json(
        { error: 'first_name, last_name, and phone_number are required' },
        { status: 400 }
      )
    }

    // Resolve target role. Defaults to SALES_AGENT for admins and STUDENT for others.
    const targetRole = (role || (session.userRole === UserRole.ADMIN ? UserRole.SALES_AGENT : UserRole.STUDENT)) as UserRole

    // Non-admins can only create STUDENTS
    if (session.userRole !== UserRole.ADMIN && targetRole !== UserRole.STUDENT) {
      return NextResponse.json(
        { error: 'Only admins can set or assign roles other than STUDENT' },
        { status: 403 }
      )
    }

    // Check for duplicate phone number
    const existing = await db.user.findUnique({
      where: { phone_number },
    })
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this phone number already exists' },
        { status: 409 }
      )
    }

    // Force created user's department to creator's department if creator is a manager
    let userDept = department || null
    const creatorProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      if (creatorProfile?.department) {
        userDept = creatorProfile.department
      }
    }

    // Sales Agents must belong to a department
    if (targetRole === UserRole.SALES_AGENT && !userDept) {
      return NextResponse.json(
        { error: 'Department is required for Sales Agents' },
        { status: 400 }
      )
    }

    const user = await db.user.create({
      data: {
        first_name,
        last_name,
        phone_number,
        role: targetRole,
        is_active: is_active !== undefined ? is_active : true,
        department: userDept,
      },
    })

    await logActivity(
      request,
      'CREATE_USER',
      `Created user "${first_name} ${last_name}" with role ${targetRole}`
    )

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Users POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
