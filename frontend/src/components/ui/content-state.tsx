import type { ComponentProps, ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from './alert'
import { Button } from './button'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { cn } from '#/lib/utils'

export function LoadingState({ label, refreshing = false, className, ...props }: Omit<ComponentProps<'div'>, 'children'> & { label: ReactNode; refreshing?: boolean }) {
  return <div {...props} data-slot="loading-state" role="status" aria-live="polite" className={cn('min-w-0 space-y-3 py-3', className)}>
    <p className="text-sm text-muted-foreground">{label}</p>
    {!refreshing ? <div aria-hidden="true" className="space-y-2 motion-safe:animate-pulse"><div className="h-4 w-2/3 rounded bg-muted" /><div className="h-4 w-1/2 rounded bg-muted" /></div> : null}
  </div>
}

export function EmptyState({ title, children, action, kind = 'empty', className, ...props }: Omit<ComponentProps<'div'>, 'title'> & { title: ReactNode; children?: ReactNode; action?: ReactNode; kind?: 'empty' | 'no-results' | 'setup' | 'permission' }) {
  return <div {...props} data-slot="empty-state" data-kind={kind} className={cn('min-w-0 space-y-2 py-4', className)}>
    <p className="text-sm font-medium">{title}</p>
    {children ? <div className="max-w-3xl text-sm text-muted-foreground">{children}</div> : null}
    {action ? <div className="pt-1">{action}</div> : null}
  </div>
}

export function ErrorState({ title, children, onRetry, retryLabel, action, busy = false }: { title: ReactNode; children: ReactNode; onRetry?: () => void; retryLabel?: ReactNode; action?: ReactNode; busy?: boolean }) {
  return <Alert variant="destructive" data-slot="error-state"><AlertTitle>{title}</AlertTitle><AlertDescription>
    <div>{children}</div>{action ?? (onRetry ? <Button type="button" variant="outline" disabled={busy} onClick={onRetry}>{retryLabel ?? <CustomerSourceText source="Try again" />}</Button> : null)}
  </AlertDescription></Alert>
}
