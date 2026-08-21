import type { ComponentProps, ReactNode } from 'react'

import { cn } from '#/lib/utils'

function RequiredFieldName({
  children,
  className,
  ...props
}: ComponentProps<'span'> & { children: ReactNode }) {
  return (
    <span
      data-slot="required-field-name"
      className={cn('inline-flex items-center gap-0.5', className)}
      {...props}
    >
      <span>{children}</span>
      <RequiredMark />
    </span>
  )
}

function RequiredLegend({
  className,
  ...props
}: Omit<ComponentProps<'p'>, 'children'>) {
  return (
    <p
      data-slot="required-legend"
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    >
      <RequiredMark /> Required
    </p>
  )
}

function RequiredMark({
  className,
  ...props
}: Omit<ComponentProps<'span'>, 'children'>) {
  return (
    <span
      data-slot="required-mark"
      className={cn('text-[var(--ruby-red,#b4233c)]', className)}
      aria-hidden="true"
      {...props}
    >
      *
    </span>
  )
}

export { RequiredFieldName, RequiredLegend, RequiredMark }
