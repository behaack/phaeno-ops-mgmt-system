import { CommercialOrderDraftPage } from '#/features/orders/CommercialOrderDraftPage'
import { SampleShippingConfigurationPanel } from '#/features/orders/configuration/SampleShippingConfigurationPanel'
import { ShippingContainerEditor } from '#/features/orders/configuration/ShippingContainerEditor'
import { ProcedurePresentation } from '#/features/lab-operations/ProcedurePresentation'
import { ProtocolApprovalDialog } from '#/features/lab-operations/ProtocolApprovalDialog'
import { createLibraryPreparationExample, serializeProtocolDefinition } from '#/features/lab-operations/protocol-definition'
import { ExternalOrderListPage } from '#/features/orders/ExternalOrderListPage'
import { LabServiceDetailPage } from '#/features/orders/LabServiceDetailPage'
import type { SampleShippingConfiguration } from '#/api/sample-shipping'
import { bundleIds } from '#/test-helpers/bundled-orders'

const noop = () => {}
const protocol = { id: 'demo-protocol', key: 'demo', name: 'DEMO — procedure review', description: 'Fictional instructional example.', latestVersion: 1, version: 1, versions: [] }
const definition = createLibraryPreparationExample()
const version = { id: 'demo-version', protocolVersion: 1, status: 'Draft', definitionJson: serializeProtocolDefinition(definition), authoredByUserId: 'demo-other-author', authoredAtUtc: '2026-10-22T10:00:00Z', approvedByUserId: null, approvedAtUtc: null }
const configuration: SampleShippingConfiguration = { sampleTypes: [], destinations: [], procedures: [], defaultDestinationVersion: 0 }

export function GuideWorkflowScene({ scene }: { scene: string }) {
  if (scene === 'order-scope' || scene === 'order-blocked' || scene === 'order-submit') return <CommercialOrderDraftPage organizationId="demo-customer" />
  if (scene === 'destination') return <main className="page-wrap px-4 py-8"><SampleShippingConfigurationPanel apiEnabled section="destinations" /></main>
  if (scene === 'kit-specification') return <main className="page-wrap px-4 py-8"><ShippingContainerEditor source={null} configuration={configuration} onClose={noop} onSaved={noop} /></main>
  if (scene === 'protocol-approval') return <main className="page-wrap px-4 py-8"><ProtocolApprovalDialog protocol={protocol} version={version} isPending={false} onOpenChange={noop} onApprove={noop} /></main>
  if (scene === 'protocol-preview') return <main className="page-wrap px-4 py-8"><ProcedurePresentation document={{ name: protocol.name, revision: 1, status: 'Draft', instructions: [{ key: 'demo-step', name: 'DEMO — identity review', instructions: 'Illustration only. Verify the coded material identity and consult the approved procedure before laboratory work.' }] }} /></main>
  if (scene === 'partner-assembly') return <ExternalOrderListPage kind="assembly" />
  if (scene === 'customer-results') return <LabServiceDetailPage orderId={bundleIds.order} workspace={{detailTab:'results'}} onWorkspaceChange={async () => {}} />
  return null
}
