import { chromium } from 'playwright'

const BASE = process.env.PREVIEW_URL || 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage()

let apiErrors = []
page.on('response', async (res) => {
  if (res.status() >= 400 && res.url().includes('/api/')) {
    let body = ''
    try { body = (await res.text()).slice(0, 150) } catch {}
    apiErrors.push(`${res.request().method()} ${res.url().replace(BASE, '')} -> ${res.status()} ${body}`)
  }
})
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 200)))

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3500)

// Login
if ((await page.locator('input[type="password"]').count()) > 0) {
  await page.locator('input').first().fill('admin')
  await page.locator('input[type="password"]').fill('admin')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(3000)
}
console.log('login ok:', (await page.locator('[data-testid="nav-calendar"]').count()) > 0)

// Go to calendar
await page.locator('[data-testid="nav-calendar"]').click()
await page.waitForTimeout(2500)

// Double-click today's cell to open the create-task dialog
const todayBtn = page.locator('button:has(span.font-bold)').first()
await todayBtn.dblclick()
await page.waitForTimeout(800)
const dialogVisible = (await page.locator('[role="dialog"]').count()) > 0
console.log('create-task dialog opened:', dialogVisible)

// Fill title and submit
await page.locator('[role="dialog"] input').first().fill('تست ثبت وظیفه از UI')
await page.locator('[role="dialog"] button:has-text("ایجاد وظیفه")').click()
await page.waitForTimeout(2500)

const toast = await page.locator('[data-sonner-toast]').textContent().catch(() => '')
console.log('toast:', (toast || '').slice(0, 80))
console.log('dialog closed after save:', (await page.locator('[role="dialog"]').count()) === 0)

// Check the "وظایف پیش‌رو" list now includes our task
const upcoming = await page.locator('main').textContent()
console.log('task visible in upcoming list:', (upcoming || '').includes('تست ثبت وظیفه از UI'))

console.log('--- API errors during run:', apiErrors.length)
apiErrors.slice(0, 5).forEach(e => console.log('  ', e))

await browser.close()
console.log(apiErrors.length === 0 ? 'ALL PASS' : 'HAS API ERRORS')
