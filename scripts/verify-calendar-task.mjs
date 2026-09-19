// End-to-end regression check for the calendar "create task" flow.
//
// Usage:
//   BASE_URL=https://amincrm.freebuff.app node scripts/verify-calendar-task.mjs
//   BASE_URL=http://localhost:3000 node scripts/verify-calendar-task.mjs
//
// Logs in through the real UI (admin/admin by default), creates a task from the
// calendar dialog, asserts it was saved without any API error, then deletes the
// task it created so the target database is left untouched.
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const IDENTIFIER = process.env.QA_IDENTIFIER || 'admin'
const PASSWORD = process.env.QA_PASSWORD || 'admin'
const TITLE = `تست خودکار وظیفه ${Date.now()}`

const apiErrors = []
const consoleErrors = []

const browser = await chromium.launch()
const page = await browser.newPage()

page.on('response', async (res) => {
    if (res.status() >= 400 && res.url().includes('/api/')) {
        let body = ''
        try { body = (await res.text()).slice(0, 200) } catch { /* ignore */ }
        apiErrors.push(`${res.request().method()} ${res.url().replace(BASE, '')} -> ${res.status()} ${body}`)
    }
})
page.on('pageerror', (e) => consoleErrors.push(String(e).slice(0, 200)))

const result = { base: BASE, loggedIn: false, dialogOpened: false, saved: false, toast: '', cleanedUp: false }

await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

// 1) log in through the real form
if (await page.locator('input[type="password"]').count()) {
    await page.locator('input').first().fill(IDENTIFIER)
    await page.locator('input[type="password"]').fill(PASSWORD)
    await page.keyboard.press('Enter')
    await page.waitForTimeout(4000)
}
result.loggedIn = (await page.locator('[data-testid="nav-calendar"]').count()) > 0
if (!result.loggedIn) {
    console.log(JSON.stringify({ ...result, apiErrors, consoleErrors }, null, 2))
    await browser.close()
    process.exit(1)
}

// 2) open the calendar and double-click today's cell (the one ringed as today)
await page.locator('[data-testid="nav-calendar"]').click()
await page.waitForTimeout(3000)

const todayCell = page.locator('button.ring-2').first()
if ((await todayCell.count()) === 0) {
    const dayCells = await page.locator('button[class*="min-h-[80px]"]').count()
    console.log(JSON.stringify({
        ...result,
        note: 'could not find today cell; calendar page not ready?',
        dayCellCount: dayCells,
        apiErrors,
        consoleErrors,
    }, null, 2))
    await browser.close()
    process.exit(1)
}
await todayCell.dblclick()
await page.waitForTimeout(1500)

const dialog = page.locator('[role="dialog"]').first()
result.dialogOpened = (await dialog.count()) > 0
if (!result.dialogOpened) {
    console.log(JSON.stringify({ ...result, apiErrors, consoleErrors }, null, 2))
    await browser.close()
    process.exit(1)
}

// 3) fill the form exactly like a user and submit
await dialog.locator('input').first().fill(TITLE)
await dialog.locator('textarea').first().fill('بررسی خودکار ثبت وظیفه')
await dialog.locator('button:has-text("ایجاد وظیفه")').click()
await page.waitForTimeout(3500)

const toastText = (await page.locator('[data-sonner-toast]').allTextContents()).join(' | ')
result.toast = toastText.slice(0, 120)
result.saved = toastText.includes('وظیفه ایجاد شد')
const closed = (await page.locator('[role="dialog"]').count()) === 0

// 4) confirm it is really on the server, then remove it
const created = await page.evaluate(async (title) => {
    const res = await fetch('/api/tasks', { credentials: 'include' })
    if (!res.ok) return null
    const tasks = await res.json()
    return tasks.find((t) => t.title === title) || null
}, TITLE)

if (created) {
    result.cleanedUp = await page.evaluate(async (id) => {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE', credentials: 'include' })
        return res.ok
    }, created.id)
}

await browser.close()

console.log(JSON.stringify({
    ...result,
    dialogClosedAfterSave: closed,
    persistedOnServer: Boolean(created),
    persistedReminder: created ? created.reminder_time : null,
    apiErrors,
    consoleErrors,
}, null, 2))

const ok = result.saved && closed && created && apiErrors.length === 0 && consoleErrors.length === 0
console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
