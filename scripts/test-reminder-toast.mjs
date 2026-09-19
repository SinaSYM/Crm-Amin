import { chromium } from 'playwright'

const BASE = process.env.PREVIEW_URL || 'http://localhost:3000'
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 150)))

// Login via API to get the cookie, then inject into the browser context
const loginRes = await fetch(BASE + '/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: 'admin', password: 'admin' }),
})
const setCookie = loginRes.headers.get('set-cookie') || ''
const cookieValue = setCookie.split(';')[0]
console.log('login:', loginRes.status)

// Create a task due in 2 minutes with a 1-minute reminder
const due = new Date(Date.now() + 2 * 60_000)
const res = await fetch(BASE + '/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', cookie: cookieValue },
  body: JSON.stringify({ title: 'تست یادآور زنده', due_date: due.toISOString(), reminder_time: 1 }),
})
const task = await res.json()
console.log('task created:', res.status, task.id, 'due:', task.due_date)

// Open the app and wait for the reminder window + a poll tick
const context = await browser.newContext()
if (cookieValue) {
  const [name, ...rest] = cookieValue.split('=')
  await context.addCookies([{ name, value: rest.join('='), domain: new URL(BASE).hostname, path: '/' }])
}
const appPage = await context.newPage()
await appPage.goto(BASE, { waitUntil: 'domcontentloaded' })
await appPage.waitForTimeout(3000)

console.log('waiting up to 100s for the reminder toast...')
let fired = false
const deadline = Date.now() + 100_000
while (Date.now() < deadline && !fired) {
  const toast = await appPage.locator('[data-sonner-toast]').textContent().catch(() => '')
  if (toast && toast.includes('یادآور') && toast.includes('تست یادآور زنده')) {
    fired = true
    console.log('REMINDER TOAST FIRED:', toast.slice(0, 120))
    break
  }
  await appPage.waitForTimeout(3000)
}

// Cleanup
await fetch(BASE + '/api/tasks/' + task.id, { method: 'DELETE', headers: { cookie: cookieValue } })
console.log('cleanup done')

await browser.close()
console.log(fired ? 'REMINDER PASS' : 'REMINDER DID NOT FIRE')
process.exit(fired ? 0 : 1)
