import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const results = []
let currentView = 'login'

const browser = await chromium.launch()
const page = await browser.newPage()

page.on('pageerror', (err) => results.push({ type: 'pageerror', view: currentView, text: String(err).slice(0, 250) }))
page.on('response', (res) => {
  if (res.status() >= 400 && res.url().includes('/api/') && !res.url().includes('/api/auth/me')) {
    results.push({ type: 'http', view: currentView, text: `${res.status()} ${res.url().replace(BASE, '')}` })
  }
})

await page.goto(BASE)
await page.waitForTimeout(2500)
if ((await page.locator('input[type="password"]').count()) > 0) {
  await page.locator('input').first().fill('09121234567')
  await page.locator('input[type="password"]').fill('CdVgz6mYFNzGq9')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(3000)
}

// Test 1: activity-logs renders without crash
currentView = 'activity-logs'
await page.locator('[data-testid="nav-activity-logs"]').click()
await page.waitForTimeout(2000)
const logItems = await page.locator('text=رویداد').count()
console.log(`activity-logs: rendered OK (log badges: ${logItems})`)

// Test 2: settings nav exists
if ((await page.locator('[data-testid="nav-settings"]').count()) === 0) {
  results.push({ type: 'nav-missing', view: 'settings' })
} else {
  console.log('settings nav: present')
}

// Test 3: dashboard "افزودن لید" opens leads page with create dialog
currentView = 'dashboard'
await page.locator('[data-testid="nav-dashboard"]').click()
await page.waitForTimeout(2000)
await page.locator('button:has-text("افزودن لید")').first().click()
await page.waitForTimeout(2000)
const url = page.url() // SPA, url unchanged — check dialog instead
const onLeads = (await page.locator('[role="dialog"]:visible').count()) > 0
console.log(`add-lead quick action → create dialog open: ${onLeads}`)
if (!onLeads) results.push({ type: 'quick-action', view: 'dashboard', text: 'create dialog did not open' })

// Test 4: calendar quick action goes to calendar view
await page.keyboard.press('Escape')
currentView = 'dashboard'
await page.locator('[data-testid="nav-dashboard"]').click()
await page.waitForTimeout(1500)
await page.locator('button:has-text("مشاهده تقویم")').first().click()
await page.waitForTimeout(1500)
const calActive = await page.locator('[data-testid="nav-calendar"].bg-emerald-600, button.bg-emerald-600[data-testid="nav-calendar"]').count()
console.log(`calendar quick action → active: ${calActive > 0}`)

console.log(JSON.stringify(results, null, 2))
if (results.length === 0) console.log('CLEAN')
await browser.close()
