import { ProcedureSource } from './ProcedureSource'
import { useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Badge } from '#/components/ui/badge'
import { NativeSelect } from '#/components/ui/native-select'
import { ProcedureIllustration } from './ProcedureIllustrations'
import type { InstructionIllustration, InstructionSource } from './procedure-types'
import { PreparationActions, PreparationField } from './preparation-ui'
import './procedure-print.css'

export type PresentedInstruction = { key: string; name: string; instructions: string; illustrations?: InstructionIllustration[] | null; copiedFrom?: InstructionSource | null; labStepVersionId?: string | null; sourceLabStepVersionId?: string | null; repeatable?: boolean; operatorConfirmation?: boolean; required?: boolean; condition?: string | null; requiredRole?: string | null; captures?: { key: string; label: string; type: string; required?: boolean; options?: string[] | null; scope?: string | null; unit?: string | null; plannedQuantityText?: string | null; material?: { name: string } | null }[]; inputMaterials?: string[]; preparedOutputs?: string[]; equipmentTypes?: string[]; qcGate?: { criteria: string; scope?: string | null } | null; handoffCriteria?: string | null; protocolLabel?: string; sourceLabel?: string; attachmentRequired?: boolean; attachmentKind?: string | null }
export type ProcedureDocument = { name: string; revision: string | number; status: string; approvedAtUtc?: string | null; instructions: PresentedInstruction[]; overviewInstructions?: PresentedInstruction[]; subtitle?: string; revisionUrl?: string }

function Content({ document: doc, view }: { document: ProcedureDocument; view: 'overview' | 'bench' }) {
  const approved = ['Approved', 'Active', 'Production'].includes(doc.status)
  return <article className="procedure-document space-y-5">
    <header className="space-y-2 border-b pb-4">
      {!approved ? <p className="procedure-draft font-bold text-destructive">{doc.status === 'Draft' ? 'DRAFT — NOT APPROVED FOR LABORATORY USE' : `${doc.status.toUpperCase()} — REFERENCE ONLY`}</p> : null}
      <h2 className="text-2xl font-semibold">{doc.name}</h2>
      <p className="text-sm">Revision {doc.revision} · {doc.status}{doc.approvedAtUtc ? ` · Approved ${new Date(doc.approvedAtUtc).toLocaleDateString()}` : ''}</p>
      {doc.subtitle ? <p className="text-sm text-muted-foreground">{doc.subtitle}</p> : null}
      <p className="text-xs text-muted-foreground">{view === 'overview' ? 'Process overview' : 'Bench instructions'} · Configuration reference; this document does not record performed laboratory work.</p>
      {doc.revisionUrl ? <p className="procedure-revision-link break-all text-xs"><a href={doc.revisionUrl}>Exact revision: {doc.revisionUrl}</a></p> : null}
    </header>
    <ol className={view === 'overview' ? 'procedure-flow space-y-0' : 'space-y-6'} aria-label={view === 'overview' ? 'Process sequence' : 'Bench instructions'}>
      {(view === 'overview' ? doc.overviewInstructions ?? doc.instructions : doc.instructions).map((step, index) => <li key={step.key} className={view === 'overview' ? 'relative ml-4 border-l-2 border-border pb-5 pl-6 last:border-transparent' : 'procedure-instruction space-y-3 border-b pb-5'}>
        {view === 'overview' ? <span aria-hidden="true" className="absolute -left-4 top-0 flex size-8 items-center justify-center rounded-full border bg-background text-sm font-medium">{index + 1}</span> : null}
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <h3 className="break-words font-semibold">{view === 'bench' ? `${index + 1}. ` : ''}{step.name || 'Untitled instruction'}</h3>
          <div className="flex flex-wrap gap-2 text-xs">{step.condition ? <Badge variant="outline">Conditional</Badge> : step.required === false ? <Badge variant="outline">Optional</Badge> : null}{step.qcGate ? <Badge variant="outline">QC gate</Badge> : null}{step.protocolLabel ? <span>{step.protocolLabel}</span> : null}{step.requiredRole ? <span>Role: {step.requiredRole}</span> : null}</div>
          {step.condition ? <p className="text-sm"><strong>Applies when:</strong> {step.condition}</p> : null}
          {view === 'bench' ? <>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{step.instructions}</p>
            {(step.illustrations ?? []).map(image => <ProcedureIllustration key={image.assetId} image={image} />)}
            {step.inputMaterials?.length ? <p className="text-sm"><strong>Materials:</strong> {step.inputMaterials.join(', ')}</p> : null}
            {step.equipmentTypes?.length ? <p className="text-sm"><strong>Equipment:</strong> {step.equipmentTypes.join(', ')}</p> : null}
            {step.preparedOutputs?.length ? <p className="text-sm"><strong>Outputs:</strong> {step.preparedOutputs.join(', ')}</p> : null}
            {step.captures?.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="mb-2 text-left font-medium">Entries required by this instruction</caption><thead><tr><th className="py-1 pr-3">Entry</th><th className="pr-3">Recorded for</th><th>Unit / planned amount</th></tr></thead><tbody>{step.captures.map(field => <tr key={field.key} className="border-t"><td className="py-2 pr-3">{field.material?.name ?? field.label}<span className="block text-xs">{({ number: 'Number', text: 'Text', date: 'Date', choice: 'Choice', fileReference: 'File reference', barcode: 'Barcode', material: 'Material used', biologicalMaterial: 'Biological material from specimen', equipment: 'Equipment used', output: 'Output created' } as Record<string, string>)[field.type] ?? 'Entry'} · {field.required ? 'Required' : 'Optional'}{field.options?.length ? ` · Choices: ${field.options.join(', ')}` : ''}</span></td><td className="pr-3">{field.scope === 'tube' ? 'Each sample' : field.scope === 'shared' ? 'Batch with sample exceptions' : field.scope === 'batch' ? 'Batch' : 'Each execution'}</td><td>{field.plannedQuantityText ? `${field.plannedQuantityText} ` : ''}{field.unit ?? '—'}</td></tr>)}</tbody></table></div> : null}
            {step.attachmentKind && step.attachmentKind !== 'none' ? <p className="text-sm">{step.attachmentRequired ? 'Required' : 'Optional'} {step.attachmentKind === 'qc' ? 'QC report' : 'preparation worksheet'}.</p> : null}
          </> : <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{step.instructions}</p>}
          {step.qcGate ? <p className="text-sm"><strong>QC{step.qcGate.scope ? ` (${step.qcGate.scope === 'tube' ? 'Each sample' : step.qcGate.scope === 'shared' ? 'Batch with sample exceptions' : 'Batch'})` : ''}:</strong> {step.qcGate.criteria}</p> : null}
          {step.handoffCriteria ? <p className="text-sm"><strong>Handoff:</strong> {step.handoffCriteria}</p> : null}
          {view === 'bench' && (step.repeatable || step.operatorConfirmation) ? <p className="text-sm">{[step.repeatable ? 'Repeats permitted' : null, step.operatorConfirmation ? 'Operator confirmation required' : null].filter(Boolean).join(' · ')}</p> : null}
          {step.copiedFrom ? <ProcedureSource source={step.copiedFrom} /> : step.labStepVersionId || step.sourceLabStepVersionId ? <p className="text-xs text-muted-foreground">Historical Lab-step source retained in this revision.</p> : null}
          {step.sourceLabel ? <p className="text-xs text-muted-foreground">{step.sourceLabel}</p> : null}
        </div>
      </li>)}
    </ol>
  </article>
}

