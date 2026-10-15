import { ProcedureSource } from './ProcedureSource'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Textarea } from '#/components/ui/textarea'
import { ProcedureSequence } from './ProcedureSequence'
import { ProcedureLibraryPicker } from './ProcedureLibraryPicker'
import { ProcedureIllustrationsEditor, useIllustrationUploadPending } from './ProcedureIllustrations'
import { newInstruction, type ProcedureInstruction, type ProcedureContext } from './procedure-types'
import { PreparationActions, PreparationField } from './preparation-ui'

export function SimpleProcedureEditor({ instructions, onChange, context, disabled = false }: { instructions: ProcedureInstruction[]; onChange: (steps: ProcedureInstruction[]) => void; context: Extract<ProcedureContext, 'kit' | 'reagent'>; disabled?: boolean }) {
  const uploading = useIllustrationUploadPending()
  const update = (index: number, next: ProcedureInstruction) => onChange(instructions.map((item, i) => i === index ? next : item))
  const move = (from: number, to: number) => { const next = [...instructions]; next.splice(to, 0, next.splice(from, 1)[0]); onChange(next) }
  return <fieldset disabled={disabled || uploading} className="min-w-0 space-y-4"><legend className="mb-3 text-sm font-semibold">Procedure instructions *</legend>
    <ProcedureLibraryPicker context={context} remaining={100 - instructions.length} onInsert={(source, selected) => onChange([...instructions, ...source.steps.filter((_, i) => selected === null || i === selected).map(step => ({ key: crypto.randomUUID(), name: step.name, instructions: step.instructions, illustrations: step.illustrations ?? [], copiedFrom: { kind: source.kind, recordId: source.recordId, revision: source.revision, stepKey: step.key } }))])} />
    <ProcedureSequence items={instructions.map(step => ({ id: step.key, title: step.name, summary: step.instructions, invalid: !step.name.trim() || !step.instructions.trim() }))} onMove={move}>{(index, moveInstruction) => {
      const step = instructions[index]
      return <section className="space-y-4 rounded-lg border p-4"><header className="flex items-center justify-between gap-3"><h3 className="font-medium">Instruction {index + 1}</h3><PreparationActions items={[
        { label: 'Move up', onClick: () => moveInstruction(index, index - 1), disabled: index === 0 }, { label: 'Move down', onClick: () => moveInstruction(index, index + 1), disabled: index === instructions.length - 1 },
        { label: 'Duplicate instruction', onClick: () => onChange([...instructions.slice(0, index + 1), { ...structuredClone(step), key: crypto.randomUUID() }, ...instructions.slice(index + 1)]), disabled: instructions.length >= 100 },
        { label: 'Remove instruction', onClick: () => onChange(instructions.filter((_, i) => i !== index)), disabled: instructions.length === 1 },
      ]} /></header>
        <PreparationField label="Instruction name" id={`instruction-name-${step.key}`} required><Input id={`instruction-name-${step.key}`} maxLength={160} value={step.name} onChange={e => update(index, { ...step, name: e.target.value })} /></PreparationField>
        <PreparationField label="Instructions" id={`instruction-text-${step.key}`} required><Textarea id={`instruction-text-${step.key}`} rows={5} maxLength={4000} value={step.instructions} onChange={e => update(index, { ...step, instructions: e.target.value })} /></PreparationField>
        <ProcedureIllustrationsEditor images={step.illustrations ?? []} onChange={images => update(index, { ...step, illustrations: images })} />
        <ProcedureSource source={step.copiedFrom} />
      </section>
    }}</ProcedureSequence>
    <Button type="button" variant="outline" disabled={instructions.length >= 100} onClick={() => onChange([...instructions, newInstruction()])}>Add instruction</Button>
  </fieldset>
}
