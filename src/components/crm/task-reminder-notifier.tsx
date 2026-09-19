'use client'

import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { BellRing } from 'lucide-react'
import { formatJalaliDateTime } from '@/lib/persian-date'

interface TaskLike {
  id: string
  title: string
  description?: string | null
  due_date: string
  status: string
  reminder_time?: number | null
}

const POLL_INTERVAL_MS = 60_000
const STORAGE_KEY = 'crm-reminded-task-ids'

/**
 * In-app reminder engine.
 *
 * The scheduled `src/cron/reminder-worker.js` only fires when explicitly
 * deployed alongside a webhook (it is not started by the Next.js server), so
 * users who pick «یادآور» when creating a task never see anything happen.
 * This component polls `/api/tasks` once a minute while the CRM is open and
 * fires a toast notification at each task's reminder time (due_date minus
 * reminder_time minutes). Fired reminder ids are kept in localStorage so a
 * page refresh doesn't re-alert.
 *
 * Tasks with no reminder_time fall back to alerting at the due time itself.
 */
export default function TaskReminderNotifier() {
  // Track ids already alerted this session to avoid duplicate toasts.
  const alertedRef = useRef<Set<string>>(new Set())

  const getStoredIds = useCallback((): string[] => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch {
      return []
    }
  }, [])

  const markStored = useCallback((id: string) => {
    try {
      const ids = getStoredIds()
      if (!ids.includes(id)) {
        ids.push(id)
        // Keep the list bounded: drop the oldest 200 entries beyond the cap.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(-200)))
      }
    } catch {
      // localStorage unavailable — session-only dedup still applies.
    }
  }, [getStoredIds])

  const checkReminders = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks')
      if (!res.ok) return
      const json: unknown = await res.json()
      if (!Array.isArray(json)) return

      const now = Date.now()
      const stored = new Set(getStoredIds())

      for (const t of json as TaskLike[]) {
        if (!t || typeof t.id !== 'string') continue
        if (t.status !== 'PENDING') continue
        if (stored.has(t.id) || alertedRef.current.has(t.id)) continue

        const due = new Date(t.due_date)
        if (Number.isNaN(due.getTime())) continue

        const reminderMinutes = typeof t.reminder_time === 'number' && t.reminder_time >= 0
          ? t.reminder_time
          : 0 // no reminder set -> alert at due time
        const triggerAt = due.getTime() - reminderMinutes * 60_000

        // Fire when the reminder window is open; also catch tasks whose
        // window passed while the tab was closed (up to 24h late).
        const lateGraceMs = 24 * 60 * 60_000
        if (now >= triggerAt && now - triggerAt <= lateGraceMs) {
          alertedRef.current.add(t.id)
          markStored(t.id)

          const faNum = (n: number) => n.toLocaleString('fa-IR')
          const reminderLabel = reminderMinutes > 0
            ? `یادآور ${reminderMinutes >= 60 ? `${faNum(Math.round(reminderMinutes / 60))} ساعته` : `${faNum(reminderMinutes)} دقیقه‌ای`}`
            : 'زمان انجام'

          toast.custom(() => (
            <div
              dir="rtl"
              className="flex items-start gap-3 rounded-lg border bg-background p-3.5 shadow-lg w-[340px]"
              role="status"
            >
              <span className="mt-0.5 rounded-md bg-amber-100 p-2 dark:bg-amber-900/40">
                <BellRing className="size-4 text-amber-600 dark:text-amber-400" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{reminderLabel}: {t.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  موعد انجام: {formatJalaliDateTime(due)}
                </p>
                {t.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>
                ) : null}
              </div>
            </div>
          ), { duration: 12_000 })
        }
      }
    } catch {
      // Network failure — retry on the next tick.
    }
  }, [getStoredIds, markStored])

  useEffect(() => {
    // First check shortly after mount, then poll every minute.
    const initial = setTimeout(checkReminders, 2_000)
    const interval = setInterval(checkReminders, POLL_INTERVAL_MS)
    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [checkReminders])

  return null
}
