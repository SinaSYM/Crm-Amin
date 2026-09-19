import { NextResponse } from 'next/server'

/** Standard error response: always `{ error: string }`, never a raw object. */
export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** Standard success response — just a thin wrapper for consistency with apiError. */
export function apiSuccess<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Zod's flatten().fieldErrors is a { field: string[] } map. Routes were
 * returning that object directly as `error`, breaking the `{ error: string }`
 * contract every other route follows. Collapse it to the first message.
 */
export function zodFieldErrorMessage(fieldErrors: Record<string, string[] | undefined>): string {
  for (const key of Object.keys(fieldErrors)) {
    const messages = fieldErrors[key]
    if (messages && messages.length > 0) return messages[0]
  }
  return 'ورودی نامعتبر است'
}
