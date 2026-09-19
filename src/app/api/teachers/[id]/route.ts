import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAuthorized } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'
import { UserRole } from '@prisma/client'

export async function GET(
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

    const teacher = await db.teacher.findUnique({
      where: { id },
    })

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    return NextResponse.json(teacher)
  } catch (error) {
    console.error('Teacher GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher' },
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

    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.EDUCATION_OFFICER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, phone_number, email, specialty, status } = body

    const existing = await db.teacher.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    if (phone_number && phone_number !== existing.phone_number) {
      const duplicate = await db.teacher.findFirst({
        where: { phone_number },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: 'A teacher with this phone number already exists' },
          { status: 409 }
        )
      }
    }

    const updated = await db.teacher.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone_number !== undefined && { phone_number }),
        ...(email !== undefined && { email: email || null }),
        ...(specialty !== undefined && { specialty }),
        ...(status !== undefined && { status }),
      },
    })

    await logActivity(
      request,
      'UPDATE_TEACHER',
      `Updated teacher "${updated.name}" details`
    )

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Teacher PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update teacher' },
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

    if (!isAuthorized(session, [UserRole.ADMIN, UserRole.EDUCATION_OFFICER])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const existing = await db.teacher.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    await db.teacher.delete({
      where: { id },
    })

    await logActivity(
      request,
      'DELETE_TEACHER',
      `Deleted teacher "${existing.name}"`
    )

    return NextResponse.json({ message: 'Teacher deleted successfully' })
  } catch (error) {
    console.error('Teacher DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete teacher' },
      { status: 500 }
    )
  }
}
