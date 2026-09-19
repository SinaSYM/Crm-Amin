import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callGemini } from '@/lib/gemini'
import { getSession, isAuthorized } from '@/lib/auth'
import { UserRole } from '@prisma/client'

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
      UserRole.SALES_AGENT,
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { lead_id } = body

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
    }

    // Load lead details and interaction history
    const lead = await db.lead.findUnique({
      where: { id: lead_id },
      include: {
        target_course: true,
        assigned_to: true,
        interactions: {
          orderBy: { createdAt: 'asc' },
          include: {
            agent: {
              select: { first_name: true, last_name: true }
            }
          }
        }
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Same ownership/department scoping as leads/[id]/route.ts — without
    // this, any authorized role could pull AI coaching notes for a lead
    // belonging to another agent or department.
    if (session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER) {
      const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
      if (userProfile?.department) {
        const isLeadDeptMatch = lead.department === userProfile.department
        const isAgentDeptMatch = lead.assigned_to?.department === userProfile.department
        if (!isLeadDeptMatch && !isAgentDeptMatch) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (session.userRole === UserRole.SALES_AGENT) {
      if (lead.assigned_to_id !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const courseTitle = lead.target_course?.title || 'نامشخص'
    const leadName = `${lead.first_name} ${lead.last_name}`.trim() || 'نامشخص'
    const interactionsText = lead.interactions.map((int, idx) => {
      return `${idx + 1}. [${int.interaction_type}] در تاریخ ${new Date(int.createdAt).toLocaleDateString('fa-IR')}: "${int.content}" ${int.next_followup_date ? `(پیگیری بعدی برای ${new Date(int.next_followup_date).toLocaleDateString('fa-IR')})` : ''}`
    }).join('\n')

    const systemPrompt = `شما یک ناظر ارشد فروش و مربی هوش مصنوعی (AI Sales Coach) در موسسه آموزش عالی آزاد امین هستید.
وظیفه شما بررسی پرونده لید و تاریخچه تمام تعاملات و تماس‌های کارشناس فروش با او، و ارائه توصیه‌ها و راهنمایی‌های مربیگری کاربردی و مو به مو است.

خروجی شما باید حتماً به زبان فارسی و با فرمت Markdown روان شامل موارد زیر باشد:
1. "💡 ۳ راهنمای آموزشی (Coaching Guidelines)" - سه توصیه عمیق و کاربردی بر اساس تحلیل مکالمات ثبت شده تا کارشناس در مکالمات بعدی استفاده کند.
2. "🎯 اقدام پیشنهادی بعدی (Next Action)" - گام بعدی بسیار مشخص و عملیاتی.
3. "🎭 تحلیل حس و وضعیت مشتری (Sentiment Analysis)" - میزان علاقه، موانع تصمیم‌گیری (مثلاً دغدغه قیمت، زمان) و درصد شانس تبدیل نهایی.

اطلاعات لید:
نام لید: ${leadName}
دوره هدف: ${courseTitle}
وضعیت فعلی لید: ${lead.status}
نوت کلی لید: ${lead.notes}

تاریخچه تعاملات ثبت شده:
${interactionsText || 'هیچ تعاملی تاکنون ثبت نشده است.'}

لطفاً خروجی را دقیق، دلسوزانه و متقاعدکننده بنویسید.`

    const userPrompt = `مکالمات لید "${leadName}" را تحلیل کن و بازخورد مربیگری ارائه بده.`
    const aiResponse = await callGemini(systemPrompt, userPrompt)

    return NextResponse.json({ text: aiResponse })
  } catch (error) {
    console.error('AI Sales Coach error:', error)
    return NextResponse.json({ error: 'Failed to generate coaching suggestions' }, { status: 500 })
  }
}
