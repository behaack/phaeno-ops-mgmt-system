import type { ComponentProps, ReactNode } from 'react'
import { cn } from '#/lib/utils'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'

export function DetailSummary({ className, ...props }: ComponentProps<'dl'>) {
  return <dl data-slot="detail-summary" className={cn('grid min-w-0 gap-4 sm:grid-cols-2', className)} {...props} />
}

export function DetailField({ label, value, missing, boxed = false, mono = false }: { label: ReactNode; value: ReactNode; missing?: ReactNode; boxed?: boolean; mono?: boolean }) {
  const empty = value == null || value === ''
  return <div data-slot="detail-field" className={cn('min-w-0', boxed && 'rounded-lg border p-4')}>
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className={cn('mt-1 whitespace-pre-wrap text-sm [overflow-wrap:anywhere]', mono && 'font-mono')}>
      {empty ? <span className="text-muted-foreground">{missing ?? <CustomerSourceText source="Not recorded" />}</span> : typeof value === 'boolean' ? value ? <CustomerSourceText source="Yes" /> : <CustomerSourceText source="No" /> : value}
    </dd>
  </div>
}

export function DetailHeading({ className, children, ...props }: ComponentProps<'h2'>) {
  return <h2 data-slot="detail-heading" className={cn('text-base leading-snug font-medium', className)} {...props}>{children}</h2>
}
