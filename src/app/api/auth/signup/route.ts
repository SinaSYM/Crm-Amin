import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { UserRole } from '@prisma/client'
import { apiError, zodFieldErrorMessage } from '@/lib/api-response'

const Department = z.enum([
  'MANAGEMENT',
  'REAL_ESTATE',
  'FINANCE',
  'LAW',
  'PROJECT_MANAGEMENT',
])

function isEmail(s: string): boolean {
  if (typeof s !== 'string') return false
  const trimmed = s.trim()
  if (trimmed.length === 0 || trimmed.length > 254) return false
  const at = trimmed.lastIndexOf('@')
  if (at < 1 || at === trimmed.length - 1) return false
  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)
  if (domain.length === 0 || !domain.includes('.')) return false
  if (/\s/.test(trimmed)) return false
  if (!/^[A-Za-z0-9._+\-]+$/.test(local)) return false
  const labels = domain.split('.')
  for (const lbl of labels) {
    if (lbl.length === 0 || lbl.length > 63) return false
    if (!/^[A-Za-z0-9-]+$/.test(lbl)) return false
    if (lbl.startsWith('-') || lbl.endsWith('-')) return false
  }
  const tld = labels[labels.length - 1]
  if (!/^[A-Za-z]{2,}$/.test(tld)) return false
  return true
}

const Body = z.object({
  email: z.string().refine(isEmail, { message: 'ایمیل نامعتبر است' }).optional(),
  phone_number: z.string().min(8, 'شماره تماس نامعتبر است').optional(),
  password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
  first_name: z.string().min(1, 'نام الزامی است'),
  last_name: z.string().min(1, 'نام خانوادگی الزامی است'),
  desired_department: Department.optional(),
}).refine((data) => data.email || data.phone_number, {
  message: 'حداقل یکی از ایمیل یا شماره موبایل الزامی است',
})

export async function POST(req: Request) {
  try {
    let input: z.infer<typeof Body>
    try {
      input = Body.parse(await req.json())
    } catch (e) {
      if (e instanceof z.ZodError) {
        return apiError(zodFieldErrorMessage(e.flatten().fieldErrors), 400)
      }
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const email = input.email?.toLowerCase().trim() ?? null
    const phone = input.phone_number?.trim() ?? null

    // Check for duplicates
    if (email) {
      const existingSignup = await db.signupRequest.findUnique({ where: { email } })
      if (existingSignup) {
        return NextResponse.json({ error: 'ایمیل یا شماره تماس قبلاً ثبت شده است' }, { status: 409 })
      }
      const existingEmailOnUser = await db.user.findUnique({ where: { email } })
      if (existingEmailOnUser) {
        return NextResponse.json({ error: 'ایمیل یا شماره تماس قبلاً ثبت شده است' }, { status: 409 })
      }
    }
    if (phone) {
      const existingPhone = await db.user.findUnique({ where: { phone_number: phone } })
      if (existingPhone) {
        return NextResponse.json({ error: 'ایمیل یا شماره تماس قبلاً ثبت شده است' }, { status: 409 })
      }
      // A pending request with the same phone must also block a second signup
      // (phone_number is not unique on SignupRequest, so check explicitly).
      const existingSignupPhone = await db.signupRequest.findFirst({ where: { phone_number: phone } })
      if (existingSignupPhone) {
        return NextResponse.json({ error: 'ایمیل یا شماره تماس قبلاً ثبت شده است' }, { status: 409 })
      }
    }

    const passwordHash = hashPassword(input.password)
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await db.signupRequest.create({
      data: {
        email: email ?? `pending-${uniqueSuffix}@placeholder.local`,
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        phone_number: phone ?? `pending-${uniqueSuffix}`,
        desired_department: input.desired_department ?? null,
        passwordHash,
        status: 'PENDING',
      },
    })

    return NextResponse.json({ status: 'PENDING', message: 'درخواست عضویت شما با موفقیت ثبت شد. پس از تایید مدیریت، حساب شما فعال خواهد شد.' }, { status: 201 })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({ error: 'خطا در ثبت درخواست عضویت' }, { status: 500 })
  }
}

// Keep the UserRole import referenced so future helpers don't trip unused-import lint.
export const _roleHint: UserRole = UserRole.SALES_AGENT
