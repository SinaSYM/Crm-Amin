import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { callGemini } from '@/lib/gemini'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { student_id, course_id, message } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Retrieve course context from database if course_id is provided
    let courseInfo = ''
    if (course_id) {
      const course = await db.course.findUnique({
        where: { id: course_id },
        include: {
          classes: {
            take: 3,
            orderBy: { date: 'desc' }
          }
        }
      })
      if (course) {
        courseInfo = `دوره آموزشی فعال دانش‌پذیر: "${course.title}". 
قیمت دوره: ${course.price.toLocaleString('fa-IR')} تومان. 
سرفصل‌ها و جلسات کلاسی اخیر: ${course.classes.map(c => `جلسه "${c.title}" در تاریخ ${new Date(c.date).toLocaleDateString('fa-IR')}`).join('، ')}.`
      }
    }

    const systemPrompt = `شما یک منتور هوشمند آموزشی (Smart Mentor) در موسسه آموزش عالی آزاد امین (amin-inst.ac.ir) هستید.
وظیفه شما پاسخگویی علمی، دقیق و با اخلاق آموزشی به سوالات دانش‌پذیران در خصوص دوره‌هایشان است.
لحن شما صمیمی، حرفه‌ای، تشویق‌کننده و در عین حال کاملاً علمی و راهنما باشد.
از ارجاع لید به بخش‌های اداری خودداری کنید، مگر اینکه کاملاً مربوط به ثبت نام یا مسائل مالی باشد.
اطلاعات دوره:
${courseInfo}
پاسخ‌ها حتماً به زبان فارسی روان و شکیل باشد.`

    const aiResponse = await callGemini(systemPrompt, message)

    return NextResponse.json({ text: aiResponse })
  } catch (error) {
    console.error('AI Mentor error:', error)
    return NextResponse.json({ error: 'Failed to process chat session' }, { status: 500 })
  }
}
