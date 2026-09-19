'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, LayoutDashboard, Users, Headphones, BookOpen, MessageSquare, GraduationCap, ClipboardList, BarChart3, ArrowLeft, CalendarDays, Kanban, Settings } from 'lucide-react'
import { useCRMStore, type ActiveView } from '@/lib/store'

interface SearchResult {
  key: ActiveView
  label: string
  section: string
  icon: React.ElementType
}

const searchItems: SearchResult[] = [
  { key: 'dashboard', label: 'داشبورد', section: 'عمومی', icon: LayoutDashboard },
  { key: 'leads', label: 'مدیریت لیدها', section: 'فروش', icon: Users },
  { key: 'kanban', label: 'خط لوله لیدها', section: 'فروش', icon: Kanban },
  { key: 'calendar', label: 'تقویم پیگیری‌ها', section: 'فروش', icon: CalendarDays },
  { key: 'sales-panel', label: 'پنل کارشناس فروش', section: 'فروش', icon: Headphones },
  { key: 'analytics', label: 'گزارش‌ها و تحلیل', section: 'گزارش‌ها', icon: BarChart3 },
  { key: 'users', label: 'کاربران', section: 'مدیریت', icon: ClipboardList },
  { key: 'courses', label: 'دوره‌ها', section: 'مدیریت', icon: BookOpen },
  { key: 'interactions', label: 'تعاملات', section: 'مدیریت', icon: MessageSquare },
  { key: 'enrollments', label: 'ثبت‌نام‌ها', section: 'مدیریت', icon: GraduationCap },
  { key: 'settings', label: 'تنظیمات', section: 'تنظیمات', icon: Settings },
  { key: 'roleplay', label: 'شبیه‌ساز تماس (AI)', section: 'فروش', icon: GraduationCap },
]

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { setActiveView } = useCRMStore()

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Filter results
  const filtered = query.trim()
    ? searchItems.filter(
        (item) =>
          item.label.includes(query) ||
          item.section.includes(query)
      )
    : searchItems

  // Compute selected index - reset to 0 when query changes
  const safeSelectedIndex = Math.min(selectedIndex, filtered.length - 1)
  const effectiveSelectedIndex = safeSelectedIndex >= 0 ? safeSelectedIndex : 0

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered[effectiveSelectedIndex]) {
        e.preventDefault()
        setActiveView(filtered[effectiveSelectedIndex].key)
        setOpen(false)
        setQuery('')
      }
    },
    [filtered, effectiveSelectedIndex, setActiveView]
  )

  const handleSelect = (item: SearchResult) => {
    setActiveView(item.key)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">جستجو...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border">
          ⌘K
        </kbd>
      </button>

      {/* Dialog */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100]"
              onClick={() => {
                setOpen(false)
                setQuery('')
              }}
            />

            {/* Search Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.15 }}
              className="fixed top-[15%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-lg"
              dir="rtl"
            >
              <div className="bg-card rounded-xl shadow-2xl border overflow-hidden">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b">
                  <Search className="size-5 text-foreground shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="جستجوی صفحات و عملکردها..."
                    className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
                  />
                  <button
                    onClick={() => {
                      setOpen(false)
                      setQuery('')
                    }}
                    className="shrink-0 p-1 rounded hover:bg-muted"
                  >
                    <X className="size-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Results */}
                <div className="max-h-72 overflow-y-auto p-2">
                  {filtered.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      نتیجه‌ای یافت نشد
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filtered.map((item, index) => (
                        <button
                          key={item.key}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            index === effectiveSelectedIndex
                              ? 'bg-muted text-foreground'
                              : 'text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          <item.icon
                            className={`size-4 ${
                              index === effectiveSelectedIndex ? 'text-foreground font-semibold' : ''
                            }`}
                          />
                          <span className="flex-1 text-right font-medium">
                            {item.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.section}
                          </span>
                          {index === effectiveSelectedIndex && (
                            <ArrowLeft className="size-3 text-foreground" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span>↑↓ انتخاب</span>
                    <span>↵ ورود</span>
                    <span>Esc بستن</span>
                  </div>
                  <span>⌘K جستجوی سریع</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
