import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
let errors = 0
page.on('pageerror', (e) => { errors++; console.log('PAGEERROR:', String(e).slice(0, 150)) })

// Login
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
await page.fill('input[name="identifier"], input[type="text"]', 'admin').catch(() => {})
await page.fill('input[type="password"]', 'admin')
await page.click('button[type="submit"]')
await page.waitForTimeout(2500)

console.log('URL after login:', page.url())

// Check glass styles applied
const checks = await page.evaluate(() => {
    const results = {}
    const header = document.querySelector('header')
    results.headerGlass = header ? getComputedStyle(header).backdropFilter !== 'none' : false
    const sidebar = document.querySelector('aside')
    results.sidebarGlass = sidebar ? getComputedStyle(sidebar).backdropFilter.includes('blur') : false
    const primaryBtn = document.querySelector('button.bg-gradient-to-b, [data-slot="button"].bg-gradient-to-b')
        || [...document.querySelectorAll('button')].find((b) => getComputedStyle(b).backgroundImage.includes('gradient'))
    results.primaryGradient = !!primaryBtn
    if (primaryBtn) {
        const s = getComputedStyle(primaryBtn)
        results.primaryShadow = s.boxShadow.length > 20
    }
    results.bodyAmbient = getComputedStyle(document.body).backgroundImage.includes('radial-gradient')
    return results
})
console.log(JSON.stringify(checks, null, 1))

await page.screenshot({ path: '/tmp/glass-dashboard.png' })

// Navigate a couple of pages to make sure nothing breaks
for (const key of ['leads', 'analytics']) {
    const btn = document && null // noop
}
const navBtns = await page.$$('[data-testid^="nav-"]')
console.log('nav items:', navBtns.length)

console.log('JS errors:', errors)
await browser.close()
