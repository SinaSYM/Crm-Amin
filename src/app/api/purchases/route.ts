import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logActivity } from '@/lib/activity-logger'

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
    const status = searchParams.get('status')
    const requesterId = searchParams.get('requester_id')

    const where: Record<string, any> = {}

    if (status) {
      where.status = status
    }

    const userProfile = await db.user.findUnique({
      where: { id: session.userId },
      select: { department: true },
    })

    // Apply filters based on role
    if (session.userRole === 'SALES_AGENT') {
      where.requester_id = session.userId
    } else if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      if (userProfile?.department) {
        where.requester = {
          department: userProfile.department,
        }
      }
    } else {
      // ADMIN, FINANCIAL_OFFICER, EDUCATION_OFFICER can view all or filter by requesterId if provided
      if (requesterId) {
        where.requester_id = requesterId
      }
    }

    const purchases = await db.purchaseRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        requester: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true,
            department: true,
          },
        },
      },
    })

    return NextResponse.json(purchases)
  } catch (error) {
    console.error('Purchases GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase requests' },
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

    if (session.userRole === 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { item_name, amount, quantity, description } = body

    if (!item_name || amount === undefined) {
      return NextResponse.json(
        { error: 'item_name and amount are required' },
        { status: 400 }
      )
    }

    const parsedAmount = Number(amount)
    const parsedQuantity = quantity !== undefined ? Number(quantity) : 1

    if (isNaN(parsedAmount) || isNaN(parsedQuantity)) {
      return NextResponse.json(
        { error: 'amount and quantity must be valid numbers' },
        { status: 400 }
      )
    }

    const purchase = await db.purchaseRequest.create({
      data: {
        requester_id: session.userId,
        item_name,
        amount: parsedAmount,
        quantity: parsedQuantity,
        description: description || '',
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
      },
    })

    await logActivity(
      request,
      'CREATE_PURCHASE_REQUEST',
      `Created purchase request for "${item_name}" (Amount: ${amount}, Qty: ${quantity || 1})`
    )

    return NextResponse.json(purchase, { status: 201 })
  } catch (error) {
    console.error('Purchases POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase request' },
      { status: 500 }
    )
  }
}
