import { ArrowRight, Boxes, CircleCheck, ClipboardCheck, ListChecks, Package, ScanBarcode, TriangleAlert, Truck } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { Button } from '#/components/ui/button'
import { cn } from '#/lib/utils'
import { buildLabJobProgress, labJobProgressStateLabels, type LabJobProgressInput, type LabJobProgressStep, type LabJobProgressStepId } from './lab-job-progress'
import { currentLabQuote, useQuoteStatus } from './use-quote-status'

export type LabJobOrderProgressProps = Omit<LabJobProgressInput, 'now'> & {
  /** Select existing work in the Job workspace; this callback must not perform a workflow command. */
  onStepSelect?: (stepId: string) => void
  /** The selected shipment owns the direct Send command and its dialogs. */
  sendActionTargetRef?: Ref<HTMLDivElement>
}

const stepAppearance = {
  'confirm-order': { icon: ClipboardCheck, label: 'Confirm order', purpose: 'Review the scope and price, then place the configured standard order or accept the current quote.' },
  samples: { icon: ListChecks, label: 'Samples', purpose: 'Enter the sample IDs, biological sources and tube quantities. Review and finalize the exact sample list before preparing containers.' },
  kits: { icon: Package, label: 'Container supply', purpose: 'Have compatible kits physically received and registered for use. Use available permitted stock or arrange any missing supplies.' },
  containers: { icon: Boxes, label: 'Assign containers', purpose: 'Review the physical container identities, compatible sizes and tube allocations, then confirm which containers will hold the samples.' },
  tubes: { icon: ScanBarcode, label: 'Match tubes', purpose: 'Scan each permanent tube barcode to save which physical tube belongs to each sample. Matching tubes is separate from the laboratory recording their receipt.' },
  send: { icon: Truck, label: 'Send', purpose: 'Review and confirm the current shipping insert, print it and pack it with the matching container. Hand the package to the carrier, then record the carrier, tracking number and shipment time.' },
} satisfies Record<LabJobProgressStepId, { icon: typeof ClipboardCheck; label: string; purpose: string }>

export function LabJobOrderProgress({ onStepSelect, sendActionTargetRef, ...input }: LabJobOrderProgressProps) {
  const headingId = useId()
  const stepsRef = useRef<HTMLOListElement>(null)
  const [informationStepId, setInformationStepId] = useState<LabJobProgressStepId | null>(null)
  // Keep the displayed responsibility current when an open quote expires, including after tab resume.
  useQuoteStatus(currentLabQuote(input.order.quotes))
  const progress = buildLabJobProgress({ ...input, now: Date.now() })
  const { nextStep, allSent, exception, shipmentCount } = progress
  const currentStepId = nextStep?.id
  const currentStepIndex = progress.steps.findIndex(step => step.id === currentStepId)
  const reviewLabel = currentStepId === 'confirm-order' ? 'Review order' : currentStepId === 'samples' ? 'Review samples' : 'Show shipping work'
  useEffect(() => {
    const strip = stepsRef.current
    const current = strip?.querySelector<HTMLElement>('[aria-current="step"]')
    if (!strip || !current) return
    const left = current.offsetLeft
    const right = left + current.offsetWidth
    if (left < strip.scrollLeft) strip.scrollLeft = left
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth
  }, [currentStepId])

  return <section aria-labelledby={headingId} className="space-y-4">
    <div className="space-y-1">
      <h2 id={headingId} className="text-lg font-semibold">Ordering and shipping</h2>
      <p className="text-sm text-muted-foreground">Complete these steps to prepare and send your samples.</p>
    </div>
    <ol ref={stepsRef} aria-label="Ordering and shipping steps" className="relative grid grid-cols-[repeat(6,minmax(6.5rem,1fr))] gap-2 overflow-x-auto px-1 py-1">
      {progress.steps.map((step, index) => {
        const current = currentStepId === step.id
        return <li key={step.id} aria-current={current ? 'step' : undefined} className="min-w-0">
          <StepInformation step={step} current={current} future={currentStepIndex >= 0 && index > currentStepIndex} index={index} open={informationStepId === step.id} onOpenChange={open => setInformationStepId(previous => open ? step.id : previous === step.id ? null : previous)} />
        </li>
      })}
    </ol>
    <div className="rounded-lg border bg-muted/40 px-4 py-3" aria-live="polite" aria-atomic="true">
      {exception ? <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 space-y-1"><p className="font-medium">{exception.label}</p><p className="text-sm">{exception.detail}</p><p className="text-xs text-muted-foreground">With: {exception.owner}</p></div>
      </div> : allSent ? <div className="flex items-start gap-3">
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-[var(--status-ready)]" aria-hidden="true" />
        <div className="space-y-1"><p className="font-medium">{shipmentCount === 1 ? 'Your shipment is recorded — track progress below' : 'All shipments recorded — track progress below'}</p><p className="text-sm text-muted-foreground">Receipt, laboratory work and any later requests appear in After you send.</p></div>
      </div> : nextStep ? <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Your next step</p>
          <p className="font-medium">{nextStep.label}</p>
          <p className="text-sm">{nextStep.detail}</p>
          <p className="text-xs text-muted-foreground">With: {nextStep.owner}</p>
        </div>
        {nextStep.id === 'send' && sendActionTargetRef ? <div ref={sendActionTargetRef} className="max-w-full self-start" /> : onStepSelect ? <Button type="button" variant="outline" size="sm" onClick={() => onStepSelect(nextStep.id)} aria-label={`${reviewLabel}: ${nextStep.label}`}>{reviewLabel}<ArrowRight aria-hidden="true" /></Button> : null}
      </div> : <p className="text-sm">Review the recorded preparation below.</p>}
    </div>
  </section>
}

