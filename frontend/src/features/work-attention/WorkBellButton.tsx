import type { ComponentProps } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '#/components/ui/button'

type WorkBellButtonProps = Pick<ComponentProps<'button'>, 'id' | 'onClick' | 'aria-haspopup' | 'aria-expanded'> & {
  count: number | undefined
  label: string
}

/** Shared presentation for the live bell and its isolated gallery examples. */
export function WorkBellButton({ count, label, ...props }: WorkBellButtonProps) {
  return <Button size="icon" variant="ghost" className="size-11 shrink-0" aria-label={label} {...props}>
    <span aria-hidden="true" data-slot="work-bell-icon" className="relative inline-flex size-5 items-center justify-center">
      <Bell className="size-5" />
      {count ? <span data-slot="notification-count" className="absolute -top-2.5 -right-2.5 rounded-full bg-primary px-1 text-xs text-primary-foreground tabular-nums">{count > 99 ? '99+' : count}</span>
        : count === undefined ? <span data-slot="notification-count" className="absolute -top-2.5 -right-2.5 px-1 text-xs">?</span> : null}
    </span>
  </Button>
}
