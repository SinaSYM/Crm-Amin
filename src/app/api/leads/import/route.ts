import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getSession, isAuthorized } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { logActivity } from '@/lib/activity-logger'

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const MAX_ROWS = 2000

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
    ])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'فایل CSV ارسال نشده است' }, { status: 400 })
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'فقط فایل‌های CSV پذیرفته می‌شوند' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'حجم فایل بیش از حد مجاز است (حداکثر ۲ مگابایت)' }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split('\n').filter((line) => line.trim())

    if (lines.length < 2) {
      return NextResponse.json({ error: 'فایل CSV خالی است یا فقط هدر دارد' }, { status: 400 })
    }

    if (lines.length - 1 > MAX_ROWS) {
      return NextResponse.json(
        { error: `تعداد ردیف‌ها بیش از حد مجاز است (حداکثر ${MAX_ROWS} ردیف). لطفاً فایل را تقسیم کنید.` },
        { status: 400 }
      )
    }

    // Parse header
    const header = parseCSVLine(lines[0]).map((h) => h.trim().replace(/"/g, '').toLowerCase())

    const firstNameIdx = header.indexOf('first_name')
    const lastNameIdx = header.indexOf('last_name')
    const phoneIdx = header.indexOf('phone_number')
    const sourceIdx = header.indexOf('source')
    const notesIdx = header.indexOf('notes')

    if (phoneIdx === -1) {
      return NextResponse.json(
        { error: 'ستون phone_number در فایل CSV یافت نشد' },
        { status: 400 }
      )
    }

    // Auto-assign department to the importer's own department when they're a
    // manager, matching manual lead creation (leads/route.ts POST) — imported
    // leads previously always had a null department.
    const userProfile = await db.user.findUnique({ where: { id: session.userId }, select: { department: true } })
    const leadDept =
      session.userRole === UserRole.DEPT_MANAGER || session.userRole === UserRole.SALES_MANAGER
        ? userProfile?.department ?? null
        : null

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i])

      const phoneNumber = (row[phoneIdx] || '').trim().replace(/"/g, '')
      if (!phoneNumber) {
        errorCount++
        errors.push(`ردیف ${i + 1}: شماره تماس خالی است`)
        continue
      }

      // Check for duplicate
      const existing = await db.lead.findFirst({
        where: { phone_number: phoneNumber },
      })

      if (existing) {
        errorCount++
        errors.push(`ردیف ${i + 1}: شماره تماس ${phoneNumber} قبلاً ثبت شده است`)
        continue
      }

      const firstName = firstNameIdx >= 0 ? (row[firstNameIdx] || '').trim().replace(/"/g, '') : ''
      const lastName = lastNameIdx >= 0 ? (row[lastNameIdx] || '').trim().replace(/"/g, '') : ''
      const source = sourceIdx >= 0 ? (row[sourceIdx] || '').trim().replace(/"/g, '') || 'manual' : 'manual'
      const notes = notesIdx >= 0 ? (row[notesIdx] || '').trim().replace(/"/g, '') : ''

      try {
        await db.lead.create({
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            source: ['manual', 'website', 'campaign'].includes(source) ? source : 'manual',
            notes,
            status: 'NEW',
            department: leadDept,
          },
        })
        successCount++
      } catch (err) {
        // Generic message only — the raw error can contain internal DB/driver
        // detail (column names, constraint text) that shouldn't reach the client.
        console.error(`CSV import row ${i + 1} error:`, err)
        errorCount++
        errors.push(`ردیف ${i + 1}: خطا در ذخیره اطلاعات`)
      }
    }

    await logActivity(
      request,
      'IMPORT_LEADS',
      `Imported leads from CSV: ${successCount} succeeded, ${errorCount} failed (of ${lines.length - 1} rows)`
    )

    return NextResponse.json({
      successCount,
      errorCount,
      errors: errors.slice(0, 20),
      totalRows: lines.length - 1,
    })
  } catch (error) {
    console.error('CSV Import error:', error)
    return NextResponse.json(
      { error: 'خطا در پردازش فایل CSV' },
      { status: 500 }
    )
  }
}

// Parse a CSV line handling quoted fields with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }

  result.push(current)
  return result
}
