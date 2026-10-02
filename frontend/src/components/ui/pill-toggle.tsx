import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { cn } from '#/lib/utils'

type PillToggleOption = { value: string; label: string; disabled?: boolean }

/** Compact, mutually exclusive view selection with arrow-key navigation. */
export function PillToggle({ value, onValueChange, options, label, className }: {
  value: string
  onValueChange: (value: string) => void
  options: readonly PillToggleOption[]
  label: string
  className?: string
}) {
  return <RadioGroupPrimitive.Root value={value} onValueChange={onValueChange} orientation="horizontal" aria-label={label}
    className={cn('inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full border border-primary/20 bg-primary/10 p-1', className)}>
    {options.map(option => <RadioGroupPrimitive.Item key={option.value} value={option.value} disabled={option.disabled}
      className="cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-xs motion-reduce:transition-none">
      {option.label}
    </RadioGroupPrimitive.Item>)}
  </RadioGroupPrimitive.Root>
}
