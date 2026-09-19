const { PrismaClient } = require('@prisma/client')

const webhookUrl = process.env.REMINDER_WEBHOOK_URL
const webhookMethod = process.env.REMINDER_WEBHOOK_METHOD || 'POST'
const payloadTemplate = process.env.REMINDER_WEBHOOK_PAYLOAD_TEMPLATE
    || '{"recipient_phone":"{recipient_phone}","title":"{title}","due_date":"{due_date}","description":"{description}"}'
const pollIntervalMs = Number(process.env.REMINDER_POLL_INTERVAL_MS || 60_000)

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required for the reminder worker.')
    process.exit(1)
}

if (!webhookUrl) {
    console.error('REMINDER_WEBHOOK_URL is required for the reminder worker.')
    process.exit(1)
}

if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 10_000) {
    console.error('REMINDER_POLL_INTERVAL_MS must be a number of at least 10000.')
    process.exit(1)
}

let webhookHeaders
try {
    webhookHeaders = JSON.parse(
        process.env.REMINDER_WEBHOOK_HEADERS || '{"Content-Type":"application/json"}'
    )
} catch (error) {
    console.error('REMINDER_WEBHOOK_HEADERS must contain valid JSON.', error)
    process.exit(1)
}

const prisma = new PrismaClient({ log: ['error'] })
let timer
let shuttingDown = false

function replacePlaceholders(value, replacements) {
    if (typeof value === 'string') {
        let result = value
        for (const [key, replacement] of Object.entries(replacements)) {
            result = result.replace(new RegExp(`{${key}}`, 'g'), () => replacement)
        }
        return result
    }

    if (Array.isArray(value)) {
        return value.map((item) => replacePlaceholders(item, replacements))
    }

    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                replacePlaceholders(item, replacements),
            ])
        )
    }

    return value
}

function buildPayload(replacements) {
    try {
        return JSON.stringify(
            replacePlaceholders(JSON.parse(payloadTemplate), replacements)
        )
    } catch {
        return replacePlaceholders(payloadTemplate, replacements)
    }
}

async function dispatchReminder(task) {
    const agentPhone = task.agent?.phone_number || ''
    const replacements = {
        recipient_phone: agentPhone,
        agent_phone: agentPhone,
        lead_phone: task.lead?.phone_number || '',
        title: task.title || '',
        due_date: task.due_date?.toISOString() || '',
        description: task.description || '',
    }

    try {
        const response = await fetch(webhookUrl, {
            method: webhookMethod,
            headers: webhookHeaders,
            body: buildPayload(replacements),
            signal: AbortSignal.timeout(15_000),
        })
        const responseText = await response.text()

        if (!response.ok) {
            throw new Error(
                `Webhook returned ${response.status}: ${responseText.slice(0, 200)}`
            )
        }

        await prisma.$transaction([
            prisma.task.update({
                where: { id: task.id },
                data: { reminder_sent: true },
            }),
            prisma.activityLog.create({
                data: {
                    user_id: 'system',
                    user_name: 'System Scheduler',
                    user_role: 'SYSTEM',
                    action: 'REMINDER_DISPATCH_SUCCESS',
                    description: `Reminder sent for task "${task.title}" (${task.id}) to ${agentPhone}.`,
                },
            }),
        ])

        console.log(`Reminder sent for task ${task.id}.`)
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`Reminder failed for task ${task.id}; it will be retried.`, message)
        await prisma.activityLog.create({
            data: {
                user_id: 'system',
                user_name: 'System Scheduler',
                user_role: 'SYSTEM',
                action: 'REMINDER_DISPATCH_FAILURE',
                description: `Reminder failed for task "${task.title}" (${task.id}): ${message.slice(0, 500)}`,
            },
        })
    }
}

async function checkAndSendReminders() {
    const now = new Date()
    const tasks = await prisma.task.findMany({
        where: {
            status: 'PENDING',
            reminder_sent: false,
            reminder_time: { not: null },
            due_date: { lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
        },
        include: { agent: true, lead: true },
    })

    for (const task of tasks) {
        const triggerTime = new Date(
            task.due_date.getTime() - task.reminder_time * 60 * 1000
        )
        if (now >= triggerTime) {
            await dispatchReminder(task)
        }
    }
}

async function run() {
    try {
        await checkAndSendReminders()
    } catch (error) {
        console.error('Reminder polling cycle failed.', error)
    } finally {
        if (!shuttingDown) {
            timer = setTimeout(run, pollIntervalMs)
        }
    }
}

async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    if (timer) clearTimeout(timer)
    console.log(`Received ${signal}; stopping reminder worker.`)
    await prisma.$disconnect()
    process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

console.log(`Reminder worker started; polling every ${pollIntervalMs}ms.`)
void run()
