'use client'

import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: LucideIcon
  badgeIcon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon: Icon, badgeIcon: BadgeIcon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
      <div className="relative mb-6">
        <div className="flex items-center justify-center w-28 h-28 rounded-2xl bg-gradient-to-br from-neutral-500 to-neutral-800 dark:from-neutral-500 dark:to-neutral-800 border border-border dark:border-border">
          <Icon className="size-12 text-foreground dark:text-foreground" />
        </div>
        {BadgeIcon && (
          <div className="absolute -top-2 -left-2 flex items-center justify-center w-10 h-10 rounded-full bg-muted/60 dark:bg-muted/20 border border-border dark:border-border">
            <BadgeIcon className="size-5 text-foreground" />
          </div>
        )}
      </div>
      <p className="text-lg font-semibold text-foreground">{title}</p>
      {description && (
        <p className="text-sm mt-1.5 max-w-xs text-center leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
