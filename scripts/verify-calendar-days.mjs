// Verifies that tasks whose due_date was stored with a Persian (Jalali) year —
// e.g. "1405-06-23" — are repaired and shown on the correct calendar day.
//
// Usage:
//   BASE_URL=https://amincrm.freebuff.app node scripts/verify-calendar-days.mjs 23 25
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const IDENTIFIER = process.env.QA_IDENTIFIER || 'admin'
const PASSWORD = process.env.QA_PASSWORD || 'admin'
const days = process.argv.slice(2).filter((a) => /^\d{1,2}$/.test(a))
const targets = days.length ? days : ['23', '25']

const toPersianDigits = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])

const browser = await chromium.launch()
const page = await browser.newPage()
const pageErrors = []
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)))

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)
if (await page.locator('input[type="password"]').count()) {
    await page.locator('input').first().fill(IDENTIFIER)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(4000)
}

await page.locator('[data-testid="nav-calendar"]').click()
await page.waitForTimeout(3000)

const monthLabel = (await page.locator('button:has(svg.lucide-calendar-days)').first().textContent())?.trim()
console.log('showing month:', monthLabel)

const out = {}
for (const day of targets) {
    const label = toPersianDigits(day)
    const cell = page.locator('button[class*="min-h-[80px]"]').filter({ has: page.locator(`span:text-is("${label}")`) }).first()
    if (!(await cell.count())) {
        out[day] = { found: false }
        continue
    }
    await cell.click()
    await page.waitForTimeout(1200)
    const popover = await page.locator('[data-radix-popper-content-wrapper]').first().textContent().catch(() => '')
    out[day] = {
        found: true,
        hasEvents: /مورد/.test(popover || ''),
        items: (popover || '').replace(/\s+/g, ' ').trim().slice(0, 160),
    }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
}

await browser.close()
console.log(JSON.stringify({ base: BASE, days: out, pageErrors }, null, 2))
console.log(pageErrors.length === 0 && Object.values(out).every((d) => d.found && d.hasEvents) ? 'PASS' : 'FAIL')
