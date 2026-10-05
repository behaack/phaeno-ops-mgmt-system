import { Check, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '#/lib/utils'

type WorkflowProgressStep = {
  id: string
  label: string
  icon: LucideIcon
  complete: boolean
  current?: boolean
  status?: string
  metric?: string
  description?: ReactNode
  tone?: 'destructive'
}

export function WorkflowProgress({ label, steps, horizontalAt = 'lg' }: {
  label: string
  steps: WorkflowProgressStep[]
  horizontalAt?: 'md' | 'lg'
}) {
  const large = horizontalAt === 'lg'
  return <div className="space-y-4">
    <p className="text-xs text-muted-foreground">{steps.filter(step => step.complete).length} of {steps.length} steps complete</p>
    <ol aria-label={label} className={cn('flex flex-col', large ? 'lg:flex-row' : 'md:flex-row')}>
      {steps.map((step, index) => {
        const Icon = step.icon
        const status = step.complete ? 'Complete' : step.status ?? (step.current ? 'Next step' : 'Upcoming')
        return <li key={step.id} aria-current={step.current ? 'step' : undefined} className={cn('relative flex min-w-0 flex-1 items-start gap-3 pb-6 last:pb-0', large ? 'lg:flex-col lg:items-center lg:gap-2 lg:pb-0 lg:text-center' : 'md:flex-col md:items-center md:gap-2 md:pb-0 md:text-center')}>
          {index < steps.length - 1 ? <span aria-hidden="true" className={cn('absolute bottom-0 left-5 top-10 w-px', large ? 'lg:bottom-auto lg:left-[calc(50%+1.25rem)] lg:top-5 lg:h-px lg:w-[calc(100%-2.5rem)]' : 'md:bottom-auto md:left-[calc(50%+1.25rem)] md:top-5 md:h-px md:w-[calc(100%-2.5rem)]', step.complete && steps[index + 1].complete ? 'bg-accent-foreground/40' : 'bg-border')} /> : null}
          <span aria-hidden="true" className={cn('relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2', step.complete ? 'border-accent-foreground/30 bg-accent text-accent-foreground' : step.current ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/10' : 'border-border bg-muted text-muted-foreground')}>
            <Icon className="size-4" />
            {step.complete ? <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-accent-foreground text-accent ring-2 ring-card"><Check className="size-3" strokeWidth={3} /></span> : null}
          </span>
          <div className={cn('min-w-0 self-center', large ? 'lg:self-auto lg:px-2' : 'md:self-auto md:px-2')}>
            <p className={cn('text-sm font-medium', step.current && 'text-primary', step.tone === 'destructive' && 'text-destructive')}>{step.label}</p>
            {step.metric ? <p className="mt-1 text-xs font-semibold tabular-nums">{step.metric}</p> : null}
            <p className={cn('mt-0.5 text-xs', step.current ? 'font-medium text-primary' : 'text-muted-foreground')}>{status}</p>
            {step.description ? <p className="mt-1 text-xs text-muted-foreground">{step.description}</p> : null}
          </div>
        </li>
      })}
    </ol>
  </div>
}
