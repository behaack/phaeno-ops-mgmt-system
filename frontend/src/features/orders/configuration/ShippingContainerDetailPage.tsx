import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, ChevronDown, FilePenLine, SearchCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import { getKitAssemblyWorkflows, kitAssemblyWorkflowsKey } from '#/api/lab-kit-assembly'
import { getSampleShippingConfiguration } from '#/api/sample-shipping'
import { activateShippingContainerDefinition, deactivateShippingContainerDefinition, discardShippingContainerDraft, getShippingContainerDefinition, getShippingContainerDefinitions, getShippingContainerRevisions, type ShippingContainerDefinition } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu as DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { recordLinkClassName } from '#/components/ui/record-link'
import { usePhaenoSession } from '#/features/auth/session-context'
import { useSupplierCatalog } from '#/api/supplier-catalog'
import { ContainerRecommendationDialog } from './ContainerRecommendationDialog'
import { SampleShippingSettingsLayout } from './SampleShippingSettingsLayout'
import { ShippingContainerEditor } from './ShippingContainerEditor'
import { ShippingKitContents } from './ShippingKitContents'
import { parseShippingContainerListSearch } from './shipping-container-navigation'
import { containerDateTime, containerEffectiveState } from './shipping-container-utils'
import { containerDependencyWarnings } from './shipping-dependency-health'
import { shippingSettingsBackLinkClassName } from './shipping-settings-navigation'

