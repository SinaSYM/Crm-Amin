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
    const { lead_id, platform = 'sms', tone = 'formal', objective = 'follow_up' } = body

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
    }

    // Load lead details from DB
    const lead = await db.lead.findUnique({
      where: { id: lead_id },
      include: {
        target_course: true,
        assigned_to: true,
      }
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Same ownership/department scoping as leads/[id]/route.ts — without
    // this, any authorized role could generate outreach content using
    // another agent's or department's lead data.
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

    const courseTitle = lead.target_course?.title || 'دوره‌های تخصصی'
    const leadName = `${lead.first_name} ${lead.last_name}`.trim() || 'دانش‌پذیر گرامی'

    const systemPrompt = `شما دستیار هوش مصنوعی بازاریابی و تولید محتوا (Content Generator) در موسسه آموزش عالی آزاد امین (amin-inst.ac.ir) هستید.
وظیفه شما تولید متن شخصی‌سازی شده برای ارسال به لیدها است.
جزئیات درخواست:
پلتفرم: ${platform === 'sms' ? 'پیامک کوتاه (کوتاه، جذاب، دارای فراخوان برای عمل واضح)' : 'ایمیل (دارای موضوع، ساختاریافته، رسمی یا نیمه‌رسمی و کامل)'}
لحن: ${tone === 'formal' ? 'رسمی و اداری همراه با احترام کامل' : 'صمیمی، دوستانه و پرانرژی'}
هدف پیام: ${objective === 'follow_up' ? 'پیگیری بعد از تماس تلفنی قبلی و یادآوری مزایا' : 'ارائه اطلاعات اولیه دوره و دعوت به مشاوره رایگان'}

اطلاعات لید:
نام لید: ${leadName}
دوره مورد نظر: ${courseTitle}

لطفاً یک متن فارسی جذاب و متقاعدکننده تولید کنید که بالاترین شانس تعامل و نرخ تبدیل را داشته باشد.`

    const userPrompt = `برای لید "${leadName}" متن ${platform} با لحن ${tone} جهت "${objective}" بنویس.`
    const aiResponse = await callGemini(systemPrompt, userPrompt)

    return NextResponse.json({ text: aiResponse })
  } catch (error) {
    console.error('AI Generate Content error:', error)
    return NextResponse.json({ error: 'Failed to generate content' }, { status: 500 })
  }
}
