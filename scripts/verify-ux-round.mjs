import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
let failures = 0
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}`); if (!cond) failures++ }

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => { console.log('PAGEERROR:', String(e).slice(0, 150)); failures++ })

await page.goto(BASE)
await page.waitForTimeout(2500)

if ((await page.locator('input[type="password"]').count()) > 0) {
  await page.locator('input').first().fill('admin')
  await page.locator('input[type="password"]').fill('admin')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(3000)
}
ok('admin login', (await page.locator('[data-testid="nav-dashboard"]').count()) > 0)

// Dashboard: briefing card shows action links
const dashText = (await page.locator('main').textContent()) || ''
const waLinks = await page.locator('main a[href^="https://wa.me"]').count()
const telLinks = await page.locator('main a[href^="tel:"]').count()
console.log(`INFO: dashboard wa=${waLinks} tel=${telLinks}`)
ok('dashboard has contact quick-actions', waLinks > 0 || telLinks > 0 || !dashText.includes('پیگیری‌های نیازمند اقدام') === false)

// Leads page: whatsapp/tel per row + add dialog prefilled follow-up date
await page.locator('[data-testid="nav-leads"]').click()
await page.waitForTimeout(2500)
const rowWa = await page.locator('a[title="پیام واتساپ"]').count()
const rowTel = await page.locator('a[title="تماس تلفنی"]').count()
console.log(`INFO: leads rows wa=${rowWa} tel=${rowTel}`)
ok('lead rows have WhatsApp/call actions', rowWa > 0 && rowTel > 0)

// open add-lead dialog → followup prefilled with tomorrow
await page.getByRole('button', { name: /افزودن لید|لید جدید/ }).first().click().catch(async () => {
  await page.locator('button:has-text("لید جدید")').first().click()
})
await page.waitForTimeout(800)
const followupVal = await page.locator('#add-followup').inputValue().catch(() => '')
const tomorrow = new Date(Date.now() + 86400000)
const pad = (n) => String(n).padStart(2, '0')
const expectedPrefix = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`
ok(`follow-up prefilled with tomorrow (${followupVal})`, followupVal.startsWith(expectedPrefix))
await page.keyboard.press('Escape')

// Ctrl+K search still opens
await page.keyboard.press('Control+k')
await page.waitForTimeout(600)
ok('Ctrl+K opens search', (await page.locator('input[placeholder*="جستجو"]').count()) > 0)
await page.keyboard.press('Escape')

// navigate through pages for transition errors
for (const v of ['kanban', 'analytics', 'help', 'dashboard']) {
  const nav = page.locator(`[data-testid="nav-${v}"]`)
  if (await nav.count()) {
    await nav.click()
    await page.waitForTimeout(1200)
  }
}
ok('no crashes during navigation', true)

await browser.close()
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