export function ProcedurePresentation({ document: doc, revisionControl, onCapturePreview, actions = [] }: { document: ProcedureDocument; revisionControl?: ReactNode; onCapturePreview?: () => void; actions?: { label: string; onClick: () => void; disabled?: boolean }[] }) {
  const id = useId()
  const [view, setView] = useState<'overview' | 'bench'>('overview')
  const [paper, setPaper] = useState('Letter')
  const [printing, setPrinting] = useState<'overview' | 'bench' | null>(null)
  const [error, setError] = useState('')
  const printRef = useRef<HTMLDivElement>(null)
  const printHeader = JSON.stringify(`${doc.name} · Revision ${doc.revision} · ${doc.status}${['Approved', 'Active', 'Production'].includes(doc.status) ? '' : ' · NOT APPROVED'}`).replaceAll('<', '\\3c ')
  async function print(mode: 'overview' | 'bench') {
    setError(''); setPrinting(mode)
    try {
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame)
      if (printRef.current?.querySelector('[data-procedure-loading],[data-procedure-error]')) throw new Error('Wait for all illustrations to load. Open Bench instructions to review unavailable images before printing.')
      await document.fonts.ready
      await Promise.all(Array.from(printRef.current?.querySelectorAll('img') ?? []).map(image => image.decode()))
      document.body.dataset.labProcedurePrint = 'true'
      window.print()
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'The print view could not be prepared.') }
    finally { delete document.body.dataset.labProcedurePrint; setPrinting(null) }
  }
  return <section className="min-w-0 space-y-4" aria-label="Procedure presentation">
    <div role="group" aria-label="Procedure controls" className="grid min-w-0 gap-4 rounded-lg border bg-muted/20 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div role="group" aria-label="View and print settings" className={`grid min-w-0 gap-3 ${revisionControl ? 'sm:grid-cols-[minmax(0,16rem)_minmax(0,14rem)_7rem]' : 'sm:grid-cols-[minmax(0,16rem)_7rem]'}`}>
        {revisionControl}
        <PreparationField id={`${id}-presentation`} label="Presentation"><NativeSelect id={`${id}-presentation`} value={view} onChange={e => setView(e.target.value as typeof view)}><option value="overview">Process overview</option><option value="bench">Bench instructions</option></NativeSelect></PreparationField>
        <PreparationField id={`${id}-paper`} label="Paper size"><NativeSelect id={`${id}-paper`} value={paper} onChange={e => setPaper(e.target.value)}><option>Letter</option><option>A4</option></NativeSelect></PreparationField>
      </div>
      <div role="group" aria-label="Procedure actions" className="flex items-end justify-end border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4">
        <PreparationActions items={[...actions,
          { label: 'Print overview / save PDF', onClick: () => void print('overview'), disabled: Boolean(printing) },
          { label: 'Print bench instructions / save PDF', onClick: () => void print('bench'), disabled: Boolean(printing) },
          ...(onCapturePreview ? [{ label: 'Preview recording controls', onClick: onCapturePreview }] : []),
        ]} />
      </div>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <div hidden={view !== 'overview'}><Content document={doc} view="overview" /></div>
    <div hidden={view !== 'bench'}><Content document={doc} view="bench" /></div>
    {printing ? createPortal(<div ref={printRef} className="procedure-print-root"><style>{`@page { size: ${paper} ${printing === 'overview' ? 'landscape' : 'portrait'}; margin: 15mm; @top-left { content: ${printHeader}; font-size: 8pt; } @bottom-right { content: 'Page ' counter(page) ' / ' counter(pages); font-size: 9pt; } }`}</style><Content document={doc} view={printing} /></div>, document.body) : null}
  </section>
}
