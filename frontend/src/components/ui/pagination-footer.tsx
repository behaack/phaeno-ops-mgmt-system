import type { ReactNode } from 'react'
import { Button } from './button'
import { CustomerText, CustomerSourceText } from '#/features/customer-i18n/customer-text'

export function PaginationFooter({ label, summary, busy, hasPrevious, hasNext, onPrevious, onNext, onFirst }: {
  label: string; summary: ReactNode; busy: boolean; hasPrevious: boolean; hasNext: boolean
  onPrevious: () => void; onNext: () => void; onFirst?: () => void
}) {
  return <nav aria-label={label} data-slot="pagination-footer" className="flex flex-wrap items-center justify-between gap-3 py-3">
    <p className="text-sm text-muted-foreground">{summary}</p>
    <div className="flex gap-2">
      {onFirst ? <Button type="button" variant="outline" disabled={busy} onClick={onFirst}><CustomerText message="m_0bdbb750609c" /></Button> : null}
      <Button type="button" variant="outline" disabled={busy || !hasPrevious} onClick={onPrevious}><CustomerText message="m_a57b08a480b8" /></Button>
      <Button type="button" variant="outline" disabled={busy || !hasNext} onClick={onNext}><CustomerText message="m_1ff57a29d7c9" /></Button>
    </div>
  </nav>
}

/** No total is inferred for feeds whose contract supplies only a bounded page. */
export function CountFreePagination({ page, hasNext, busy, onPage, label }: { page: number; hasNext: boolean; busy: boolean; onPage: (page: number) => void; label: string }) {
  return <PaginationFooter label={label} summary={<><CustomerSourceText source="Page" /> {page}</>} busy={busy} hasPrevious={page > 1} hasNext={hasNext} onPrevious={()=>onPage(page-1)} onNext={()=>onPage(page+1)} />
}
