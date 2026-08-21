import type { ComponentProps } from 'react'

import { DialogFooter } from '#/components/ui/dialog'
import {
  RequiredFieldName,
  RequiredLegend,
  RequiredMark,
} from '#/components/ui/required-indicator'
import { cn } from '#/lib/utils'

function RequiredDialogFooter({
  children,
  className,
  showLegend = true,
  ...props
}: ComponentProps<typeof DialogFooter> & { showLegend?: boolean }) {
  if (!showLegend) {
    return (
      <DialogFooter className={className} {...props}>
        {children}
      </DialogFooter>
    )
  }

  return (
    <DialogFooter
      className={cn(
        'flex-col items-stretch sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    >
      <RequiredLegend />
      <div className="flex flex-col-reverse gap-2 sm:flex-row">{children}</div>
    </DialogFooter>
  )
}

export {
  RequiredDialogFooter,
  RequiredFieldName,
  RequiredLegend,
  RequiredMark,
}
