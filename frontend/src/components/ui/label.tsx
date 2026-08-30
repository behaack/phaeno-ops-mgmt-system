import * as React from "react"
import { Label as LabelPrimitive } from "radix-ui"

import { RequiredFieldName, RequiredMark } from "#/components/ui/required-indicator"
import { cn } from "#/lib/utils"

function Label({
  children,
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {normalizeRequiredMarker(children)}
    </LabelPrimitive.Root>
  )
}

function normalizeRequiredMarker(children: React.ReactNode): React.ReactNode {
  return React.Children.toArray(children).flatMap((child, index) => {
    if (typeof child === "string") {
      const match = child.match(/^(.*?)(?:\s*)\*$/)
      if (!match) return child

      const label = match[1].trimEnd()
      return label
        ? <RequiredFieldName key={`required-${index}`}>{label}</RequiredFieldName>
        : <RequiredMark key={`required-${index}`} />
    }

    if (
      React.isValidElement<{ children?: React.ReactNode }>(child)
      && child.type === "span"
      && React.Children.toArray(child.props.children).join("").trim() === "*"
    ) {
      return <RequiredMark key={child.key ?? `required-${index}`} />
    }

    return child
  })
}

export { Label }
