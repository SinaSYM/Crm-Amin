/**
 * Persian-locale date-input sanitizer.
 *
 * Problem it solves: an `<input type="date">` / `datetime-local` inside a
 * `dir="rtl"` Persian UI lets the browser render its picker in the user's
 * locale. On many devices (and all Persian-locale browsers) the picker is
 * Jalali/Shamsi, so a user typing «1405/06/23» produces the raw value
 * "1405-06-23" — a Gregorian string — which is stored as-is and later
 * renders as absurd dates (e.g. «۷۸۴/۴/۲»). Same for "4222-02-02"
 * (year typed into the wrong segment).
 *
 * Strategy: treat the raw value as Jalali when the parsed Gregorian year is
 * implausible relative to today (±2 years default), then convert the Jalali
 * triple to Gregorian. Values that are already plausible Gregorian pass
 * through unchanged, so desktop Gregorian pickers keep working.
 */

/** Gregorian -> Jalali. Returns [jy, jm, jd]. */
export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy: number
  if (gy > 1600) {
    jy = 979
    gy -= 1600
  } else {
    jy = 0
    gy -= 621
  }
  const gy2 = gm > 2 ? gy + 1 : gy
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1]
  jy += 33 * Math.floor(days / 12053)
  days %= 12053
  jy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30)
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30)
  return [jy, jm, jd]
}

/** Jalali -> Gregorian. Returns [gy, gm, gd]. */
export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy: number
  if (jy > 979) {
    gy = 1600
    jy -= 979
  } else {
    gy = 621
  }
  let days = 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + 78 + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186)
  gy += 400 * Math.floor(days / 146097)
  days %= 146097
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524)
    days %= 36524
    if (days >= 365) days++
  }
  gy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    gy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  let gd = days + 1
  const sal_a = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let gm: number
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm]
  }
  return [gy, gm, gd]
}

/**
 * Sanitize a raw date/datetime-local input value.
 * Returns null for empty/invalid input.
 *
 * @param raw        value from the input (e.g. "1405-06-23" or "1405-06-23T11:00")
 * @param now        reference "today" (defaults to new Date())
 * @param yearWindow allowed Gregorian-year distance from now before we assume Jalali
 */
export function sanitizePersianDateInput(
  raw: string | null | undefined,
  now: Date = new Date(),
  yearWindow = 2,
): string | null {
  if (!raw) return null
  const value = String(raw).trim()
  if (!value) return null

  const m = value.match(/^(\d{3,4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2}))?/)
  if (!m) {
    // Not the expected ISO shape; let the caller/API handle or reject it.
    return value
  }

  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const hh = m[4] ? Number(m[4]) : 0
  const mi = m[5] ? Number(m[5]) : 0

  if (mo < 1 || mo > 12 || d < 1 || d > 31 || hh > 23 || mi > 59) return value

  const currentGregorianYear = now.getFullYear()

  // Already a plausible Gregorian year -> pass through untouched.
  if (Math.abs(y - currentGregorianYear) <= yearWindow) return value

  // Implausible Gregorian year: the user almost certainly entered a Jalali
  // date (e.g. 1405 or 4222 from typing into the year segment). Convert.
  const [gy, gm, gd] = jalaliToGregorian(y, mo, d)
  const pad = (n: number) => String(n).padStart(2, '0')
  const datePart = `${gy}-${pad(gm)}-${pad(gd)}`
  const timePart = m[4] ? `T${pad(hh)}:${pad(mi)}` : ''
  return datePart + timePart
}

/** Format a date in Persian (Jalali) calendar with Persian numerals. */
export function formatJalaliDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '-'
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
  } catch {
    return d.toLocaleDateString('fa-IR')
  }
}

/** Format date + time in Persian calendar with Persian numerals. */
export function formatJalaliDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return '-'
  try {
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return d.toLocaleString('fa-IR')
  }
}

/** Normalize any stored date-like string (including corrupted Jalali-in-Gregorian values) to a real Date. */
export function parseStoredDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const sanitized = sanitizePersianDateInput(value)
  if (!sanitized) return null
  const d = new Date(sanitized)
  return Number.isNaN(d.getTime()) ? null : d
}
