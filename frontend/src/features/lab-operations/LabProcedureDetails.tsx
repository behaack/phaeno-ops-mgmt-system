import { LoadingState } from '#/components/ui/content-state'
import { useConfigurationDiscovery, type WorkflowKind } from './configuration-discovery'
import { useId, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getLabOperationsDashboard, getLabOperationsError } from '#/api/lab-operations'
import { getKitAssemblyWorkflows, kitAssemblyWorkflowsKey } from '#/api/lab-kit-assembly'
import { listMasterMixWorkflows, masterMixWorkflowsKey } from '#/api/lab-master-mix'
import { listReagentWorkflows, reagentWorkflowsKey } from '#/api/lab-reagent-manufacturing'
import { usePhaenoSession } from '#/features/auth/session-context'
import { NativeSelect } from '#/components/ui/native-select'
import { LabSettingsLayout } from './LabSettingsLayout'
import { ProcedurePresentation, type ProcedureDocument } from './ProcedurePresentation'
import { deserializeSavedProcedure, serializeProtocolDefinition, type ProtocolDefinition } from './protocol-definition'
import { ConfigurationPreview } from './ConfigurationPreview'
import { MasterMixProcedureEditor } from './MasterMixWorkflowSettingsV2'
import { KitProcedureEditor } from './KitAssemblyWorkflowSettings'
import { ReagentProcedureEditor } from './ReagentWorkflowSettings'

import { procedureDetailRoute } from './procedure-navigation'
import { resolveWorkflowPresentation } from './workflow-presentation'
import { PreparationField } from './preparation-ui'

