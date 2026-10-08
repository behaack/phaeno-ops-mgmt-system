import type { ComponentProps } from "react"
import { cn } from "#/lib/utils"
import { singleLineControlClassName } from "./form-control"

export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return <select data-slot="native-select" className={cn(singleLineControlClassName, "cursor-pointer bg-background", className)} {...props} />
}
