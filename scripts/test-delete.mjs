import { chromium } from 'playwright'

const BASE = 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage()

page.on('pageerror', (err) => console.log('PAGEERROR:', String(err).slice(0, 200)))
page.on('response', async (res) => {
  if (res.request().method() === 'DELETE' || (res.status() >= 400 && res.url().includes('/api/'))) {
    let body = ''
    try { body = (await res.text()).slice(0, 150) } catch {}
    console.log(`API: ${res.request().method()} ${res.url().replace(BASE, '')} -> ${res.status()} ${body}`)
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

// Go to leads
await page.locator('[data-testid="nav-leads"]').click()
await page.waitForTimeout(2500)

// Count lead rows
const rowsBefore = await page.locator('tbody tr').count()
console.log('lead rows before:', rowsBefore)

// Click first row delete button
const delBtn = page.locator('button[title="حذف لید"]').first()
if ((await delBtn.count()) === 0) {
  console.log('DELETE BUTTON NOT FOUND in table rows!')
} else {
  await delBtn.click()
  await page.waitForTimeout(1000)
  const dialogVisible = (await page.locator('[role="alertdialog"]:visible, [role="dialog"]:visible').count()) > 0
  console.log('confirm dialog visible:', dialogVisible)
  if (dialogVisible) {
    const confirmBtn = page.locator('[role="alertdialog"] button:has-text("حذف"), [role="dialog"] button:has-text("حذف")').last()
    await confirmBtn.click()
    await page.waitForTimeout(2500)
    const toast = await page.locator('[data-sonner-toast]').textContent().catch(() => 'no toast')
    console.log('toast:', toast)
    const rowsAfter = await page.locator('tbody tr').count()
    console.log('lead rows after:', rowsAfter)
  }
}

await browser.close()
