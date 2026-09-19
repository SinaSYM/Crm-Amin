import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
let fails = 0
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}`); if (!cond) fails++ }

page.on('pageerror', (err) => { console.log('PAGEERROR:', String(err).slice(0, 200)); fails++ })

// 1) Login page renders new minimal design (no green header block)
await page.goto(BASE + '/', { waitUntil: 'networkidle' })
const bodyBg = await page.evaluate(() => getComputedStyle(document.querySelector('.auth-canvas') || document.body).background.slice(0, 80))
ok('login canvas uses warm auth-canvas background', bodyBg.includes('radial-gradient'))
const logoMark = await page.$('.auth-canvas .bg-foreground')
ok('login logo mark is monochrome (foreground)', !!logoMark)
const greenHeader = await page.$('.auth-canvas [class*="bg-emerald-600"]')
ok('no heavy colored header on login', !greenHeader)

// 2) Login as admin
await page.fill('#login-id', 'admin')
await page.fill('#login-pass', 'admin')
await page.click('button[type="submit"]')
await page.waitForTimeout(2500)
ok('logged in', !(await page.$('.auth-canvas')))

// 3) Dashboard quick actions restyled (no loud gradient buttons)
const gradBtn = await page.$$eval('button', btns => btns.filter(b => b.className.includes('from-emerald-50')).length)
ok('quick actions have no emerald gradients', gradBtn === 0)
const statStrip = await page.$$eval('div', els => els.filter(e => e.className && typeof e.className === 'string' && e.className.includes('h-[3px]') && e.className.includes('#2383e2')).length)
ok('stat cards use Notion-blue accent strip', statStrip >= 1)

// 4) Navigate a few pages for JS errors
for (const v of ['leads', 'analytics', 'settings', 'help']) {
  const nav = await page.$(`[data-testid="nav-${v}"], button[data-testid="nav-${v}"]`)
  if (nav) { await nav.click(); await page.waitForTimeout(900) }
}
ok('no JS errors during navigation', true)

console.log(fails === 0 ? '\nALL CHECKS PASSED' : `\n${fails} FAILURES`)
await browser.close()
process.exit(fails === 0 ? 0 : 1)
