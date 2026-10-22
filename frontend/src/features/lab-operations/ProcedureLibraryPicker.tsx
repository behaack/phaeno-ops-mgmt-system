import { LoadingState } from '#/components/ui/content-state'
import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProcedureLibrary, type ProcedureLibraryItem } from '#/api/lab-procedures'
import { Button } from '#/components/ui/button'
import { NativeSelect } from '#/components/ui/native-select'
import type { ProcedureContext } from './procedure-types'
import { PreparationField } from './preparation-ui'
import { useIllustrationUploadPending } from './ProcedureIllustrations'

export function ProcedureLibraryPicker({ context, onInsert, remaining = 100 }: { context: ProcedureContext; onInsert: (source: ProcedureLibraryItem, index: number | null) => void; remaining?: number }) {
  const id = useId()
  const uploading = useIllustrationUploadPending()
  const [enabled, setEnabled] = useState(false)
  const [selection, setSelection] = useState('')
  const query = useQuery({ queryKey: ['procedure-library', context], queryFn: () => getProcedureLibrary(context), enabled })
  const choices = (query.data ?? []).flatMap(source => [
    { value: `${source.kind}:${source.recordId}:${source.revision}:all`, label: `${source.name} · v${source.revision} · All instructions`, source, index: null },
    ...source.steps.map((step, index) => ({ value: `${source.kind}:${source.recordId}:${source.revision}:step:${step.key}`, label: `${source.name} · v${source.revision} · ${index + 1}. ${step.name}`, source, index })),
  ])
  const selected = choices.find(option => option.value === selection)
  const exceedsLimit = Boolean(selected && (selected.index === null ? selected.source.steps.length : 1) > remaining)
  return <details className="rounded-lg border p-3" onToggle={e => { if (e.currentTarget.open) setEnabled(true) }}>
    <summary className="cursor-pointer text-sm font-medium">Insert from an approved procedure (optional)</summary>
    <div className="mt-3 space-y-3"><p className="text-xs text-muted-foreground">A copy belongs to this draft and is reviewed with the complete procedure. Source updates never change it automatically.</p>
      <PreparationField label="Procedure or instruction" id={id}><NativeSelect id={id} value={selection} onChange={e => setSelection(e.target.value)}><option value="">Choose approved content…</option>{choices.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</NativeSelect></PreparationField>
      {query.isPending ? <LoadingState  label={<>Loading approved procedures…</>} /> : query.error ? <p role="alert" className="text-sm text-destructive">Approved procedures could not be loaded.</p> : !choices.length ? <p className="text-sm text-muted-foreground">No approved procedures are available in this context. You can write instructions directly below.</p> : null}
      {exceedsLimit ? <p role="alert" className="text-sm text-destructive">This copy exceeds the 100-instruction limit. Choose fewer instructions or remove an existing instruction.</p> : null}
      <Button type="button" variant="outline" disabled={!selected || exceedsLimit || uploading} onClick={() => { if (selected && !exceedsLimit && !uploading) { onInsert(selected.source, selected.index); setSelection('') } }}>Insert copy</Button>
    </div>
  </details>
}
