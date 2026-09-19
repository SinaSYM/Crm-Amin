'use client'

import { ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationFooterProps {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
}

export default function PaginationFooter({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationFooterProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t">
      <p className="text-sm text-muted-foreground">
        نمایش {(currentPage - 1) * itemsPerPage + 1} تا{' '}
        {Math.min(currentPage * itemsPerPage, totalItems)} از {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <ChevronRight className="size-4" />
        </Button>
        <span className="text-sm font-medium">
          {currentPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>
    </div>
  )
}
