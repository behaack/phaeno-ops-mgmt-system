import type { ComponentProps } from 'react'
import { Slot } from 'radix-ui'

/** Primary record identifiers in lists and record summaries. */
export const recordLinkClassName = 'cursor-pointer rounded-sm wrap-anywhere text-sm font-medium text-primary no-underline underline-offset-4 hover:underline focus-visible:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring'

/** Compose a typed router Link without changing its destination or handlers. */
export function RecordLink({ asChild = false, ...props }: Omit<ComponentProps<'a'>, 'className' | 'style'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'
  return <Comp {...props} data-slot="record-link" className={recordLinkClassName} />
}
