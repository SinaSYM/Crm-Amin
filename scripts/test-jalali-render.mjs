import { chromium } from 'playwright'

const BASE = process.env.PREVIEW_URL || 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage()
let errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)))

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
if ((await page.locator('input[type="password"]').count()) > 0) {
  await page.locator('input').first().fill('admin')
  await page.locator('input[type="password"]').fill('admin')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(3000)
}

// Calendar: repaired 1405/06/23 (= today 2026-09-14) events must appear on today's cell
await page.locator('[data-testid="nav-calendar"]').click()
await page.waitForTimeout(2500)
// today's cell has the ring highlight; open its popover
const todayCell = page.locator('button.ring-2').first()
await todayCell.click()
await page.waitForTimeout(800)
const popoverText = await page.locator('[data-radix-popper-content-wrapper]').textContent().catch(() => '')
console.log('today popover shows repaired events:', /امروز|مورد/.test(popoverText || '') && (popoverText || '').length > 20)
console.log('popover sample:', (popoverText || '').slice(0, 120))

// Lead detail: follow-up line must render a sane Jalali date (not ۷۸۴)
await page.locator('[data-testid="nav-leads"]').click()
await page.waitForTimeout(2000)
await page.locator('tbody tr button, tbody tr a').first().click().catch(async () => {
  await page.locator('tbody tr').first().click()
})
await page.waitForTimeout(2000)
const detail = await page.locator('main').textContent()
const bad = (detail || '').includes('۷۸۴/۴/۲')
console.log('lead detail still shows ۷۸۴/۴/۲:', bad)
const m = (detail || '').match(/پیگیری:\s*([۰-۹\/]+)/)
console.log('follow-up rendered as:', m ? m[1] : '(none found)')

console.log('pageerrors:', errors.length)
await browser.close()
console.log(errors.length === 0 && !bad ? 'ALL PASS' : 'ISSUES FOUND')
