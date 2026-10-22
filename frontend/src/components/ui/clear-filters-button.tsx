import type { ComponentProps, ReactNode } from 'react'
import { Button } from './button'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'

export function ClearFiltersButton({ label, ...props }: Omit<ComponentProps<typeof Button>, 'variant' | 'size' | 'children' | 'className' | 'style'> & { label?: ReactNode }) {
  return <Button type="button" variant="ghost" {...props}>{label ?? <CustomerSourceText source="Clear all" />}</Button>
}
