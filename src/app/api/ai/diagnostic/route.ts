import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callGemini } from '@/lib/gemini'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

const MAX_ANSWERS_LENGTH = 5000

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    if (!checkRateLimit(`ai-diagnostic:${ip}`, 3, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' }, { status: 429 })
    }

    const body = await request.json()
    const { first_name, last_name, phone_number, answers = {}, referral_code } = body

    if (!first_name || !last_name || !phone_number) {
      return NextResponse.json({ error: 'First name, last name, and phone number are required' }, { status: 400 })
    }

    if (JSON.stringify(answers).length > MAX_ANSWERS_LENGTH) {
      return NextResponse.json({ error: 'حجم پاسخ‌ها بیش از حد مجاز است' }, { status: 400 })
    }

    // Format answers text
    const formattedAnswers = Object.entries(answers)
      .map(([question, answer]) => `سوال: ${question}\nپاسخ: ${answer}`)
      .join('\n\n')

    const systemPrompt = `شما یک مشاور ارشد ارزیابی و عارضه‌یاب هوش مصنوعی (AI Business Analyst) در موسسه آموزش عالی آزاد امین (amin-inst.ac.ir) هستید.
وظیفه شما تحلیل پاسخ‌های مدیر کسب‌وکار به سوالات عارضه‌یابی و ارائه یک گزارش عارضه‌یابی و تحلیل مدیریتی بسیار دقیق، حرفه‌ای و عملیاتی به زبان فارسی است.

گزارش شما باید حتماً با ساختار زیر با فرمت Markdown نوشته شود:
1. "🔍 تحلیل کلی وضعیت و ریشه‌یابی مشکلات" - بررسی وضعیت شرکت بر اساس اطلاعات اعلام شده.
2. "⚖️ ارزیابی ریسک‌های سازمانی" - تعیین سطح ریسک (بحرانی/متوسط/عادی) در حوزه‌های مدیریت، حقوقی و بازاریابی.
3. "🚀 ۳ راهکار عملیاتی فوری (Quick Wins)" - راهکارهای کاربردی و فوری که بدون هزینه بالا می‌توان پیاده کرد.
4. "📚 دوره‌های پیشنهادی موسسه امین" - معرفی دوره‌های مرتبط موسسه امین برای حل دائم این عارضه‌ها (مثلاً دوره‌های MBA/DBA برای چالش‌های بازاریابی و تیمی، دوره مشاور حقوقی یا داوری حقوقی برای چالش‌های حقوقی، یا دوره DPM برای پروژه‌ها و ساخت) با لحن ترغیب‌کننده.

در انتهای پاسخ خود حتماً خط تفکیک‌کننده ===METADATA=== را قرار داده و بلافاصله اطلاعات طبقه‌بندی لید را به صورت کد JSON دقیق بنویسید تا سیستم بتواند آن را پارس کند:
===METADATA===
{
  "calculatedScore": 85,
  "primaryGap": "MANAGEMENT"
}
توجه: calculatedScore باید نمره‌ای بین 20 تا 100 باشد (هرچه اندازه شرکت بزرگتر یا چالش‌ها جدی‌تر باشد نمره بالاتر است). primaryGap باید یکی از این مقادیر باشد: MANAGEMENT, SALES, LEGAL, FINANCE.`

    const userPrompt = `مشخصات متقاضی:
نام و نام خانوادگی: ${first_name} ${last_name}
شماره تماس: ${phone_number}

پاسخ‌ها به سوالات عارضه‌یابی:
${formattedAnswers}

گزارش تحلیل عارضه کسب‌وکار را بنویسید:`

    const aiResponse = await callGemini(systemPrompt, userPrompt)

    // Separate Markdown text and JSON metadata
    let reportText = aiResponse
    let calculatedScore = 60
    let primaryGap = 'MANAGEMENT'

    if (aiResponse.includes('===METADATA===')) {
      const parts = aiResponse.split('===METADATA===')
      reportText = parts[0].trim()
      try {
        const metadataStr = parts[1].trim().replace(/```json|```/g, '')
        const metadata = JSON.parse(metadataStr)
        if (metadata.calculatedScore) calculatedScore = Number(metadata.calculatedScore)
        if (metadata.primaryGap) primaryGap = metadata.primaryGap
      } catch (e) {
        console.error('Failed to parse diagnostic metadata JSON:', e)
      }
    }

    // Resolve referred_by_id if referral_code is provided
    let referred_by_id: string | null = null
    if (referral_code) {
      const referrer = await db.user.findUnique({
        where: { referral_code },
      })
      if (referrer) {
        referred_by_id = referrer.id
      }
    }

    // Workload-balanced queue routing: Find active sales agents and assign to the least busy one
    const activeAgents = await db.user.findMany({
      where: {
        role: 'SALES_AGENT',
        is_active: true,
      },
      include: {
        assignedLeads: {
          where: {
            status: { in: ['NEW', 'CONTACTED', 'IN_PROGRESS'] }
          }
        }
      }
    })

    let assigned_to_id: string | null = null
    if (activeAgents.length > 0) {
      activeAgents.sort((a, b) => a.assignedLeads.length - b.assignedLeads.length)
      assigned_to_id = activeAgents[0].id
    }

    // Create the lead in the database
    const lead = await db.lead.create({
      data: {
        first_name,
        last_name,
        phone_number,
        source: 'diagnostic_bot',
        score: calculatedScore,
        notes: `--- گزارش عارضه‌یاب کسب‌وکار (${primaryGap}) [امتیاز عارضه: ${calculatedScore}] ---\n\n${reportText}`,
        referred_by_id,
        assigned_to_id,
      }
    })

    // Interactions require a real User as their agent. On a fresh deployment
    // there may not be an active sales agent yet, so keep the lead unassigned
    // instead of writing the invalid foreign-key value "system".
    if (assigned_to_id) {
      const assignedAgent = activeAgents.find((agent) => agent.id === assigned_to_id)
      await db.interaction.create({
        data: {
          lead_id: lead.id,
          agent_id: assigned_to_id,
          interaction_type: 'SYSTEM',
          content: `کاربر از طریق عارضه‌یاب هوشمند کسب‌وکار ثبت‌نام کرد و به کارشناس ${assignedAgent?.first_name} ${assignedAgent?.last_name} تخصیص یافت. چالش اصلی: ${primaryGap} (امتیاز اولیه: ${calculatedScore})${referred_by_id ? ' (معرفی شده توسط سیستم سفیران)' : ''}`,
        }
      })
    }

    return NextResponse.json({
      text: reportText,
      score: calculatedScore,
      primaryGap,
      leadId: lead.id
    })
  } catch (error) {
    console.error('Diagnostic API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
