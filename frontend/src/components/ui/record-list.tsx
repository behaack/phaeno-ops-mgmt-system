import type { ComponentProps, ReactNode } from 'react'
import { cn } from '#/lib/utils'

export function RecordList({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} data-slot="record-list" className={cn('min-w-0 divide-y', className)} />
}

export function RecordListItem({ title, metadata, status, actions, children, ...props }: Omit<ComponentProps<'article'>, 'title' | 'className' | 'style'> & {
  title: ReactNode; metadata?: ReactNode; status?: ReactNode; actions?: ReactNode
}) {
  return <article {...props} data-slot="record-list-item" className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-4">
    <div className="min-w-0 flex-1 basis-48 space-y-1">
      <div className="flex min-w-0 flex-wrap items-center gap-2" data-slot="record-title">{title}</div>
      {metadata ? <div className="text-xs text-muted-foreground" data-slot="record-metadata">{metadata}</div> : null}
      {children}
    </div>
    {status || actions ? <div className="flex max-w-full flex-wrap items-start gap-3" data-slot="record-trailing">{status}{actions}</div> : null}
  </article>
}

export function ListToolbar({ children, actions, className, ...props }: ComponentProps<'div'> & { actions?: ReactNode }) {
  return <div {...props} data-slot="list-toolbar" className={cn('flex min-w-0 flex-wrap items-end gap-4 [&>[data-slot=field]]:min-w-0 [&>[data-slot=field]]:flex-1 [&>[data-slot=field]]:basis-48', className)}>
    {children}{actions ? <div className="flex max-w-full flex-wrap items-center gap-2" data-slot="list-toolbar-actions">{actions}</div> : null}
  </div>
}

/** Tables own their captions/columns; this shared region contains narrow overflow. */
export function RecordTable({ label, children, className, ...props }: ComponentProps<'section'> & { label: string }) {
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- A named scroll region needs keyboard focus for horizontal table scrolling.
  return <section {...props} data-slot="record-table" aria-label={label} tabIndex={0} className={cn('min-w-0 overflow-x-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-ring [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_thead]:bg-muted [&_th]:px-4 [&_th]:py-3 [&_th]:font-medium [&_td]:px-4 [&_td]:py-3 [&_tbody_tr]:border-t', className)}>{children}</section>
}
