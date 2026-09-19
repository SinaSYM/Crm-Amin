import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
let failures = 0
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}`); if (!cond) failures++ }

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 150)))

await page.goto(BASE)
await page.waitForTimeout(2500)

// login
if ((await page.locator('input[type="password"]').count()) > 0) {
  await page.locator('input').first().fill('admin')
  await page.locator('input[type="password"]').fill('admin')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(3000)
}
ok('admin login', (await page.locator('[data-testid="nav-dashboard"]').count()) > 0)

// sidebar visual checks
const aside = page.locator('aside')
ok('sidebar uses neutral surface', (await aside.getAttribute('class'))?.includes('bg-sidebar'))

// navigate across several pages, ensure each renders without crash
const views = ['leads', 'kanban', 'analytics', 'users', 'courses', 'calendar', 'settings']
for (const v of views) {
  const nav = page.locator(`[data-testid="nav-${v}"]`)
  if ((await nav.count()) === 0) { console.log(`SKIP: nav-${v} not visible`); continue }
  await nav.click()
  await page.waitForTimeout(1800)
  const bodyText = (await page.locator('main').textContent().catch(() => '')) || ''
  ok(`view ${v} renders`, bodyText.length > 50 && !bodyText.includes('NaN'))
}

// dark mode toggle still functional
await page.getByTitle('حالت تاریک').click().catch(() => {})
await page.waitForTimeout(800)
const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
console.log(`${isDark ? 'PASS' : 'INFO'}: dark mode toggled (${isDark})`)
if (!isDark) failures++
await page.getByTitle('حالت روشن').click().catch(() => {})
await page.waitForTimeout(500)

await page.screenshot({ path: 'scripts/notion-preview.png', fullPage: false })
await browser.close()
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
