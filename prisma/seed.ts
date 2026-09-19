import { PrismaClient, UserRole, LeadStatus, InteractionType, PaymentStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data
  await prisma.activityLog.deleteMany()
  await prisma.purchaseRequest.deleteMany()
  await prisma.teacher.deleteMany()
  await prisma.task.deleteMany()
  await prisma.ticket.deleteMany()
  await prisma.classSession.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.interaction.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.course.deleteMany()
  await prisma.user.deleteMany()

  // ─── Users ────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      first_name: 'علی',
      last_name: 'محمدی',
      phone_number: '09121234567',
      role: UserRole.ADMIN,
      is_active: true,
    },
  })

  // System User for automated logs/webhooks
  const systemUser = await prisma.user.create({
    data: {
      id: 'system',
      first_name: 'سیستم',
      last_name: 'خودکار',
      phone_number: '00000000000',
      role: UserRole.ADMIN,
      is_active: false,
    },
  })

  const salesManager = await prisma.user.create({
    data: {
      first_name: 'سارا',
      last_name: 'احمدی',
      phone_number: '09121234568',
      role: UserRole.SALES_MANAGER,
      is_active: true,
    },
  })

  const agent1 = await prisma.user.create({
    data: {
      first_name: 'رضا',
      last_name: 'کریمی',
      phone_number: '09121234569',
      role: UserRole.SALES_AGENT,
      is_active: true,
    },
  })

  const agent2 = await prisma.user.create({
    data: {
      first_name: 'مریم',
      last_name: 'حسینی',
      phone_number: '09121234570',
      role: UserRole.SALES_AGENT,
      is_active: true,
    },
  })

  // Students
  const student1 = await prisma.user.create({
    data: {
      first_name: 'امیر',
      last_name: 'نوری',
      phone_number: '09121234571',
      role: UserRole.STUDENT,
      is_active: true,
      referral_code: 'AMIN-AMIR123',
      wallet_balance: 750000,
    },
  })

  const student2 = await prisma.user.create({
    data: {
      first_name: 'زهرا',
      last_name: 'رضایی',
      phone_number: '09121234572',
      role: UserRole.STUDENT,
      is_active: true,
      referral_code: 'AMIN-ZAHRA456',
      wallet_balance: 0,
    },
  })

  const student3 = await prisma.user.create({
    data: {
      first_name: 'محمد',
      last_name: 'صادقی',
      phone_number: '09121234573',
      role: UserRole.STUDENT,
      is_active: false,
      referral_code: 'AMIN-MOHAMMAD789',
      wallet_balance: 0,
    },
  })

  // New Demo Users for Amin Institute
  const ardalanAdmin = await prisma.user.create({
    data: {
      first_name: 'اردلان',
      last_name: 'ابوالفتحی',
      phone_number: '09120000001',
      role: UserRole.ADMIN,
      is_active: true,
    },
  })

  const fatemehEdu = await prisma.user.create({
    data: {
      first_name: 'فاطمه',
      last_name: 'یعقوبی',
      phone_number: '09120000002',
      role: UserRole.EDUCATION_OFFICER,
      is_active: true,
    },
  })

  const sinaFin = await prisma.user.create({
    data: {
      first_name: 'سینا',
      last_name: 'غمصاریان',
      phone_number: '09120000003',
      role: UserRole.FINANCIAL_OFFICER,
      is_active: true,
    },
  })

  const hosseinMentor = await prisma.user.create({
    data: {
      first_name: 'سید حسین',
      last_name: 'بنی طبا',
      phone_number: '09120000004',
      role: UserRole.MENTOR,
      is_active: true,
    },
  })

  const najibeDeptManager = await prisma.user.create({
    data: {
      first_name: 'نجیبه',
      last_name: 'رمضان‌زاده',
      phone_number: '09120000005',
      role: UserRole.DEPT_MANAGER,
      department: 'MANAGEMENT',
      is_active: true,
    },
  })

  const mohammadDeptManager = await prisma.user.create({
    data: {
      first_name: 'محمد',
      last_name: 'عدالت',
      phone_number: '09120000006',
      role: UserRole.DEPT_MANAGER,
      department: 'FINANCE',
      is_active: true,
    },
  })

  console.log('✅ Users created')

  // ─── Courses ──────────────────────────────────────────────────
  const courseMBA = await prisma.course.create({
    data: {
      title: 'دوره جامع MBA - DBA مشهد | حضوری',
      price: 18500000,
      is_active: true,
    },
  })

  const courseCEO = await prisma.course.create({
    data: {
      title: 'دوره مدیر عامل حرفه‌ای',
      price: 16000000,
      is_active: true,
    },
  })

  const courseMBAFinance = await prisma.course.create({
    data: {
      title: 'MBA DBA تخصصی مالی',
      price: 15500000,
      is_active: true,
    },
  })

  const courseRealEstate = await prisma.course.create({
    data: {
      title: 'دوره جامع آموزش مشاور املاک حرفه ای',
      price: 9500000,
      is_active: true,
    },
  })

  const courseRealEstateLaw = await prisma.course.create({
    data: {
      title: 'دوره مشاور حقوقی املاک',
      price: 8000000,
      is_active: true,
    },
  })

  const courseBuildSales = await prisma.course.create({
    data: {
      title: 'دوره مدیریت فروش ساختمان',
      price: 11000000,
      is_active: true,
    },
  })

  const courseRealEstateArbitration = await prisma.course.create({
    data: {
      title: 'دوره داوری حقوقی املاک',
      price: 10500000,
      is_active: true,
    },
  })

  const courseRealEstateEval = await prisma.course.create({
    data: {
      title: 'دوره تخصصی ارزیابی و قیمت گذاری املاک',
      price: 12000000,
      is_active: true,
    },
  })

  const courseLaw = await prisma.course.create({
    data: {
      title: 'دوره جامع حقوق کاربردی',
      price: 14000000,
      is_active: true,
    },
  })

  const courseArbitration = await prisma.course.create({
    data: {
      title: 'دوره داوری حقوقی',
      price: 11500000,
      is_active: true,
    },
  })

  const courseLawMBA = await prisma.course.create({
    data: {
      title: 'دوره MBA مشاور حقوقی',
      price: 13000000,
      is_active: true,
    },
  })

  const courseDPM = await prisma.course.create({
    data: {
      title: 'دوره مدیریت پروژه و ساخت (DPM)',
      price: 22000000,
      is_active: true,
    },
  })

  const courseWelding = await prisma.course.create({
    data: {
      title: 'دوره بازرسی فنی و کنترل کیفیت جوش',
      price: 12500000,
      is_active: true,
    },
  })

  console.log('✅ Courses created')

  // ─── Leads ────────────────────────────────────────────────────
  const leadsData = [
    { phone_number: '09129999001', first_name: 'فاطمه', last_name: 'موسوی', source: 'website', status: LeadStatus.NEW, assigned_to_id: agent1.id, referred_by_id: student1.id, target_course_id: courseMBA.id, notes: 'از طریق سایت ثبت‌نام کرده' },
    { phone_number: '09129999002', first_name: 'حسین', last_name: 'جعفری', source: 'campaign', status: LeadStatus.CONTACTED, assigned_to_id: agent1.id, referred_by_id: null, target_course_id: courseRealEstate.id, notes: 'کمپین زمستانه' },
    { phone_number: '09129999003', first_name: 'نازنین', last_name: 'قاسمی', source: 'manual', status: LeadStatus.IN_PROGRESS, assigned_to_id: agent1.id, referred_by_id: student1.id, target_course_id: courseLaw.id, notes: 'علاقه‌مند به حقوق کاربردی' },
    { phone_number: '09129999004', first_name: 'سعید', last_name: 'طاهری', source: 'website', status: LeadStatus.NEW, assigned_to_id: agent2.id, referred_by_id: null, target_course_id: courseDPM.id, notes: '' },
    { phone_number: '09129999005', first_name: 'لیلا', last_name: 'ابراهیمی', source: 'manual', status: LeadStatus.CONTACTED, assigned_to_id: agent2.id, target_course_id: courseCEO.id, notes: 'تماس اول گرفته شد' },
    { phone_number: '09129999006', first_name: 'مهدی', last_name: 'عباسی', source: 'campaign', status: LeadStatus.CONVERTED, assigned_to_id: agent1.id, target_course_id: courseMBA.id, notes: 'ثبت‌نام نهایی' },
    { phone_number: '09129999007', first_name: 'سحر', last_name: 'نجفی', source: 'website', status: LeadStatus.NEW, assigned_to_id: null, target_course_id: courseRealEstate.id, notes: 'هنوز تخصیص داده نشده' },
    { phone_number: '09129999008', first_name: 'پویا', last_name: 'احمدی', source: 'manual', status: LeadStatus.IN_PROGRESS, assigned_to_id: agent2.id, target_course_id: courseLaw.id, notes: 'در حال مشاوره' },
    { phone_number: '09129999009', first_name: 'الهام', last_name: 'رحیمی', source: 'campaign', status: LeadStatus.CONTACTED, assigned_to_id: agent1.id, target_course_id: courseDPM.id, notes: 'پیگیری شده' },
    { phone_number: '09129999010', first_name: 'کامران', last_name: 'فرجی', source: 'website', status: LeadStatus.NEW, assigned_to_id: null, target_course_id: courseCEO.id, notes: '' },
    { phone_number: '09129999011', first_name: 'شیما', last_name: 'یزدانی', source: 'manual', status: LeadStatus.IN_PROGRESS, assigned_to_id: agent2.id, target_course_id: courseMBA.id, notes: 'نیاز به تخفیف' },
    { phone_number: '09129999012', first_name: 'آرش', last_name: 'ملکی', source: 'campaign', status: LeadStatus.CONVERTED, assigned_to_id: agent1.id, target_course_id: courseRealEstate.id, notes: 'پرداخت انجام شده' },
    { phone_number: '09129999013', first_name: 'نگار', last_name: 'بهاری', source: 'website', status: LeadStatus.NEW, assigned_to_id: null, target_course_id: null, notes: 'هنوز دوره انتخاب نکرده' },
    { phone_number: '09129999014', first_name: 'بهرام', last_name: 'صالحی', source: 'manual', status: LeadStatus.CONTACTED, assigned_to_id: agent2.id, target_course_id: courseLaw.id, notes: 'تماس گرفته شد، در انتظار پاسخ' },
    { phone_number: '09129999015', first_name: 'دانیال', last_name: 'کاظمی', source: 'campaign', status: LeadStatus.IN_PROGRESS, assigned_to_id: agent1.id, target_course_id: courseCEO.id, notes: 'مذاکره در جریان' },
  ]

  const leads: any[] = []
  for (const data of leadsData) {
    const lead = await prisma.lead.create({ data })
    leads.push(lead)
  }

  console.log('✅ Leads created')

  // ─── Interactions ─────────────────────────────────────────────
  const interactionsData = [
    { lead_id: leads[1].id, agent_id: agent1.id, interaction_type: InteractionType.CALL, content: 'تماس اول گرفته شد. مشتری علاقه‌مند به دوره مشاور املاک است.', next_followup_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    { lead_id: leads[1].id, agent_id: agent1.id, interaction_type: InteractionType.NOTE, content: 'مشتری درخواست جزئیات بیشتر درباره سرفصل‌ها دارد.' },
    { lead_id: leads[2].id, agent_id: agent1.id, interaction_type: InteractionType.CALL, content: 'مشاوره تلفنی انجام شد. مشتری نسبت به دوره حقوق کاربردی ابراز علاقه کرد.', next_followup_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
    { lead_id: leads[4].id, agent_id: agent2.id, interaction_type: InteractionType.CALL, content: 'تماس گرفته شد. مشتری در جریان کاری است و بعداً پاسخ می‌دهد.', next_followup_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
    { lead_id: leads[5].id, agent_id: agent1.id, interaction_type: InteractionType.SYSTEM, content: 'لید از وضعیت IN_PROGRESS به CONVERTED تغییر یافت.' },
    { lead_id: leads[5].id, agent_id: agent1.id, interaction_type: InteractionType.NOTE, content: 'مشتری ثبت‌نام نهایی انجام داد. هزینه کامل پرداخت شده.' },
    { lead_id: leads[7].id, agent_id: agent2.id, interaction_type: InteractionType.CALL, content: 'مشاوره اولیه انجام شد. مشتری نیاز به تخفیف دارد.', next_followup_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    { lead_id: leads[8].id, agent_id: agent1.id, interaction_type: InteractionType.NOTE, content: 'پس از کمپین پیامک ارسال شده. مشتری پاسخ داده است.' },
    { lead_id: leads[8].id, agent_id: agent1.id, interaction_type: InteractionType.CALL, content: 'تماس پیگیری. مشتری علاقه‌مند اما می‌خواهد با خانواده مشورت کند.', next_followup_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000) },
    { lead_id: leads[10].id, agent_id: agent2.id, interaction_type: InteractionType.NOTE, content: 'درخواست تخفیف ثبت شد. نیاز به تایید مدیر فروش.' },
    { lead_id: leads[11].id, agent_id: agent1.id, interaction_type: InteractionType.SYSTEM, content: 'لید از وضعیت IN_PROGRESS به CONVERTED تغییر یافت.' },
    { lead_id: leads[11].id, agent_id: agent1.id, interaction_type: InteractionType.NOTE, content: 'پرداخت کامل انجام شد. ثبت‌نام نهایی.' },
    { lead_id: leads[13].id, agent_id: agent2.id, interaction_type: InteractionType.CALL, content: 'تماس اول. مشتری در حال بررسی دوره‌هاست.', next_followup_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) },
    { lead_id: leads[14].id, agent_id: agent1.id, interaction_type: InteractionType.CALL, content: 'مذاکره قیمت. مشتری قصد پرداخت اقساطی دارد.', next_followup_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
  ]

  for (const data of interactionsData) {
    await prisma.interaction.create({ data })
  }

  console.log('✅ Interactions created')

  // ─── Enrollments ──────────────────────────────────────────────
  const enrollmentsData = [
    { student_id: student1.id, course_id: courseMBA.id, payment_status: PaymentStatus.PAID, enrollment_date: new Date('2025-02-15') },
    { student_id: student1.id, course_id: courseLaw.id, payment_status: PaymentStatus.INSTALLMENT, enrollment_date: new Date('2025-02-20') },
    { student_id: student2.id, course_id: courseRealEstate.id, payment_status: PaymentStatus.PAID, enrollment_date: new Date('2025-02-10') },
    { student_id: student3.id, course_id: courseDPM.id, payment_status: PaymentStatus.INSTALLMENT, enrollment_date: new Date('2025-03-01') },
    { student_id: student3.id, course_id: courseCEO.id, payment_status: PaymentStatus.PAID, enrollment_date: new Date('2025-03-05') },
  ]

  for (const data of enrollmentsData) {
    await prisma.enrollment.create({ data })
  }

  console.log('✅ Enrollments created')

  // ─── Class Sessions ───────────────────────────────────────────
  await prisma.classSession.create({
    data: {
      course_id: courseMBA.id,
      title: 'کارگاه مدیریت استراتژیک و رهبری سازمانی',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
      link: 'https://zoom.us/j/123456789',
      archive_url: 'https://online.amin-inst.ac.ir/archive/strategic-mgmt.mp4',
    }
  })

  await prisma.classSession.create({
    data: {
      course_id: courseRealEstate.id,
      title: 'حقوق ثبتی و روش‌های تنظیم قراردادهای ملکی',
      date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // in 4 days
      link: 'https://zoom.us/j/987654321',
      archive_url: 'https://online.amin-inst.ac.ir/archive/realestate-law.mp4',
    }
  })

  await prisma.classSession.create({
    data: {
      course_id: courseLaw.id,
      title: 'داوری در دعاوی ملکی و اسناد تجاری - جلسه اول',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // yesterday
      link: 'https://zoom.us/j/111222333',
      archive_url: 'https://online.amin-inst.ac.ir/archive/arbitration-law.mp4',
    }
  })

  console.log('✅ Class Sessions created')

  // ─── Tickets ──────────────────────────────────────────────────
  await prisma.ticket.create({
    data: {
      student_id: student1.id,
      title: 'درخواست تمدید پرداخت قسط دوم دوره حقوق کاربردی',
      description: 'با سلام، بنده به علت تاخیر در دریافت حقوق ماهانه درخواست تمدید پرداخت قسط دوم را تا انتهای ماه جاری دارم. با تشکر.',
      status: 'PENDING',
      priority: 'HIGH',
    }
  })

  await prisma.ticket.create({
    data: {
      student_id: student2.id,
      title: 'مشکل در ورود به لینک کلاس آنلاین MBA',
      description: 'سلام، در جلسه قبلی خطای احراز هویت در نرم افزار زوم دریافت کردم و نتوانستم وارد کلاس آنلاین شوم. لطفا راهنمایی کنید.',
      status: 'RESOLVED',
      priority: 'NORMAL',
    }
  })

  await prisma.ticket.create({
    data: {
      student_id: student3.id,
      title: 'درخواست صدور گواهی دوره داوری املاک',
      description: 'با سلام، با توجه به اتمام دوره داوری املاک در هفته گذشته، درخواست صدور گواهینامه فیزیکی پایان دوره را دارم. سپاس.',
      status: 'IN_PROGRESS',
      priority: 'LOW',
    }
  })

  console.log('✅ Tickets created')

  // ─── Tasks (Daily Reminders) ──────────────────────────────────
  await prisma.task.create({
    data: {
      agent_id: agent1.id,
      lead_id: leads[0].id, // Fatima
      title: 'تماس پیگیری با فاطمه موسوی برای ثبت‌نام نهایی دوره MBA',
      description: 'مشتری در مکالمه قبلی ابراز علاقه شدید کرده و خواستار اطلاعات پرداخت قسطی بود.',
      due_date: new Date(Date.now() + 4 * 60 * 60 * 1000), // today, in 4 hours
      status: 'PENDING',
    }
  })

  await prisma.task.create({
    data: {
      agent_id: agent1.id,
      lead_id: leads[2].id, // Nazanin
      title: 'ارسال سرفصل‌های دوره حقوق کاربردی به نازنین قاسمی',
      description: 'سرفصل‌ها به آدرس ایمیل ثبت شده ارسال شود و پیام تایید داده شود.',
      due_date: new Date(Date.now() - 12 * 60 * 60 * 1000), // yesterday
      status: 'COMPLETED',
    }
  })

  await prisma.task.create({
    data: {
      agent_id: agent2.id,
      lead_id: leads[8].id, // Elham
      title: 'بررسی درخواست تخفیف الهام رحیمی با مدیر فروش',
      description: 'لید درخواست تخفیف ۱۰ درصدی برای پرداخت نقدی کامل دارد.',
      due_date: new Date(Date.now()), // today
      status: 'PENDING',
    }
  })

  console.log('✅ Tasks created')

  // ─── Commissions ──────────────────────────────────────────────
  await prisma.commission.createMany({
    data: [
      {
        referrer_id: student1.id,
        referee_lead_id: leads[0].id, // Fatima
        amount: 750000,
        status: 'APPROVED',
      },
      {
        referrer_id: student1.id,
        referee_lead_id: leads[2].id, // Nazanin
        amount: 0,
        status: 'PENDING',
      }
    ]
  })

  console.log('✅ Commissions created')

  // ─── Teachers ──────────────────────────────────────────────────
  await prisma.teacher.create({
    data: {
      name: 'استاد احمدی',
      phone_number: '09127777777',
      email: 'ahmadi@example.com',
      specialty: 'مدیریت و MBA',
      status: 'ACTIVE',
    },
  })

  await prisma.teacher.create({
    data: {
      name: 'استاد رضایی',
      phone_number: '09128888888',
      email: 'rezaei@example.com',
      specialty: 'حقوق و داوری',
      status: 'ACTIVE',
    },
  })
  console.log('✅ Teachers created')

  // ─── Purchase Requests ──────────────────────────────────────────
  await prisma.purchaseRequest.create({
    data: {
      requester_id: sinaFin.id,
      item_name: 'کاغذ A4 برای بخش مالی',
      amount: 1500000,
      quantity: 5,
      description: 'نیاز فوری برای چاپ فاکتورها و مدارک مالی',
      status: 'PENDING',
    },
  })

  await prisma.purchaseRequest.create({
    data: {
      requester_id: agent1.id,
      item_name: 'هدست تماس برای بخش فروش',
      amount: 3000000,
      quantity: 2,
      description: 'هدست‌های بخش فروش خراب شده‌اند',
      status: 'APPROVED',
    },
  })
  console.log('✅ Purchase Requests created')

  // ─── Activity Logs ──────────────────────────────────────────────
  await prisma.activityLog.create({
    data: {
      user_id: ardalanAdmin.id,
      user_name: 'اردلان ابوالفتحی',
      user_role: 'ADMIN',
      action: 'USER_CREATE',
      description: 'کاربر جدید فاطمه یعقوبی تعریف شد.',
    },
  })

  await prisma.activityLog.create({
    data: {
      user_id: fatemehEdu.id,
      user_name: 'فاطمه یعقوبی',
      user_role: 'EDUCATION_OFFICER',
      action: 'COURSE_CREATE',
      description: 'دوره جدید مدیریت پروژه ایجاد شد.',
    },
  })
  console.log('✅ Activity Logs created')

  // ─── Summary ──────────────────────────────────────────────────
  const userCount = await prisma.user.count()
  const courseCount = await prisma.course.count()
  const leadCount = await prisma.lead.count()
  const interactionCount = await prisma.interaction.count()
  const enrollmentCount = await prisma.enrollment.count()
  const ticketCount = await prisma.ticket.count()
  const taskCount = await prisma.task.count()
  const classCount = await prisma.classSession.count()
  const commissionCount = await prisma.commission.count()
  const teacherCount = await prisma.teacher.count()
  const purchaseCount = await prisma.purchaseRequest.count()
  const logCount = await prisma.activityLog.count()

  console.log('\n📊 Seed Summary:')
  console.log(`   Users:        ${userCount}`)
  console.log(`   Courses:      ${courseCount}`)
  console.log(`   Leads:        ${leadCount}`)
  console.log(`   Interactions: ${interactionCount}`)
  console.log(`   Enrollments:  ${enrollmentCount}`)
  console.log(`   Tickets:      ${ticketCount}`)
  console.log(`   Tasks:        ${taskCount}`)
  console.log(`   Classes:      ${classCount}`)
  console.log(`   Commissions:  ${commissionCount}`)
  console.log(`   Teachers:     ${teacherCount}`)
  console.log(`   Purchases:    ${purchaseCount}`)
  console.log(`   ActivityLogs: ${logCount}`)
  console.log('\n🎉 Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
