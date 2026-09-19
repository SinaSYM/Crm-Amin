const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY is not defined. Using mock fallback responses.');
    return getFallbackResponse(systemPrompt, userPrompt);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\nUser query or data:\n${userPrompt}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API request failed:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('Invalid response format from Gemini');
    }

    return text;
  } catch (error) {
    console.error('Error in callGemini:', error);
    return getFallbackResponse(systemPrompt, userPrompt);
  }
}

function getFallbackResponse(systemPrompt: string, userPrompt: string): string {
  // Simple pattern matching to determine which mock response to return if offline/no API key
  const promptLower = userPrompt.toLowerCase();
  
  if (systemPrompt.includes('mentor') || promptLower.includes('کلاس') || promptLower.includes('درس')) {
    return `به عنوان منتور آموزشی مؤسسه عالی امین در خدمت شما هستم. 
در خصوص سوال شما درباره مفاهیم درسی، پیشنهاد می‌کنم ابتدا ویدیوی آرشیو جلسه مربوطه را در بخش «برنامه کلاسی و آرشیو» مشاهده کنید. 

مبحث مطرح شده یکی از بخش‌های کلیدی دوره است. برای درک بهتر:
۱. حتماً فایل صوتی خلاصه کارگاه را مرور کنید.
۲. تمرین انتهای فصل را به صورت عملی انجام دهید.
۳. در صورت نیاز به بررسی عمیق‌تر، می‌توانید در کلاس آنلاین پیش‌رو سوال خود را به صورت مستقیم از استاد بپرسید.

اگر نیاز به راهنمایی بیشتری دارید، بفرمایید.`;
  }
  
  if (systemPrompt.includes('coach') || systemPrompt.includes('فروش')) {
    return `### 📊 تحلیل هوشمند مکالمات و لید (AI Sales Coach)
    
#### 💡 ۳ راهنمای آموزشی (Coaching Guidelines)
۱. **تاکید بیشتر بر ارزش دوره:** بر اساس علایق لید به توسعه مهارت‌های شغلی، مزایای کاربردی مدرک وزارت علوم مؤسسه امین (ارزش استخدامی و مهاجرتی) را برجسته کنید.
۲. **مدیریت بهینه دغدغه مالی:** به جای ارائه مستقیم تخفیف، گزینه پرداخت اقساطی منعطف را مطرح کنید تا لید احساس فشار مالی نداشته باشد.
۳. **سرعت‌بخشی به تماس بعدی:** با توجه به بازه زمانی تصمیم‌گیری لید، حتماً ظرف ۲۴ ساعت آینده تماس مجدد برای پیگیری نهایی برقرار کنید.

#### 🎯 اقدام پیشنهادی بعدی (Next Action)
ارسال یک پیام شخصی‌سازی‌شده در پیام‌رسان‌ها شامل بروشور تفصیلی دوره و زمان‌بندی دقیق شروع کلاس‌ها، سپس تماس تلفنی فردا ساعت ۱۱ صبح.

#### 🎭 تحلیل حس و وضعیت مشتری (Sentiment Analysis)
- **وضعیت انگیزه:** بالا (علاقه‌مند به سرفصل‌ها)
- **موانع اصلی:** هزینه دوره و کمبود زمان شخصی
- **احتمال تبدیل:** حدود ۷۵٪`;
  }

  // Fallback for Content Generator
  return `موضوع: جزئیات دوره و ثبت‌نام نهایی در مؤسسه آموزش عالی امین

سلام و احترام جناب/سرکار،

امیدوارم روز خوبی داشته باشید. پیرو علاقه شما به یادگیری و توسعه مهارت‌های فردی در حوزه مدیریت و کسب‌وکار، کلاس‌های ترم جدید مؤسسه آموزش عالی آزاد امین در حال تکمیل ظرفیت است.

این دوره ویژه افرادی طراحی شده که به دنبال ارتقای شغلی و مدیریت استراتژیک کسب‌وکار خود هستند. مدرک نهایی این دوره دارای تاییدیه رسمی وزارت علوم بوده و قابلیت ترجمه رسمی دارد.

جهت رزرو نهایی صندلی خود و دریافت مشاوره تخصصی رایگان، با کلیک بر روی لینک زیر با ما در ارتباط باشید یا عدد ۱ را پیامک کنید.

[لینک ثبت‌نام و مشاوره]
با احترام، 
تیم مشاوره مؤسسه آموزش عالی آزاد امین`;
}
