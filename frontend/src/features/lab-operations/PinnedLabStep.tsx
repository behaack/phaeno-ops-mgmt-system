import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import type { LabStep } from '#/api/lab-steps'
import { Button } from '#/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardAction } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { PreparationActions, PreparationField, prepSelectClass } from './preparation-ui'
import type { ProtocolDefinitionFormValues, ProtocolStepFormValues } from './protocol-definition'
import { deserializeProtocolDefinition } from './protocol-definition'

export function resolveCatalogStep(catalog: LabStep[], versionId: string, key = `step-${crypto.randomUUID()}`): ProtocolStepFormValues {
  const version = catalog.flatMap(s => s.versions).find(v => v.id === versionId)!
  const content = deserializeProtocolDefinition(version.definitionJson)!.steps[0]
  return { ...content, key, labStepVersionId: version.id }
}

export function LabStepPicker({ catalog, onAdd }: { catalog: LabStep[]; onAdd: (step: ProtocolStepFormValues) => void }) {
  const [id, setId] = useState('')
  const choices = catalog.filter(s => !s.retiredAtUtc).flatMap(s => s.versions.filter(v => v.status === 'Approved').map(v => ({ id: v.id, label: `${s.name} · v${v.stepVersion}` })))
  return <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3"><div className="min-w-48 flex-1"><PreparationField label="Approved Lab step version" id="catalog-step"><select id="catalog-step" className={prepSelectClass} value={id} onChange={e => setId(e.target.value)}><option value="">Choose an exact version…</option>{choices.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></PreparationField></div><Button type="button" variant="outline" disabled={!id} onClick={() => { onAdd(resolveCatalogStep(catalog, id)); setId('') }}>Add Lab step</Button>{!choices.length ? <p className="w-full text-sm text-muted-foreground">Approve a Lab step version in Lab configuration before selecting it here.</p> : null}</div>
}

export function PinnedLabStep({ form, index, catalog, total, onReplace, onMove, onDuplicate, onRemove, onPreview }: {
  form: UseFormReturn<ProtocolDefinitionFormValues>; index: number; total: number; catalog: LabStep[];
  onReplace: (step: ProtocolStepFormValues) => void; onMove: (to: number) => void; onDuplicate: () => void; onRemove: () => void; onPreview: () => void
}) {
  const current = form.watch(`steps.${index}`)
  const identity = catalog.find(s => s.versions.some(v => v.id === current.labStepVersionId))
  const version = identity?.versions.find(v => v.id === current.labStepVersionId)
  const latest = identity?.versions.filter(v => v.status === 'Approved').at(-1)
  return <Card><CardHeader><CardTitle>Step {index + 1} · {current.name}</CardTitle><CardDescription>Pinned Lab step {version ? `v${version.stepVersion}` : 'version'}{identity?.retiredAtUtc ? ' · Retired, retained reference' : ''}. Content is read-only; changes require an approved Lab step version.</CardDescription><CardAction><PreparationActions items={[
    { label: 'Configuration preview', onClick: onPreview },
    ...(latest && version && latest.stepVersion > version.stepVersion && !identity?.retiredAtUtc ? [{ label: `Adopt approved v${latest.stepVersion}`, onClick: () => onReplace({ ...resolveCatalogStep(catalog, latest.id, current.key), requirement: current.requirement, condition: current.condition }) }] : []),
    { label: 'Move up', disabled: index === 0, onClick: () => onMove(index - 1) }, { label: 'Move down', disabled: index === total - 1, onClick: () => onMove(index + 1) },
    { label: 'Duplicate occurrence', onClick: onDuplicate }, { label: 'Remove occurrence', disabled: total === 1, onClick: onRemove },
  ]} /></CardAction></CardHeader><CardContent className="space-y-3"><p className="whitespace-pre-wrap text-sm">{current.instructions}</p>
    <PreparationField label="Requirement in this protocol" id={`pinned-${index}-requirement`} required><select id={`pinned-${index}-requirement`} className={prepSelectClass} {...form.register(`steps.${index}.requirement`)}><option value="required">Required</option><option value="optional">Optional</option><option value="conditional">Conditional</option></select></PreparationField>
    {current.requirement === 'conditional' ? <PreparationField label="When this step applies" id={`pinned-${index}-condition`} required error={form.formState.errors.steps?.[index]?.condition?.message}><Input id={`pinned-${index}-condition`} {...form.register(`steps.${index}.condition`)} /></PreparationField> : null}
    <p className="text-xs text-muted-foreground">Occurrence: {current.key}. Earlier steps remain ordered prerequisites.</p>
  </CardContent></Card>
}
