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

// Help nav item exists and page renders
ok('help nav exists', (await page.locator('[data-testid="nav-help"]').count()) > 0)
await page.locator('[data-testid="nav-help"]').click()
await page.waitForTimeout(1500)
const helpText = (await page.locator('main').textContent()) || ''
ok('help page renders with sections', helpText.includes('راهنمای استفاده') && helpText.includes('کانبن'))
// open a different accordion section
await page.locator('button:has-text("مدیریت لیدها")').first().click().catch(() => {})
await page.waitForTimeout(500)
ok('accordion expands tips', ((await page.locator('main').textContent()) || '').includes('تبدیل'))

// Dashboard charts still render with new palette
await page.locator('[data-testid="nav-dashboard"]').click()
await page.waitForTimeout(3500)
const svgCount = await page.locator('.recharts-surface').count()
ok(`dashboard charts render (${svgCount})`, svgCount > 0)
const bodyText = (await page.locator('main').textContent()) || ''
ok('no NaN/undefined in dashboard', !bodyText.includes('NaN') && !bodyText.includes('undefined'))

// Analytics page
await page.locator('[data-testid="nav-analytics"]').click()
await page.waitForTimeout(3500)
const analyticsSvg = await page.locator('.recharts-surface').count()
ok(`analytics charts render (${analyticsSvg})`, analyticsSvg > 0)

// primary color is Notion blue now
const bg = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
)
console.log(`INFO: --primary = ${bg}`)

await browser.close()
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