export function ShippingContainerDetailPage({ containerId }: { containerId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const client = useQueryClient()
  const navigate = useNavigate()
  const search = parseShippingContainerListSearch(useSearch({ strict: false }))
  const inSettings = (content: ReactNode) => <SampleShippingSettingsLayout section="containers" onSectionChange={section => void navigate({ to: '/sample-shipping-settings', search: { ...search, shippingSection: section }, resetScroll: false })}>{content}</SampleShippingSettingsLayout>
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration)
  const enabled = canManage && authProvider !== 'mock'
  const query = useQuery({ queryKey: ['shipping-container', containerId], queryFn: () => getShippingContainerDefinition(containerId), enabled })
  const history = useQuery({ queryKey: ['shipping-container-revisions', containerId], queryFn: () => getShippingContainerRevisions(containerId), enabled })
  const configuration = useQuery({ queryKey: ['sample-shipping-configuration'], queryFn: getSampleShippingConfiguration, enabled })
  const catalog = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions, enabled })
  const workflows = useQuery({ queryKey: kitAssemblyWorkflowsKey, queryFn: getKitAssemblyWorkflows, enabled })
  const suppliers = useSupplierCatalog(enabled)
  const [editing, setEditing] = useState<ShippingContainerDefinition | null>(null)
  const [preview, setPreview] = useState<ShippingContainerDefinition | null>(null)
  const [deactivation, setDeactivation] = useState<ShippingContainerDefinition | null>(null)
  const [activation, setActivation] = useState<ShippingContainerDefinition | null>(null)
  const [discarding, setDiscarding] = useState(false)
  const discard = useMutation({ mutationFn: (value: ShippingContainerDefinition) => discardShippingContainerDraft(value.id, value.version), onSuccess: async () => { setDiscarding(false); await Promise.all([client.invalidateQueries({ queryKey: ['shipping-container'] }), client.invalidateQueries({ queryKey: ['shipping-container-revisions'] }), client.invalidateQueries({ queryKey: ['shipping-container-definitions'] })]) } })
  const deactivate = useMutation({
    mutationFn: (value: ShippingContainerDefinition) => deactivateShippingContainerDefinition(value.id, value.version),
    onSuccess: async () => {
      setDeactivation(null)
      await Promise.all([client.invalidateQueries({ queryKey: ['shipping-container'] }), client.invalidateQueries({ queryKey: ['shipping-container-revisions'] }), client.invalidateQueries({ queryKey: ['shipping-container-definitions'] })])
    },
  })
  const activate = useMutation({
    mutationFn: (value: ShippingContainerDefinition) => activateShippingContainerDefinition(value.id, value.version),
    onSuccess: async () => {
      setActivation(null)
      await Promise.all([client.invalidateQueries({ queryKey: ['shipping-container'] }), client.invalidateQueries({ queryKey: ['shipping-container-revisions'] }), client.invalidateQueries({ queryKey: ['shipping-container-definitions'] }), client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] })])
    },
  })
  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Container configuration unavailable</AlertTitle><AlertDescription>A Phaeno configuration administrator is required.</AlertDescription></Alert></main>
  if (!enabled) return inSettings(<p>Use a connected Phaeno session to review kit specifications.</p>)
  if (query.isLoading) return inSettings(<p role="status">Loading kit specification…</p>)
  if (!query.data || query.error) return inSettings(<><Link className={shippingSettingsBackLinkClassName} to="/sample-shipping-settings" search={{ ...parseShippingContainerListSearch(search), shippingSection: 'containers' }} hash="container-sizes"><ArrowLeft aria-hidden="true" className="size-4" />Back to kit specifications</Link><Alert variant="destructive" className="mt-5"><AlertTitle>Kit specification unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'The requested kit specification could not be loaded.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert></>)
  const item = query.data
  const productSupplier = suppliers.data?.find(supplier => supplier.products.some(product => product.id === item.finishedKitProductId))
  const purchasedProduct = productSupplier && !productSupplier.isInternalProducer
  const currentWorkflow = workflows.data?.find(value => value.finishedKitProductId === item.finishedKitProductId)?.revisions
    .filter(value => value.status === 'Approved').sort((a, b) => b.revision - a.revision)[0]
  const workflowApprovalMissing = Boolean(productSupplier?.isInternalProducer && workflows.data && !currentWorkflow)
  const sampleType = configuration.data?.sampleTypes.find(value => value.id === item.sampleTypeAnchorId)
  const dependencyWarnings = configuration.data ? containerDependencyWarnings(item, configuration.data) : []
  const revisions = [...(history.data ?? [])].sort((a, b) => b.revision - a.revision)
  const isLatest = Boolean(revisions.length && revisions[0].id === item.id)
  const draft = revisions.find(value => value.lifecycle === 'Draft')
  const latestReleased = revisions.find(value => value.lifecycle === 'Released' || value.lifecycle === 'Superseded' || value.lifecycle === 'Deactivated')
  const deactivationTargets = (isLatest ? revisions : [item]).filter(value => value.isActive && !value.deactivatedAt && containerEffectiveState(value) !== 'Ended')
  async function saved(value: ShippingContainerDefinition) {
    setEditing(null)
    await Promise.all([client.invalidateQueries({ queryKey: ['shipping-container-definitions'] }), client.invalidateQueries({ queryKey: ['shipping-container'] }), client.invalidateQueries({ queryKey: ['shipping-container-revisions'] })])
    await navigate({ to: '/sample-shipping-settings/kit-specifications/$containerId', params: { containerId: value.id }, search })
  }
  return inSettings(<><Link className={shippingSettingsBackLinkClassName} to="/sample-shipping-settings" search={{ ...parseShippingContainerListSearch(search), shippingSection: 'containers' }} hash="container-sizes"><ArrowLeft aria-hidden="true" className="size-4" />Back to kit specifications</Link>
    <header className="my-5 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="wrap-anywhere text-2xl font-semibold">{item.commonName}</h2><Badge variant="outline">{containerEffectiveState(item)}</Badge></div><p className="mt-2 wrap-anywhere text-sm text-muted-foreground">SKU {item.sku} · revision {item.revision} · {item.tubeCapacity} tubes</p></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions<ChevronDown aria-hidden="true" data-icon="inline-end" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]"><DropdownMenuItem disabled={!configuration.data || !catalog.data} onSelect={() => setPreview(item)}><SearchCheck aria-hidden="true" />Preview recommendation</DropdownMenuItem>{draft ? <DropdownMenuItem disabled={!configuration.data} onSelect={() => setEditing(draft)}><FilePenLine aria-hidden="true" />Edit Draft revision {draft.revision}</DropdownMenuItem> : isLatest || latestReleased?.id === item.id ? <DropdownMenuItem disabled={!configuration.data} onSelect={() => setEditing(latestReleased ?? item)}><FilePenLine aria-hidden="true" />Create revision</DropdownMenuItem> : null}{item.lifecycle === 'Draft' && isLatest ? <><DropdownMenuItem disabled={!item.sampleTypeAnchorId} onSelect={() => { activate.reset(); setActivation(item) }}>{item.sampleTypeAnchorId ? 'Activate' : 'Activate (select Sample type first)'}</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setDiscarding(true)}>Discard</DropdownMenuItem></> : null}{deactivationTargets.map(target => <DropdownMenuItem key={target.id} variant="destructive" onSelect={() => { deactivate.reset(); setDeactivation(target) }}>{target.id === item.id ? 'Deactivate' : `Deactivate active specification (rev ${target.revision})`}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></header>
    {configuration.error || history.error || catalog.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Some configuration could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(configuration.error ?? history.error ?? catalog.error, 'Refresh before creating a revision or previewing a recommendation.')}</AlertDescription></Alert> : null}
    {dependencyWarnings.length ? <Alert variant="warning" className="mb-5"><AlertTitle>Specification needs attention</AlertTitle><AlertDescription><p>Review the linked Sample type and unavailable dependencies.</p><ul className="mt-2 list-disc pl-5">{dependencyWarnings.map((warning, index) => <li key={index}>{warning.message}</li>)}</ul></AlertDescription></Alert> : null}
    {item.isActive && item.assemblyWorkflowReady === false && !purchasedProduct ? <Alert variant="warning" className="mb-5"><AlertTitle>Assembly preparation pending</AlertTitle><AlertDescription>Kit orders may be placed, but new physical Phaeno kits need complete specification contents and an approved assembly workflow. Create a specification Draft to correct missing contents.</AlertDescription></Alert> : null}
    {revisions.length > 0 && !isLatest ? <p className="mb-5 rounded-md border bg-muted/40 p-3 text-sm">This is a historical revision. <Link className="text-primary underline" to="/sample-shipping-settings/kit-specifications/$containerId" params={{ containerId: revisions[0].id }} search={search}>Open revision {revisions[0].revision}</Link> to make changes.</p> : null}
    <div className="space-y-5"><Card><CardHeader><CardTitle>Transportation kit details</CardTitle></CardHeader><CardContent><dl className="divide-y text-sm"><div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">Sample type</dt><dd>{sampleType ? <Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: 'sample-types', sampleTypeId: sampleType.id }}>{sampleType.name}</Link> : item.sampleTypeAnchorId ? <span role="alert" className="text-destructive">Linked Sample type unavailable</span> : 'None — link a Sample type before use'}</dd></div><Fact label="Usable tube capacity" value={`${item.tubeCapacity} tubes`} /><Fact label="Dry ice" value={item.dryIceQuantity ? `${item.dryIceQuantity} ${item.dryIceUnit ?? ''}` : 'None'} /><Fact label="Display order" value={String(item.displayOrder)} /><Fact label="Effective from" value={containerDateTime(item.effectiveFrom)} /><Fact label="Effective through" value={item.effectiveTo ? containerDateTime(item.effectiveTo) : 'No end date'} /></dl></CardContent></Card>
      <Card><CardHeader><CardTitle>{purchasedProduct ? 'Purchased complete kit' : item.finishedKitProductId ? 'Required contents and assembly' : 'Historical kit contents'}</CardTitle></CardHeader><CardContent>
        {purchasedProduct ? <p className="mb-3 text-sm">Supplier: {productSupplier.name}. Each received physical kit records its included tube and outer shipper products, supplier receipt, expiration evidence, and verified tube roster. No Phaeno assembly workflow applies.</p> : item.finishedKitProductId ? <div className="mb-3 space-y-1 text-sm"><p>{workflows.isLoading ? 'Loading the current assembly workflow…' : workflows.error ? 'The current assembly workflow could not be loaded.' : currentWorkflow ? `New physical kits use assembly workflow revision ${currentWorkflow.revision} with this specification's required contents.` : <>No approved assembly workflow is available. <Link className={recordLinkClassName} to="/lab-configuration" search={{ configurationTab: 'workflows' }}>Open Lab settings → Workflows</Link> and approve an assembly method before preparing new physical kits.</>}</p><p className="text-muted-foreground">This revision defines the required products and quantities for one Phaeno kit. Each physical kit pins these contents, its actual component use, and the workflow revision used.</p></div> : null}
        {item.kitContents?.length ? <ShippingKitContents contents={item.kitContents} /> : purchasedProduct ? null : <div className="space-y-2 text-sm text-muted-foreground"><p>{item.finishedKitProductId ? 'No required contents are recorded. Create or edit a Draft and add tube, outer shipper, and any other required products before activation.' : 'No product list was recorded for this historical revision.'}</p>{item.supplierName ? <p>Earlier container reference: {item.supplierName}{item.supplierProductNumber ? ` · ${item.supplierProductNumber}` : ''}</p> : null}</div>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Kit preparation</CardTitle></CardHeader><CardContent><dl className="space-y-4 text-sm"><div><dt className="font-medium">Temperature control</dt><dd className="mt-1 whitespace-pre-wrap wrap-anywhere">{item.temperatureControlInstructions || 'Not recorded.'}</dd></div><div><dt className="font-medium">Packing instructions</dt><dd className="mt-1 whitespace-pre-wrap wrap-anywhere">{item.packingInstructions || 'Not recorded.'}</dd></div></dl></CardContent></Card>
      </div>
    <Card className="mt-5"><CardHeader><CardTitle>Revision history</CardTitle></CardHeader><CardContent><p className="mb-3 text-xs text-muted-foreground">Confirmed shipments and manifests retain their original container facts.</p><ul className="divide-y text-sm">{revisions.map(value => <li key={value.id} className="py-3"><Link className={recordLinkClassName} aria-current={value.id === item.id ? 'page' : undefined} to="/sample-shipping-settings/kit-specifications/$containerId" params={{ containerId: value.id }} search={search}>Revision {value.revision}</Link><p className="mt-1 text-xs text-muted-foreground">{containerEffectiveState(value)} · {value.tubeCapacity} tubes</p><p className="mt-1 text-xs text-muted-foreground">From {containerDateTime(value.effectiveFrom)}</p></li>)}</ul>{history.isLoading ? <p role="status" className="text-sm">Loading revisions…</p> : null}</CardContent></Card>
    {editing && configuration.data ? <ShippingContainerEditor source={editing} configuration={configuration.data} onClose={() => setEditing(null)} onSaved={saved} /> : null}
    {preview && configuration.data ? <ContainerRecommendationDialog definitions={catalog.data ?? []} configuration={configuration.data} draftDefinition={preview} onClose={() => setPreview(null)} /> : null}
    <Dialog open={discarding} onOpenChange={open => { if (!open && !discard.isPending) setDiscarding(false) }}><DialogContent><DialogHeader><DialogTitle>Discard Draft revision {item.revision}?</DialogTitle><DialogDescription>The number remains in history and cannot be reused. The released specification stays available.</DialogDescription></DialogHeader>{discard.error ? <Alert variant="destructive"><AlertTitle>Draft was not discarded</AlertTitle><AlertDescription>{getOrderErrorMessage(discard.error, 'Refresh this specification and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" onClick={() => setDiscarding(false)}>Cancel</Button><Button variant="destructive" disabled={discard.isPending} onClick={() => discard.mutate(item)}>{discard.isPending ? 'Discarding…' : 'Discard Draft'}</Button></RequiredDialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(deactivation)} onOpenChange={open => { if (!open && !deactivate.isPending) setDeactivation(null) }}><DialogContent><DialogHeader><DialogTitle>Deactivate kit specification?</DialogTitle><DialogDescription>{deactivation?.commonName} · SKU {deactivation?.sku} · revision {deactivation?.revision} will no longer be eligible for new recommendations. No older revision is reactivated automatically. Existing kits, confirmed shipments, and manifests keep their recorded facts.</DialogDescription></DialogHeader>{deactivate.error ? <Alert variant="destructive"><AlertTitle>Kit specification was not deactivated</AlertTitle><AlertDescription>{getOrderErrorMessage(deactivate.error, 'Refresh the current kit specification and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={deactivate.isPending} onClick={() => setDeactivation(null)}>Cancel</Button><Button variant="destructive" disabled={deactivate.isPending} onClick={() => { if (deactivation) deactivate.mutate(deactivation) }}>{deactivate.isPending ? 'Deactivating…' : 'Deactivate'}</Button></RequiredDialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(activation)} onOpenChange={open => { if (!open && !activate.isPending) setActivation(null) }}><DialogContent aria-describedby="kit-detail-activation-summary kit-detail-activation-consequences">
      <DialogHeader className="pr-[var(--dialog-inset)]"><DialogTitle className="pr-8">Activate kit specification?</DialogTitle><DialogDescription id="kit-detail-activation-summary" className="pr-8">{activation?.commonName} · SKU {activation?.sku} · revision {activation?.revision}</DialogDescription></DialogHeader>
      <div id="kit-detail-activation-consequences" className="space-y-2 text-sm">
        <p>This revision will become Active. Any earlier active revision will close when this one takes effect.</p>
        {activation?.finishedKitProductId ? <><p>The Sample type may still be Draft or inactive. New Orders require an Active Sample type and Shipping procedure.</p><p>Phaeno-made kits can be ordered before workflow approval, but new physical kits cannot be prepared until a compatible workflow is approved. Every physical kit needs assembly or supplier receipt and tube verification before dispatch.</p></> : <p>This older kit will remain unavailable for new Orders because it is not linked to a catalog product.</p>}
      </div>
      {workflowApprovalMissing ? <Alert variant="warning"><AlertTitle>Assembly workflow pending</AlertTitle><AlertDescription>This specification can become Active and accept kit orders, but new physical kits cannot be prepared yet. <Link className={recordLinkClassName} to="/lab-configuration" search={{ configurationTab: 'workflows' }}>Open Lab settings → Workflows</Link> to approve a compatible Transportation kit workflow.</AlertDescription></Alert> : null}
      {activate.error ? <Alert variant="destructive"><AlertTitle>Kit specification was not activated</AlertTitle><AlertDescription>{getOrderErrorMessage(activate.error, 'Review the kit product, approved workflow, and specification details, then try again.')}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={activate.isPending} onClick={() => setActivation(null)}>Cancel</Button><Button disabled={activate.isPending} onClick={() => { if (activation) activate.mutate(activation) }}>{activate.isPending ? 'Activating…' : 'Activate'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog>
  </>)
}
function Fact({ label, value }: { label: string; value: string }) { return <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 wrap-anywhere">{value}</dd></div> }
