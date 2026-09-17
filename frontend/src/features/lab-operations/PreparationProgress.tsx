import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { CircleCheck, FlaskConical, Grid2X2, ListChecks, Truck } from 'lucide-react'
import { Popover } from 'radix-ui'
import type { PreparationDetail } from '#/api/lab-preparation'
import { preparationProgress } from './preparation-progress'

const steps = [
  { label: 'Prepare tray', icon: Grid2X2, purpose: 'Scan and save the physical tray barcode, load tubes into their positions, then review the contents. Partial trays are allowed.', completion: 'Choose Confirm tray when ready. This locks the assembled contents and completes this step.' },
  { label: 'Prepare libraries', icon: FlaskConical, purpose: 'Choose Start preparation when ready to begin work. This records the start time and prevents further tray edits. Follow the workflow stages, record evidence and resolve observations and QC. Record and verify the library outputs.', completion: 'Each workflow step counts once, when all continuing tubes have resolved it. Each protocol counts once when its stage is completed for those tubes. Counts include permitted skips. Failed tubes remain visible in the tray and history.' },
  { label: 'Complete batch', icon: ListChecks, purpose: 'Review the recorded tube outcomes before closing the preparation batch.', completion: 'Choose Complete preparation batch once all tubes have resolved outcomes and successful tubes have library records.' },
  { label: 'Sequencing handoff', icon: Truck, purpose: 'Assign passing libraries from the completed preparation batch to sequencing batches.', completion: 'This step is complete when every passing library has a sequencing assignment. Scientific review and result release remain separate.' },
]

export function PreparationProgress({ batch, title, description, action, nextRef }: { batch: PreparationDetail; title: string; description: string; action?: ReactNode; nextRef?: Ref<HTMLDivElement> }) {
  const { phase, handoffDone, handoffVisible, libraries, completedSteps, totalSteps, completedProtocols, totalProtocols } = preparationProgress(batch)
  const [informationStep, setInformationStep] = useState<number | null>(null)
  const resolved = batch.members.filter(member => member.state === 'Failed' || member.state === 'Succeeded' && Boolean(member.library)).length
  const traySummary = `${batch.members.length} ${batch.members.length === 1 ? 'tube' : 'tubes'} loaded · ${batch.trayConfirmed || batch.status === 'InProgress' || batch.status === 'Complete' ? 'Tray confirmed' : !batch.trayBarcode ? 'Awaiting tray scan' : batch.members.length ? 'Awaiting confirmation' : 'Ready to load tubes'}`
  const details = [
    traySummary,

    <div className="space-y-1"><p>{completedSteps} of {totalSteps} steps completed.</p><p>{completedProtocols} of {totalProtocols} protocols completed.</p>{batch.status === 'Draft' ? <p>{batch.trayConfirmed ? 'Tray confirmed · Ready to start preparation.' : 'Confirm the assembled tray before starting.'}</p> : null}</div>,
    batch.status === 'Complete' ? 'The preparation batch is closed.' : `${resolved} of ${batch.members.length} tube outcomes recorded.`,
    handoffVisible ? `${libraries.filter(member => member.library?.sequencing).length} of ${libraries.length} passing libraries assigned.` : batch.status === 'Complete' ? 'No passing libraries to send to sequencing.' : 'Available after preparation is complete and passing libraries are ready.',
  ]
  return <section aria-label="Preparation progress" className="space-y-4">
    <ol aria-label="Preparation steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {steps.map((step, index) => {
        const current = index === phase
        const done = batch.status !== 'Cancelled' && (phase > index || batch.status === 'Complete' && (index < 3 || handoffDone))
        const skipped = index === 3 && batch.status === 'Complete' && !handoffVisible
        const state = batch.status === 'Cancelled' ? 'Cancelled' : skipped ? 'Not applicable: no passing libraries' : done ? 'Complete' : current ? 'Current step' : 'Upcoming'
        return <li key={step.label} aria-current={current ? 'step' : undefined}>
          <StepInformation step={step} index={index} current={current} done={done} state={state} detail={batch.status === 'Cancelled' ? 'This batch was cancelled. Saved records remain available for reference.' : details[index]}
            open={informationStep === index} onOpenChange={open => setInformationStep(previous => open ? index : previous === index ? null : previous)} />
        </li>
      })}
    </ol>
    <div ref={nextRef} tabIndex={-1} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <div className="min-w-0 flex-1 space-y-1" aria-live="polite" aria-atomic="true"><p className="text-xs font-medium text-muted-foreground">{phase >= 0 ? 'Next step' : 'Batch status'}</p><p className="font-medium">{title}</p><p className="text-sm text-muted-foreground">{description}</p></div>
      {action}
    </div>
  </section>
}

function StepInformation({ step, index, current, done, state, detail, open, onOpenChange: setOpen }: {
  step: typeof steps[number]; index: number; current: boolean; done: boolean; state: string; detail: ReactNode; open: boolean; onOpenChange: (open: boolean) => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentId = useId()
  const titleId = useId()
  const descriptionId = useId()
  const Icon = step.icon
  const cancelClose = () => { if (closeTimer.current !== null) { clearTimeout(closeTimer.current); closeTimer.current = null } }
  const show = () => { cancelClose(); setOpen(true) }
  const leave = () => {
    cancelClose()
    closeTimer.current = setTimeout(() => {
      if (document.activeElement !== triggerRef.current && !contentRef.current?.contains(document.activeElement)) setOpen(false)
    }, 180)
  }
  useEffect(() => () => { if (closeTimer.current !== null) clearTimeout(closeTimer.current) }, [])

  return <Popover.Root open={open} onOpenChange={setOpen}>
    <Popover.Anchor asChild>
      <button ref={triggerRef} type="button" aria-label={`Information about step ${index + 1}: ${step.label}. ${state}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? contentId : undefined} aria-describedby={open ? descriptionId : undefined}
        className={`flex h-full w-full cursor-help flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${current ? 'border-primary bg-accent/60' : 'border-transparent'}`}
        onPointerEnter={event => { if (event.pointerType !== 'touch') show() }} onPointerLeave={event => { if (event.pointerType !== 'touch') leave() }} onFocus={show} onBlur={event => { if (!contentRef.current?.contains(event.relatedTarget)) setOpen(false) }} onClick={show}>
        <span aria-hidden="true" className={`relative flex size-9 items-center justify-center rounded-full border ${done ? 'text-[var(--status-ready)]' : current ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><Icon className="size-4" />{done ? <CircleCheck className="absolute -bottom-0.5 -right-1 size-4 rounded-full bg-background" /> : null}</span>
        <span className={`text-sm font-medium ${!done && !current ? 'text-muted-foreground' : ''}`}>{step.label}</span>
      </button>
    </Popover.Anchor>
    <Popover.Portal>
      <Popover.Content ref={contentRef} id={contentId} aria-labelledby={titleId} aria-describedby={descriptionId} side="bottom" sideOffset={8} collisionPadding={16}
        className="z-50 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border bg-popover p-4 text-sm text-popover-foreground shadow-md"
        onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()} onPointerEnter={cancelClose} onPointerLeave={leave}>
        <div className="space-y-1"><p id={titleId} className="font-semibold">{step.label}</p><p className="text-xs text-muted-foreground">{state}</p></div>
        <div id={descriptionId} className="space-y-3"><p>{step.purpose}</p><p>{step.completion}</p><div className="border-t pt-3 text-muted-foreground">{detail}</div></div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
}
