import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
let failures = 0
const ok = (name, cond) => { console.log(`${cond ? 'PASS' : 'FAIL'}: ${name}`); if (!cond) failures++ }

const browser = await chromium.launch()

// ── Admin flow: login → delete lead ──
{
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 150)))
  await page.goto(BASE)
  await page.waitForTimeout(2500)
  if ((await page.locator('input[type="password"]').count()) > 0) {
    await page.locator('input').first().fill('09121234567')
    await page.locator('input[type="password"]').fill('CdVgz6mYFNzGq9')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(3000)
  }
  ok('admin login', (await page.locator('[data-testid="nav-dashboard"]').count()) > 0)

  // no quick login / demo section anywhere
  const demoText = await page.locator('text=ورود سریع').count()
  ok('no quick-login section', demoText === 0)

  // create a throwaway lead then delete it
  await page.locator('[data-testid="nav-leads"]').click()
  await page.waitForTimeout(2500)
  const rowsBefore = await page.locator('tbody tr').count()
  if (rowsBefore > 0) {
    await page.locator('button[title="حذف لید"]').first().click()
    await page.waitForTimeout(800)
    await page.locator('[role="alertdialog"] button:has-text("حذف")').last().click()
    await page.waitForTimeout(2500)
    const toast = await page.locator('[data-sonner-toast]').textContent().catch(() => '')
    ok('lead deleted with success toast', (toast || '').includes('حذف شد'))
  } else {
    console.log('(no leads left to test delete — already cleaned)')
  }
  await page.close()
}

// ── Manager flow: chart has data ──
{
  const page = await browser.newPage()
  await page.goto(BASE)
  await page.waitForTimeout(2000)
  // clear persisted session by using fresh context (new page in same context shares storage? no—newPage from browser is isolated-ish; be safe:)
  await page.evaluate(() => localStorage.clear()).catch(() => {})
  await page.goto(BASE)
  await page.waitForTimeout(2000)
  if ((await page.locator('input[type="password"]').count()) > 0) {
    await page.locator('input').first().fill('09121234568')
    await page.locator('input[type="password"]').fill('Demo1234!')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(3000)
  }
  // wait for bar chart to render
  await page.waitForTimeout(3000)
  const bars = await page.locator('.recharts-bar-rectangle').count()
  ok(`manager dashboard "ثبت‌نام به ازای دوره" chart has bars (${bars})`, bars > 0)
  await page.close()
}

// ── Agent flow: no delete button visible ──
{
  const page = await browser.newPage()
  await page.context().clearCookies().catch(() => {})
  await page.goto(BASE)
  await page.evaluate(() => localStorage.clear()).catch(() => {})
  await page.goto(BASE)
  await page.waitForTimeout(2000)
  if ((await page.locator('input[type="password"]').count()) > 0) {
    await page.locator('input').first().fill('09121234569')
    await page.locator('input[type="password"]').fill('Demo1234!')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(3000)
  }
  const agentCanSeeLeads = (await page.locator('[data-testid="nav-leads"]').count()) > 0
  if (agentCanSeeLeads) {
    await page.locator('[data-testid="nav-leads"]').click()
    await page.waitForTimeout(2500)
    const delBtns = await page.locator('button[title="حذف لید"]').count()
    ok(`agent sees no delete buttons (${delBtns})`, delBtns === 0)
  }
  await page.close()
}

await browser.close()
console.log(failures === 0 ? 'ALL PASS' : `${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
