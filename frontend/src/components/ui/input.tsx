import * as React from "react"

import { cn } from "#/lib/utils"
import { singleLineControlClassName } from "./form-control"

function Input({ className, type, controlSize = 'default', ...props }: React.ComponentProps<"input"> & { controlSize?: 'default' | 'touch' }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        singleLineControlClassName,
        controlSize === 'touch' && 'h-11',
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
