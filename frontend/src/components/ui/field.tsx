import * as React from 'react'

import { cn } from '#/lib/utils'

function FieldDescription({
  className,
  ...props
}: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn('mt-1 text-xs text-muted-foreground', className)}
      {...props}
    />
  )
}

function FieldError({
  children,
  className,
  ...props
}: React.ComponentProps<'p'>) {
  if (!children) return null

  return (
    <p
      data-slot="field-error"
      className={cn('mt-1 text-xs text-destructive', className)}
      role="alert"
      {...props}
    >
      {children}
    </p>
  )
}

export { FieldDescription, FieldError }