export function LabProcedureDetails({ kind, recordId, revision, edit }: { kind: string; recordId: string; revision?: number; edit?: boolean }) {
  const { session, authProvider } = usePhaenoSession()
  const navigate = useNavigate()
  const discovery = useConfigurationDiscovery()
  const revisionId = useId()
  const workflowType: WorkflowKind = kind === 'masterMix' ? 'master-mix' : kind === 'kit' ? 'transportation-kit' : kind === 'reagent' ? 'reagent' : 'library'
  const [capturePreview, setCapturePreview] = useState<ProtocolDefinition | null>(null)
  const enabled = Boolean(session?.capabilities.canManageLabOperations || session?.capabilities.canManageLabProtocols) && authProvider !== 'mock'
  const dashboard = useQuery({ queryKey: ['lab-operations'], queryFn: getLabOperationsDashboard, enabled })
  const kits = useQuery({ queryKey: kitAssemblyWorkflowsKey, queryFn: getKitAssemblyWorkflows, enabled: enabled && kind === 'kit' })
  const mixes = useQuery({ queryKey: masterMixWorkflowsKey, queryFn: listMasterMixWorkflows, enabled: enabled && kind === 'masterMix' })
  const reagents = useQuery({ queryKey: reagentWorkflowsKey, queryFn: listReagentWorkflows, enabled: enabled && kind === 'reagent' })
  const isProtocol = kind === 'protocol'
  const canEdit = Boolean(session?.capabilities.canManageLabProtocols)
  const query = kind === 'kit' ? kits : kind === 'masterMix' ? mixes : kind === 'reagent' ? reagents : dashboard
  const close = () => void navigate({ to: '/lab-configuration', search: { ...discovery, workflowType, configurationTab: isProtocol ? 'protocols' : 'workflows' } })
  const protocol = dashboard.data?.protocols.find(p => p.id === recordId)
  const workflow = dashboard.data?.serviceWorkflows.find(w => w.id === recordId)
  const kit = kits.data?.find(w => w.id === recordId)
  const mix = mixes.data?.find(w => w.id === recordId)
  const reagent = reagents.data?.find(w => w.id === recordId)
  let doc: ProcedureDocument | undefined
  let revisions: { revision: number; status: string }[] = []
  let preview: ProtocolDefinition | undefined
  let presentationError: string | undefined
  if (isProtocol && protocol) {
    revisions = protocol.versions.map(v => ({ revision: v.protocolVersion, status: v.status }))
    const v = revision ? protocol.versions.find(v => v.protocolVersion === revision) : protocol.versions.find(v => ['Approved', 'Active'].includes(v.status)) ?? protocol.versions.at(-1)
    const parsed = v ? deserializeSavedProcedure(v.definitionJson) : null
    if (v && parsed) { preview = JSON.parse(serializeProtocolDefinition(parsed)) as ProtocolDefinition; doc = { name: protocol.name, revision: v.protocolVersion, status: v.status, approvedAtUtc: v.approvedAtUtc, instructions: preview.steps } }
  } else if (kind === 'library' && workflow) {
    revisions = workflow.versions.map(v => ({ revision: v.workflowVersion, status: v.status }))
    const v = revision ? workflow.versions.find(v => v.workflowVersion === revision) : workflow.versions.find(v => v.status === 'Production') ?? workflow.versions.at(-1)
    if (v) {
      try {
        doc = { overviewInstructions: v.stages.map(stage => ({ key: stage.id, name: stage.name, instructions: '', condition: stage.condition, required: stage.requirement === 'Required', protocolLabel: `${stage.protocolName} · v${stage.protocolVersion}`, handoffCriteria: stage.handoffCriteria })), name: workflow.name, revision: v.workflowVersion, status: v.status, approvedAtUtc: v.approvedAtUtc, instructions: resolveWorkflowPresentation(v.stages, dashboard.data?.protocols ?? []) }
      } catch (error) { presentationError = error instanceof Error ? error.message : 'The complete pinned procedure is unavailable.' }
    }
  } else if (kind === 'kit' && kit) {
    revisions = kit.revisions
    const v = revision ? kit.revisions.find(v => v.revision === revision) : kit.revisions.find(v => v.status === 'Approved') ?? kit.revisions[0]
    if (v) doc = { name: kit.name, revision: v.revision, status: v.status, approvedAtUtc: v.approvedAtUtc, instructions: v.steps.map(s => ({ ...s, key: s.stepKey })) }
  } else if (kind === 'masterMix' && mix) {
    revisions = mix.revisions
    const v = revision ? mix.revisions.find(v => v.revision === revision) : mix.revisions.find(v => v.status === 'Approved') ?? mix.revisions[0]
    if (v) doc = { name: v.name, revision: v.revision, status: v.status, approvedAtUtc: v.approvedAtUtc, instructions: v.steps, subtitle: `Mix amount unit: ${v.quantityUnit}. Ingredient amounts are defined for one preparation.` }
  } else if (kind === 'reagent' && reagent) {
    revisions = reagent.revisions
    const v = revision ? reagent.revisions.find(v => v.revision === revision) : reagent.revisions.find(v => v.status === 'Approved') ?? reagent.revisions[0]
    if (v) doc = { name: v.name, revision: v.revision, status: v.status, approvedAtUtc: v.approvedAtUtc, instructions: v.steps, subtitle: `${reagent.materialName} · inventory unit ${reagent.outputUnit ?? 'not configured'}` }
  }
  if (doc) doc.revisionUrl = typeof window === 'undefined' ? undefined : `${window.location.origin}/lab-configuration/procedures/${kind}/${recordId}?revision=${doc.revision}`
  const editing = canEdit && (edit || recordId === 'new')
  return <LabSettingsLayout backSearch={{ ...discovery, workflowType: isProtocol ? discovery.workflowType : workflowType }} section={isProtocol ? 'protocols' : 'workflows'} backLabel={isProtocol ? 'protocols' : 'workflows'}>
    {!enabled ? <p>Connect with authorized laboratory access to view this procedure.</p> : query.isPending || dashboard.isPending ? <LoadingState  label={<>Loading procedure…</>} /> : query.error || dashboard.error ? <p role="alert">{getLabOperationsError(query.error ?? dashboard.error, 'The procedure could not be loaded.')}</p> : editing && kind === 'masterMix' && (mix || recordId === 'new') ? <MasterMixProcedureEditor key={recordId} workflow={mix} onClose={close} /> : editing && kind === 'kit' && (kit || recordId === 'new') ? <KitProcedureEditor key={recordId} workflow={kit} onClose={close} /> : editing && kind === 'reagent' && (reagent || recordId === 'new') ? <ReagentProcedureEditor key={recordId} workflow={reagent} definitions={dashboard.data?.materialDefinitions ?? []} onClose={close} /> : doc ? <div className="space-y-5">
      <ProcedurePresentation document={doc} revisionControl={<PreparationField id={revisionId} label="Revision"><NativeSelect id={revisionId} value={String(doc.revision)} onChange={e => void navigate({ to: procedureDetailRoute, params: { kind, recordId }, search: { ...discovery, revision: Number(e.target.value) } })}>{revisions.map(v => <option key={v.revision} value={v.revision}>Revision {v.revision} · {v.status}</option>)}</NativeSelect></PreparationField>} actions={canEdit ? [{ label: 'Edit current draft / create revision', onClick: () => {
        if (protocol && !protocol.retiredAtUtc) {
          const draft = protocol.versions.find(v => v.status === 'Draft')
          if (draft) void navigate({ to: '/lab-operations/protocols/$protocolId/versions/$versionId/edit', params: { protocolId: protocol.id, versionId: draft.id }, search: discovery })
          else void navigate({ to: '/lab-operations/protocols/$protocolId/versions/new', params: { protocolId: protocol.id }, search: discovery })
        } else if (workflow) {
          const candidate = workflow.versions.find(v => ['Draft', 'Invalid', 'Approved'].includes(v.status))
          if (candidate && candidate.status !== 'Approved') void navigate({ to: '/lab-operations/workflows/$workflowId/versions/$versionId/edit', params: { workflowId: workflow.id, versionId: candidate.id }, search: discovery })
          else if (!candidate) void navigate({ to: '/lab-operations/workflows/$workflowId/versions/new', params: { workflowId: workflow.id }, search: discovery })
        } else void navigate({ to: procedureDetailRoute, params: { kind, recordId }, search: { ...discovery, edit: true } })
      }, disabled: Boolean(protocol?.retiredAtUtc || mix?.status === 'Retired' || reagent?.status === 'Retired' || workflow?.versions.some(v => v.status === 'Approved')) }] : []} onCapturePreview={preview ? () => setCapturePreview(preview) : undefined} />
    </div> : <p role="alert">{presentationError ?? 'This exact procedure revision is unavailable.'}</p>}
    {capturePreview ? <ConfigurationPreview definition={capturePreview} name={doc?.name ?? 'Procedure'} onClose={() => setCapturePreview(null)} /> : null}
  </LabSettingsLayout>
}
