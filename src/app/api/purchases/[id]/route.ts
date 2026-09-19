import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
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

    const purchase = await db.purchaseRequest.findUnique({
      where: { id },
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

    if (!purchase) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 })
    }

    // Role-based visibility check
    if (session.userRole === 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.userRole === 'SALES_AGENT' && purchase.requester_id !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (session.userRole === 'DEPT_MANAGER' || session.userRole === 'SALES_MANAGER') {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department && purchase.requester.department !== userProfile.department) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(purchase)
  } catch (error) {
    console.error('Purchase GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase request' },
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

    const { id } = await params
    const body = await request.json()
    const { item_name, amount, quantity, description, status } = body

    if (amount !== undefined && isNaN(Number(amount))) {
      return NextResponse.json({ error: 'amount must be a valid number' }, { status: 400 })
    }
    if (quantity !== undefined && isNaN(Number(quantity))) {
      return NextResponse.json({ error: 'quantity must be a valid number' }, { status: 400 })
    }

    const existing = await db.purchaseRequest.findUnique({
      where: { id },
      include: { requester: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 })
    }

    // Check permissions
    const isAdminOrFinance = session.userRole === 'ADMIN' || session.userRole === 'FINANCIAL_OFFICER'
    const isRequester = existing.requester_id === session.userId

    // If changing status, must be Admin or Finance
    if (status !== undefined && status !== existing.status) {
      if (!isAdminOrFinance) {
        return NextResponse.json({ error: 'Forbidden: Only Admin or Finance can update status' }, { status: 403 })
      }
    }

    // If changing details, must be the requester and status must be PENDING
    const isChangingDetails = item_name !== undefined || amount !== undefined || quantity !== undefined || description !== undefined
    if (isChangingDetails) {
      if (!isRequester && !isAdminOrFinance) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!isAdminOrFinance && existing.status !== 'PENDING') {
        return NextResponse.json({ error: 'Cannot modify a request that is not PENDING' }, { status: 400 })
      }
    }

    const updated = await db.purchaseRequest.update({
      where: { id },
      data: {
        ...(item_name !== undefined && { item_name }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
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

    let actionDesc = `Updated purchase request "${updated.item_name}"`
    if (status !== undefined && status !== existing.status) {
      actionDesc += ` status to ${status}`
    }

    await logActivity(request, 'UPDATE_PURCHASE_REQUEST', actionDesc)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Purchase PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update purchase request' },
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

    const { id } = await params

    const existing = await db.purchaseRequest.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Purchase request not found' }, { status: 404 })
    }

    const isAdmin = session.userRole === 'ADMIN'
    const isRequester = existing.requester_id === session.userId

    if (!isAdmin && !isRequester) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isAdmin && existing.status !== 'PENDING') {
      return NextResponse.json({ error: 'Cannot delete a request that is not PENDING' }, { status: 400 })
    }

    await db.purchaseRequest.delete({
      where: { id },
    })

    await logActivity(
      request,
      'DELETE_PURCHASE_REQUEST',
      `Deleted purchase request "${existing.item_name}"`
    )

    return NextResponse.json({ message: 'Purchase request deleted successfully' })
  } catch (error) {
    console.error('Purchase DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete purchase request' },
      { status: 500 }
    )
  }
}
