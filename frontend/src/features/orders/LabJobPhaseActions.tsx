import type { LabPhase } from '#/api/lab-phases'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

type PhaseAction = { label: string; variant?: 'default' | 'destructive'; run: () => void }

export function labJobPhaseActions(phase: LabPhase, canCancel: boolean, onResults: (phaseId: string) => void, onCancel: (phase: LabPhase) => void): PhaseAction[] {
  return [
    ...(phase.deliveredSamples > 0 ? [{ label: 'View results', variant: 'default' as const, run: () => onResults(phase.id) }] : []),
    ...(canCancel && phase.cancellationEligible && !phase.cancellationPending ? [{ label: 'Request cancellation', variant: 'destructive' as const, run: () => onCancel(phase) }] : []),
  ]
}

export function LabJobPhaseActions({ actions, disabled, compact = true, id }: { actions: PhaseAction[]; disabled?: boolean; compact?: boolean; id?: string }) {
  return <ActionMenu keepSingleActionInMenu={actions.some(action => action.variant === 'destructive')}>
    <DropdownMenuTrigger id={id} asChild><Button id={id} variant="outline" size={compact ? 'sm' : 'default'} disabled={disabled} className="shrink-0">Actions</Button></DropdownMenuTrigger>
    <DropdownMenuContent {...(id ? { 'aria-labelledby': id } : {})} align="end" className="w-max min-w-44 max-w-[calc(100vw-2rem)]">
      {actions.map(action => <DropdownMenuItem key={action.label} variant={action.variant} onSelect={action.run}>{action.label}</DropdownMenuItem>)}
    </DropdownMenuContent>
  </ActionMenu>
}
