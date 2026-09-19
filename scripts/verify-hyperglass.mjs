import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e).slice(0, 150)))
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 150)) })

await page.goto(BASE + '/', { waitUntil: 'networkidle' })

// Login
await page.fill('#login-id', 'admin')
await page.fill('#login-pass', 'admin')
await page.click('button[type="submit"]')
await page.waitForTimeout(3000)

const results = {}

// 1. Floating pill header exists
results.pillHeader = await page.locator('header.glass-panel.rounded-full').count() > 0

// 2. Primary color is monochrome (not blue/green)
const primary = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
)
results.primaryToken = primary

// 3. No saturated Tailwind classes rendered on dashboard
const saturated = await page.evaluate(() => {
  const els = document.querySelectorAll('[class*="emerald-6"], [class*="blue-6"], [class*="teal-5"], [class*="indigo-6"]')
  return els.length
})
results.saturatedClasses = saturated

// 4. Navigate through key pages
for (const view of ['leads', 'kanban', 'interactions', 'analytics', 'settings']) {
  const nav = page.locator(`[data-testid="nav-${view}"]`)
  if (await nav.count() > 0) {
    await nav.first().click()
    await page.waitForTimeout(1500)
    const errs = errors.filter((e) => !e.includes('401'))
    if (errs.length > 0) { results['page_' + view] = 'ERRORS: ' + errs[0] } else { results['page_' + view] = 'ok' }
  }
}

// 5. Dark mode toggle works
await page.click('[title="حالت تاریک"]')
await page.waitForTimeout(800)
results.darkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'))
await page.click('[title="حالت روشن"]')

console.log(JSON.stringify(results, null, 2))
console.log('JS errors:', errors.filter((e) => !e.includes('401')).length)

await browser.close()
