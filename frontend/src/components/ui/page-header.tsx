import type { ComponentProps, ReactNode } from 'react'
import { cn } from '#/lib/utils'

/** Keep IDs, refs and focus targets on the real page heading. */
export function PageTitle({ className, children, ...props }: ComponentProps<'h1'>) {
  return <h1 {...props} data-slot="page-title" className={cn('min-w-0 max-w-full wrap-anywhere text-2xl font-semibold leading-tight text-foreground', className)}>{children}</h1>
}

export function PageHeader({ title, titleId, description, eyebrow, status, actions, children, className, ...props }: Omit<ComponentProps<'header'>, 'title'> & {
  title: ReactNode; titleId?: string; description?: ReactNode; eyebrow?: ReactNode; status?: ReactNode; actions?: ReactNode
}) {
  return <header {...props} data-slot="page-header" className={cn('flex min-w-0 flex-wrap items-start justify-between gap-4', className)}>
    <div className="min-w-0 flex-1 basis-64 space-y-2">
      {eyebrow ? <div className="text-sm text-muted-foreground">{eyebrow}</div> : null}
      <div className="flex min-w-0 flex-wrap items-center gap-2"><PageTitle id={titleId}>{title}</PageTitle>{status}</div>
      {description ? <p className="max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      {children}
    </div>
    {actions ? <div className="flex max-w-full shrink-0 items-center gap-2" data-slot="page-actions">{actions}</div> : null}
  </header>
}
