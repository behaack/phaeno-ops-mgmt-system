import { LoadingState } from '#/components/ui/content-state'
import { RecordLink } from '#/components/ui/record-link'
import { useState } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getLabSteps } from '#/api/lab-steps'
import { usePhaenoSession } from '#/features/auth/session-context'
import { Input } from '#/components/ui/input'
import { Checkbox } from '#/components/ui/checkbox'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '#/components/ui/card'
import { LabSettingsLayout } from './LabSettingsLayout'
import { PreparationField } from './preparation-ui'
import { deserializeProtocolDefinition, serializeProtocolDefinition, type ProtocolDefinition } from './protocol-definition'
import { ConfigurationPreview } from './ConfigurationPreview'
import { ProcedurePresentation } from './ProcedurePresentation'

function useStepCatalog() {
  const { session, authProvider } = usePhaenoSession()
  return useQuery({ queryKey: ['lab-steps'], queryFn: getLabSteps, enabled: Boolean(session?.capabilities.canManageLabOperations || session?.capabilities.canManageLabProtocols) && authProvider !== 'mock' })
}
export function LabStepList() {
  const query = useStepCatalog()
  const navigate = useNavigate()
  const search = useRouterState({ select: state => state.location.search as { labStepSearch?: string; labStepRetired?: boolean; labStepPage?: number } })
  const items = (query.data ?? []).filter(step => (search.labStepRetired || !step.retiredAtUtc) && step.name.toLowerCase().includes((search.labStepSearch ?? '').toLowerCase()))
  const page = Math.min(search.labStepPage ?? 1, Math.max(1, Math.ceil(items.length / 10)))
  const update = (patch: typeof search) => void navigate({ to: '/lab-configuration', search: previous => ({ ...previous, ...patch, configurationTab: 'steps' }), replace: true })
  return <Card><CardHeader><CardTitle>Historical Lab steps</CardTitle><CardDescription>Read-only source definitions and approval history. Write and approve complete procedures in Protocols or Workflows.</CardDescription>
    <PreparationField label="Find historical Lab steps" id="find-lab-steps"><Input id="find-lab-steps" value={search.labStepSearch ?? ''} onChange={e => update({ labStepSearch: e.target.value, labStepPage: 1 })} /></PreparationField>
    <div className="flex items-center gap-2"><Checkbox id="show-retired-lab-steps" checked={Boolean(search.labStepRetired)} onCheckedChange={checked => update({ labStepRetired: checked === true, labStepPage: 1 })} /><Label htmlFor="show-retired-lab-steps">Show retired</Label></div>
  </CardHeader><CardContent className="space-y-3">
    {query.isPending ? <LoadingState  label={<>Loading historical definitions…</>} /> : query.error ? <p role="alert">Historical definitions could not be loaded.</p> : !items.length ? <p>No historical definitions match.</p> : items.slice((page - 1) * 10, page * 10).map(step => <div key={step.id} className="border-b py-3"><RecordLink asChild><Link to="/lab-operations/steps/$stepId" params={{ stepId: step.id }} search={search}>{step.name}</Link></RecordLink><p className="mt-1 text-sm text-muted-foreground">{step.description} · {step.versions.length} versions · {step.usedBy.length} retained protocol occurrences</p></div>)}
    {items.length > 10 ? <div className="flex items-center justify-between gap-2"><span className="text-sm">Page {page} of {Math.ceil(items.length / 10)}</span><Button variant="outline" disabled={page <= 1} onClick={() => update({ labStepPage: page - 1 })}>Previous</Button><Button variant="outline" disabled={page * 10 >= items.length} onClick={() => update({ labStepPage: page + 1 })}>Next</Button></div> : null}
  </CardContent></Card>
}
export function LabStepPage({ stepId, editing = false }: { stepId: string; editing?: boolean }) {
  const query = useStepCatalog()
  const search = useRouterState({ select: state => state.location.search as { labStepSearch?: string; labStepRetired?: boolean; labStepPage?: number } })
  const step = query.data?.find(item => item.id === stepId)
  const [preview, setPreview] = useState<ProtocolDefinition | null>(null)
  return <LabSettingsLayout section="steps" backLabel="historical Lab steps" backSearch={search}><div className="space-y-5">
    <p className="rounded-lg border p-3 text-sm">Historical source definition. {editing ? 'Catalog editing is no longer available. ' : ''}Author and approve the complete procedure in Protocols or Workflows. Saved approvals and provenance remain available.</p>
    {query.isPending ? <LoadingState  label={<>Loading historical definition…</>} /> : !step ? <p role="alert">Historical definition unavailable.</p> : <>
      <h2 className="text-2xl font-semibold">{step.name}</h2><p>{step.description}</p>
      {[...step.versions].reverse().map(version => {
        const parsed = deserializeProtocolDefinition(version.definitionJson)
        const definition = parsed ? JSON.parse(serializeProtocolDefinition(parsed)) as ProtocolDefinition : null
        return <section key={version.id} className="rounded-lg border p-4">{definition ? <ProcedurePresentation document={{ name: step.name, revision: version.stepVersion, status: version.status, approvedAtUtc: version.approvedAtUtc, instructions: definition.steps }} onCapturePreview={() => setPreview(definition)} /> : <p>Version {version.stepVersion} · {version.status} · No configured content.</p>}</section>
      })}
      {step.usedBy.length ? <section><h3 className="font-medium">Retained protocol references</h3><ul className="list-disc pl-5">{step.usedBy.map(use => <li key={`${use.protocolVersionId}:${use.occurrenceKey}`}>{use.protocolName} v{use.protocolVersion} · {use.status}</li>)}</ul></section> : null}
    </>}
    {preview ? <ConfigurationPreview definition={preview} name={step?.name ?? 'Historical definition'} onClose={() => setPreview(null)} /> : null}
  </div></LabSettingsLayout>
}
