import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage()

page.on('pageerror', (err) => console.log('PAGEERROR:', String(err).slice(0, 300)))
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 200)) })
page.on('response', async (res) => {
  if (res.status() >= 400 && res.url().includes('/api/')) {
    let body = ''
    try { body = (await res.text()).slice(0, 120) } catch {}
    console.log(`API ${res.status()} ${res.url().replace(BASE, '')} ${body}`)
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

// Analytics
console.log('=== ANALYTICS PAGE ===')
await page.locator('[data-testid="nav-analytics"]').click()
await page.waitForTimeout(3500)
// count rendered chart SVGs and any NaN/undefined text
const svgCount = await page.locator('.recharts-surface').count()
console.log('recharts svgs:', svgCount)
const bodyText = await page.locator('main').textContent()
const nanHits = bodyText.match(/NaN|undefined|Infinity/g)
console.log('bad tokens:', nanHits ? nanHits.slice(0, 10) : 'none')

// Dashboard
console.log('=== DASHBOARD ===')
await page.locator('[data-testid="nav-dashboard"]').click()
await page.waitForTimeout(3500)
const svgCount2 = await page.locator('.recharts-surface').count()
console.log('recharts svgs:', svgCount2)
const bodyText2 = await page.locator('main').textContent()
const nanHits2 = bodyText2.match(/NaN|undefined|Infinity/g)
console.log('bad tokens:', nanHits2 ? nanHits2.slice(0, 10) : 'none')

// Enrollments
console.log('=== ENROLLMENTS ===')
await page.locator('[data-testid="nav-enrollments"]').click()
await page.waitForTimeout(3000)

await browser.close()
console.log('DONE')
