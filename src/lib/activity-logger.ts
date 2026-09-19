import { db } from './db'
import { getSession } from './auth'
import { NextRequest } from 'next/server'

export async function logActivity(request: NextRequest, action: string, description: string) {
  try {
    const session = await getSession(request)
    if (!session) return
    await logActivityForUser(session.userId, action, description)
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

/**
 * Same as logActivity but takes a userId directly instead of deriving it
 * from the request's session cookie — needed right after login, where the
 * new session cookie hasn't reached the browser (and thus the request)
 * yet, so logActivity(request, ...) would find no session to attribute to.
 */
export async function logActivityForUser(userId: string, action: string, description: string) {
  try {
    const user = await db.user.findUnique({ where: { id: userId } })
    if (user) {
      await db.activityLog.create({
        data: {
          user_id: user.id,
          user_name: `${user.first_name} ${user.last_name}`.trim() || 'User',
          user_role: user.role,
          action,
          description,
        },
      })
    }
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}
