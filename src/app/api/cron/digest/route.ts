import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { resend, EMAIL_FROM, isEmailConfigured } from '@/lib/resend'

export const dynamic = 'force-dynamic'

/**
 * Daily follow-up reminder digest.
 * Can be triggered two ways:
 *  1. By an external cron service (e.g. Vercel Cron / cron-job.org) with
 *     header `Authorization: Bearer <CRON_SECRET>` (set CRON_SECRET env var).
 *  2. Manually by an ADMIN via the UI ("ارسال یادآوری آزمایشی").
 *
 * For every active user with an email, collects their overdue + today's
 * follow-ups and emails a Persian RTL digest.
 */
export async function POST(req: NextRequest) {
    // Auth: either a valid admin session OR the CRON_SECRET bearer token.
    const secret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')
    const isCron = !!secret && authHeader === `Bearer ${secret}`

    let isAdmin = false
    if (!isCron) {
        const session = await getSession()
        isAdmin = session?.userRole === 'ADMIN'
        if (!isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
    }

    if (!isEmailConfigured()) {
        return NextResponse.json(
            { error: 'ایمیل تنظیم نشده است — متغیر محیطی RESEND_API_KEY را اضافه کنید' },
            { status: 503 }
        )
    }

    const now = new Date()
    const endOfToday = new Date(now)
    endOfToday.setHours(23, 59, 59, 999)

    const sent: { email: string; name: string; count: number }[] = []
    const skipped: { name: string; reason: string }[] = []

    const users = await prisma.user.findMany({
        where: {
            is_active: true,
            isApproved: true,
            email: { not: null },
        },
        select: { id: true, first_name: true, last_name: true, email: true },
    })

    for (const user of users) {
        try {
            const followups = await prisma.interaction.findMany({
                where: {
                    agent_id: user.id,
                    next_followup_date: { lte: endOfToday },
                    lead: { status: { in: ['NEW', 'CONTACTED', 'IN_PROGRESS'] } },
                },
                orderBy: { next_followup_date: 'asc' },
                take: 15,
                include: {
                    lead: {
                        select: { first_name: true, last_name: true, phone_number: true, status: true },
                    },
                },
            })

            if (followups.length === 0) {
                skipped.push({ name: `${user.first_name} ${user.last_name}`, reason: 'no-followups' })
                continue
            }

            const rows = followups
                .map((f) => {
                    const d = f.next_followup_date ? new Date(f.next_followup_date) : null
                    const overdue = d ? d < now : false
                    const dateStr = d
                        ? d.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })
                        : ''
                    const leadName = [f.lead.first_name, f.lead.last_name].filter(Boolean).join(' ') || f.lead.phone_number
                    const color = overdue ? '#e03e3e' : '#2383e2'
                    return `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #ededec;">
              <div style="font-weight:600;color:#37352f;">${leadName}</div>
              <div style="font-size:12px;color:#787774;direction:ltr;text-align:right;">${f.lead.phone_number}</div>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #ededec;font-size:13px;color:${color};white-space:nowrap;">
              ${overdue ? '⚠ تأخیر دارد — ' : ''}${dateStr}
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid #ededec;font-size:13px;">
              <a href="https://wa.me/${f.lead.phone_number.replace(/[^0-9]/g, '')}" style="color:#2383e2;text-decoration:none;">💬 واتساپ</a>
              &nbsp;
              <a href="tel:${f.lead.phone_number}" style="color:#2383e2;text-decoration:none;">📞 تماس</a>
            </td>
          </tr>`
                })
                .join('')

            await resend!.emails.send({
                from: EMAIL_FROM,
                to: user.email!,
                subject: `📋 ${followups.length} پیگیری امروز شما — سامانه CRM امین`,
                html: `
        <div dir="rtl" style="font-family:Tahoma,'Segoe UI',sans-serif;background:#ffffff;color:#37352f;max-width:560px;margin:0 auto;padding:24px;">
          <h1 style="font-size:18px;margin:0 0 4px;">سلام ${user.first_name} 👋</h1>
          <p style="font-size:14px;color:#787774;margin:0 0 16px;">
            شما <strong style="color:#37352f;">${followups.length}</strong> پیگیری برای امروز (یا عقب‌افتاده) دارید:
          </p>
          <table style="width:100%;border-collapse:collapse;background:#f7f7f5;border-radius:8px;">
            ${rows}
          </table>
          <p style="font-size:12px;color:#9b9a97;margin-top:20px;">
            این ایمیل به‌صورت خودکار از سامانه مدیریت ارتباط با مشتری ارسال شده است.
          </p>
        </div>`,
            })

            sent.push({ email: user.email!, name: `${user.first_name} ${user.last_name}`, count: followups.length })
        } catch (err) {
            console.error(`digest failed for user ${user.id}:`, err)
            skipped.push({ name: `${user.first_name} ${user.last_name}`, reason: 'send-error' })
        }
    }

    return NextResponse.json({
        success: true,
        configured: isEmailConfigured(),
        triggeredBy: isCron ? 'cron' : 'admin',
        sent,
        skippedCount: skipped.length,
        timestamp: now.toISOString(),
    })
}

// Allow GET too so simple cron services that only do GET work.
export async function GET(req: NextRequest) {
    return POST(req)
}
