// Broader audit of the follow-up calendar page: month navigation, creating a task
// from the dialog, completing a task and deleting a task from "وظایف پیش‌رو",
// while watching for any API 4xx/5xx or uncaught page error.
//
// Usage:
//   BASE_URL=https://amincrm.freebuff.app node scripts/audit-calendar.mjs
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:3000'
const IDENTIFIER = process.env.QA_IDENTIFIER || 'admin'
const PASSWORD = process.env.QA_PASSWORD || 'admin'

const stamp = Date.now()
const UI_TASK = `تست تقویم (فرم) ${stamp}`
const DONE_TASK = `تست تقویم (تکمیل) ${stamp}`
const DEL_TASK = `تست تقویم (حذف) ${stamp}`

const apiErrors = []
const pageErrors = []
const results = {}

// --- seed/cookie helpers (direct API, keeps the UI assertions honest) ---
const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: IDENTIFIER, password: PASSWORD }),
})
const cookie = (login.headers.get('set-cookie') || '').split(';')[0]
if (login.status !== 200) {
    console.log('login failed', login.status)
    process.exit(1)
}
const api = (path, init = {}) =>
    fetch(BASE + path, { ...init, headers: { 'Content-Type': 'application/json', cookie, ...(init.headers || {}) } })

const dueDate = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
const seeded = []
for (const title of [DONE_TASK, DEL_TASK]) {
    const res = await api('/api/tasks', { method: 'POST', body: JSON.stringify({ title, due_date: dueDate }) })
    seeded.push((await res.json()).id)
}

const browser = await chromium.launch()
const page = await browser.newPage()
page.on('response', async (res) => {
    if (res.status() >= 400 && res.url().includes('/api/')) {
        let body = ''
        try { body = (await res.text()).slice(0, 160) } catch { /* ignore */ }
        apiErrors.push(`${res.request().method()} ${res.url().replace(BASE, '')} -> ${res.status()} ${body}`)
    }
})
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 160)))
page.on('dialog', (d) => d.accept())

const toasts = () => page.locator('[data-sonner-toast]').allTextContents()
const sawToast = async (needle, ms = 4000) => {
    const deadline = Date.now() + ms
    while (Date.now() < deadline) {
        if ((await toasts()).some((t) => t.includes(needle))) return true
        await page.waitForTimeout(300)
    }
    return false
}

try {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(4000)
    if (await page.locator('input[type="password"]').count()) {
        await page.locator('input').first().fill(IDENTIFIER)
        await page.locator('input[type="password"]').fill(PASSWORD)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(4000)
    }
    results.loggedIn = (await page.locator('[data-testid="nav-calendar"]').count()) > 0

    await page.locator('[data-testid="nav-calendar"]').click()
    await page.waitForTimeout(3000)

    // month navigation
    const header = page.locator('main h1, main').first()
    const before = await header.textContent()
    await page.locator('button:has(svg.lucide-chevron-left)').first().click()
    await page.waitForTimeout(800)
    const afterNext = await page.locator('div:has(> button:has(svg.lucide-calendar-days))').first().textContent().catch(() => '')
    await page.locator('button:has(svg.lucide-chevron-right)').first().click()
    await page.waitForTimeout(800)
    results.monthNav = Boolean(before && afterNext)

    // create a task through the dialog (the reported bug)
    await page.locator('button.ring-2').first().dblclick()
    await page.waitForTimeout(1200)
    const dialog = page.locator('[role="dialog"]').first()
    results.dialogOpened = (await dialog.count()) > 0
    await dialog.locator('input').first().fill(UI_TASK)
    await dialog.locator('textarea').first().fill('بررسی خودکار')
    await dialog.locator('button:has-text("ایجاد وظیفه")').click()
    results.createToast = await sawToast('وظیفه ایجاد شد')
    await page.waitForTimeout(1500)

    // complete a task from the upcoming list
    const doneRow = page.locator('div.rounded-lg.border').filter({ hasText: DONE_TASK }).first()
    results.doneRowVisible = (await doneRow.count()) > 0
    if (results.doneRowVisible) {
        await doneRow.locator('button:has(svg[class*="lucide-circle-check"])').first().click()
        results.completeToast = await sawToast('تکمیل شد')
        await page.waitForTimeout(1000)
    }

    // delete a task from the upcoming list (window.confirm is auto-accepted)
    const delRow = page.locator('div.rounded-lg.border').filter({ hasText: DEL_TASK }).first()
    results.delRowVisible = (await delRow.count()) > 0
    if (results.delRowVisible) {
        await delRow.locator('button:has(svg[class*="lucide-trash"])').first().click()
        results.deleteToast = await sawToast('حذف شد')
        await page.waitForTimeout(1000)
    }

    // the created task must be gone from the server once deleted, and present otherwise
    const list = await (await api('/api/tasks')).json()
    const titles = (Array.isArray(list) ? list : []).map((t) => t.title)
    results.createdTaskPersisted = titles.includes(UI_TASK)
    results.deletedTaskGone = !titles.includes(DEL_TASK)
} finally {
    const list = await (await api('/api/tasks')).json().catch(() => [])
    for (const t of Array.isArray(list) ? list : []) {
        if ([UI_TASK, DONE_TASK, DEL_TASK].includes(t.title)) await api(`/api/tasks/${t.id}`, { method: 'DELETE' })
    }
    await browser.close()
}

const ok = results.loggedIn && results.monthNav && results.dialogOpened && results.createToast
    && results.doneRowVisible && results.completeToast
    && results.delRowVisible && results.deleteToast
    && results.createdTaskPersisted && results.deletedTaskGone
    && apiErrors.length === 0 && pageErrors.length === 0

console.log(JSON.stringify({ base: BASE, ...results, apiErrors, pageErrors }, null, 2))
console.log(ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)
