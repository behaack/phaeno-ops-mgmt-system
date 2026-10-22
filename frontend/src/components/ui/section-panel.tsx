import { createElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import { CardAction, CardDescription, CardHeader, CardTitle } from './card'
import { cn } from '#/lib/utils'

/** A titled section retains its native heading and region identity. */
export function SectionPanel({ as = 'section', heading, description, actions, children, className, bodyClassName, highlighted = false, ...props }: Omit<ComponentProps<'section'>, 'title'> & {
  as?: 'section' | 'div'
  heading: ReactElement
  description?: ReactNode
  actions?: ReactNode
  bodyClassName?: string
  highlighted?: boolean
}) {
  return createElement(as, {
    ...props,
    'data-slot': 'section-panel',
    'data-highlighted': highlighted || undefined,
    className: cn('min-w-0 overflow-hidden rounded-xl border bg-card text-card-foreground data-[highlighted=true]:border-primary', className),
  }, <CardHeader>
    <CardTitle>{heading}</CardTitle>
    {actions ? <CardAction>{actions}</CardAction> : null}
    {description ? <CardDescription>{description}</CardDescription> : null}
  </CardHeader>, <div data-slot="section-panel-body" className={cn('min-w-0 space-y-3 p-4', bodyClassName)}>{children}</div>)
}