function StepInformation({ step, current, future, index, open, onOpenChange: setOpen }: { step: LabJobProgressStep; current: boolean; future: boolean; index: number; open: boolean; onOpenChange: (open: boolean) => void }) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentId = useId()
  const titleId = useId()
  const descriptionId = useId()
  const appearance = stepAppearance[step.id]
  const Icon = appearance.icon
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
      <button ref={triggerRef} type="button" aria-label={`Information about step ${index + 1}: ${step.label}. ${labJobProgressStateLabels[step.state]}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? contentId : undefined} aria-describedby={open ? descriptionId : undefined}
        className={cn('flex h-full w-full cursor-help flex-col items-center gap-2 rounded-lg border px-2 py-3 text-center hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none', current ? 'border-primary bg-accent/60' : 'border-transparent', future ? 'text-muted-foreground' : 'text-foreground')}
        onPointerEnter={event => { if (event.pointerType !== 'touch') show() }} onPointerLeave={event => { if (event.pointerType !== 'touch') leave() }} onFocus={show} onBlur={event => { if (!contentRef.current?.contains(event.relatedTarget)) setOpen(false) }} onClick={show}>
        <span aria-hidden="true" className={cn('relative flex size-9 shrink-0 items-center justify-center rounded-full border', future ? 'border-border text-muted-foreground' : step.state === 'complete' ? 'border-border text-[var(--status-ready)]' : current ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground')}>
          <Icon className="size-4" />
          {step.state === 'complete' ? <CircleCheck className="absolute -right-1 -bottom-0.5 size-4 rounded-full bg-background" /> : null}
        </span>
        <span className="text-sm font-medium">{appearance.label}</span>
      </button>
    </Popover.Anchor>
    <Popover.Portal>
      <Popover.Content ref={contentRef} id={contentId} aria-labelledby={titleId} aria-describedby={descriptionId} side="bottom" sideOffset={8} collisionPadding={16}
        className="z-50 w-80 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border bg-popover p-4 text-sm text-popover-foreground shadow-md"
        onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()} onPointerEnter={cancelClose} onPointerLeave={leave}>
        <div className="space-y-1"><p id={titleId} className="font-semibold">{step.label}</p><p className="text-xs text-muted-foreground">{labJobProgressStateLabels[step.state]}</p></div>
        <div id={descriptionId} className="space-y-3"><p>{appearance.purpose}</p><p>{step.detail}</p>{step.state !== 'complete' ? <p className="text-xs text-muted-foreground">With: {step.owner}</p> : null}</div>
      </Popover.Content>
    </Popover.Portal>
  </Popover.Root>
}
