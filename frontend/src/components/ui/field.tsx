import * as React from 'react'

import { cn } from '#/lib/utils'
import { useCustomerSourceText } from '#/features/customer-i18n/customer-text'

function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field" className={cn('grid content-start gap-2 [&>[data-slot=label]]:leading-5 [&>[data-slot=field-error]]:-mt-1 [&>[data-slot=field-description]]:-mt-1', className)} {...props} />
}

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
  reserveSpace = false,
  ...props
}: React.ComponentProps<'p'> & { reserveSpace?: boolean }) {
  const translate = useCustomerSourceText()
  if (!children) return reserveSpace ? <span aria-hidden="true" data-slot="field-error" className="mt-1 block min-h-4" /> : null

  return (
    <p
      data-slot="field-error"
      className={cn('mt-1 text-xs text-destructive', reserveSpace && 'min-h-4', className)}
      role="alert"
      {...props}
    >
      {typeof children === 'string' ? translate(children) : children}
    </p>
  )
}

export { Field, FieldDescription, FieldError }
