import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils'

/** Native events and refs preserve registered forms and ordinary checked handlers. */
export function NativeCheckbox({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  return <input {...props} type="checkbox" data-slot="native-checkbox" className={cn('size-4 shrink-0 cursor-pointer rounded border-input accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-destructive/40', className)} />
}
