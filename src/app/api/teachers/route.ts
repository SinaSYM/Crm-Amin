import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAuthorized } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.userRole === UserRole.STUDENT) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = request.nextUrl
    const status = searchParams.get('status')
    const specialty = searchParams.get('specialty')
    const search = searchParams.get('search')

    const where: Record<string, any> = {}

    if (status) {
      where.status = status
    }
    if (specialty) {
      where.specialty = specialty
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { specialty: { contains: search } },
        { email: { contains: search } },
        { phone_number: { contains: search } },
      ]
    }

    const teachers = await db.teacher.findMany({
      where,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(teachers)
  } catch (error) {
    console.error('Teachers GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teachers' },
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

    // Only Admin and Education Officer can create teachers
    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.EDUCATION_OFFICER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, phone_number, email, specialty, status } = body

    if (!name || !phone_number || !specialty) {
      return NextResponse.json(
        { error: 'name, phone_number, and specialty are required' },
        { status: 400 }
      )
    }

    const existing = await db.teacher.findFirst({
      where: { phone_number },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A teacher with this phone number already exists' },
        { status: 409 }
      )
    }

    const teacher = await db.teacher.create({
      data: {
        name,
        phone_number,
        email: email || null,
        specialty,
        status: status || 'ACTIVE',
      },
    })

    await logActivity(
      request,
      'CREATE_TEACHER',
      `Created teacher "${name}" (Specialty: ${specialty})`
    )

    return NextResponse.json(teacher, { status: 201 })
  } catch (error) {
    console.error('Teachers POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create teacher' },
      { status: 500 }
    )
  }
}
