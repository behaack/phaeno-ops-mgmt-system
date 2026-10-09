import type { ComponentProps } from 'react'
import { cn } from '#/lib/utils'

export function ProgressBar({ value, className, ...props }: Omit<ComponentProps<'progress'>, 'value' | 'max'> & { value?: number | null }) {
  const percentage = typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : undefined
  return <progress {...props} max={100} value={percentage} className={cn(
    'block h-2 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-moz-progress-bar]:bg-primary',
    percentage === undefined && 'motion-safe:animate-pulse', className,
  )} />
}
