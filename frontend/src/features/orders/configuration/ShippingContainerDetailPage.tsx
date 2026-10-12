import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, FilePenLine, SearchCheck } from 'lucide-react'
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

import { RequiredDialogFooter } from '#/components/ui/required-field'
import { recordLinkClassName } from '#/components/ui/record-link'
import { usePhaenoSession } from '#/features/auth/session-context'
import { ContainerRecommendationDialog } from './ContainerRecommendationDialog'
import { SampleShippingSettingsLayout } from './SampleShippingSettingsLayout'
import { ShippingContainerEditor } from './ShippingContainerEditor'
import { ShippingKitContents } from './ShippingKitContents'
import { parseShippingContainerListSearch } from './shipping-container-navigation'
import { containerDateTime, containerEffectiveState } from './shipping-container-utils'
import { containerDependencyWarnings } from './shipping-dependency-health'
import { shippingSettingsBackLinkClassName } from './shipping-settings-navigation'

export function ShippingContainerDetailPage({ containerId }: { containerId: string }) {
  const __customerText = useCustomerText()

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
  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle><CustomerText message="m_5f214a1c0398" /></AlertTitle><AlertDescription><CustomerText message="m_ad3dc379faf7" /></AlertDescription></Alert></main>
  if (!enabled) return inSettings(<p><CustomerText message="m_9170f00b6f21" /></p>)
  if (query.isLoading) return inSettings(<p role="status"><CustomerText message="m_7125f0e63f95" /></p>)
  if (!query.data || query.error) return inSettings(<><Link className={shippingSettingsBackLinkClassName} to="/sample-shipping-settings" search={{ ...parseShippingContainerListSearch(search), shippingSection: "containers" }} hash="container-sizes"><ArrowLeft aria-hidden="true" className="size-4" /><CustomerText message="m_ab9535c2ffcd" /></Link><Alert variant="destructive" className="mt-5"><AlertTitle><CustomerText message="m_b78602b36d44" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error, 'The requested kit specification could not be loaded.')} />} <Button variant="outline" onClick={() => void query.refetch()}><CustomerText message="m_942087cc2d41" /></Button></AlertDescription></Alert></>)
  const item = query.data
  const currentWorkflow = workflows.data?.find(value => value.id === item.assemblyWorkflowId)?.revisions
    .filter(value => value.status === 'Approved').sort((a, b) => b.revision - a.revision)[0]
  const workflowApprovalMissing = Boolean(item.shippingContainerProductId && workflows.data && !currentWorkflow)
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
  return inSettings(<><Link className={shippingSettingsBackLinkClassName} to="/sample-shipping-settings" search={{ ...parseShippingContainerListSearch(search), shippingSection: "containers" }} hash="container-sizes"><ArrowLeft aria-hidden="true" className="size-4" /><CustomerText message="m_ab9535c2ffcd" /></Link>
    <header className="my-5 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="wrap-anywhere text-2xl font-semibold">{item.commonName}</h2><Badge variant="outline">{containerEffectiveState(item)}</Badge></div><p className="mt-2 wrap-anywhere text-sm text-muted-foreground"><CustomerText message="m_7370f6c81297" />{item.sku} <CustomerText message="m_3b0e4579f573" />{item.revision} · {item.tubeCapacity} <CustomerText message="m_0f4552851513" /></p></div><ActionMenu><DropdownMenuTrigger asChild><Button variant="outline"><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]"><DropdownMenuItem disabled={!configuration.data || !catalog.data} onSelect={() => setPreview(item)}><SearchCheck aria-hidden="true" /><CustomerText message="m_83efd961fce9" /></DropdownMenuItem>{draft ? <DropdownMenuItem disabled={!configuration.data} onSelect={() => setEditing(draft)}><FilePenLine aria-hidden="true" /><CustomerText message="m_439cdd5d5ae6" />{draft.revision}</DropdownMenuItem> : isLatest || latestReleased?.id === item.id ? <DropdownMenuItem disabled={!configuration.data} onSelect={() => setEditing(latestReleased ?? item)}><FilePenLine aria-hidden="true" /><CustomerText message="m_68bf5426f2b3" /></DropdownMenuItem> : null}{item.lifecycle === 'Draft' && isLatest ? <><DropdownMenuItem disabled={!item.sampleTypeAnchorId} onSelect={() => { activate.reset(); setActivation(item) }}>{item.sampleTypeAnchorId ? <CustomerSourceText source={"Activate"} /> : __customerText('m_773ffeb9a1a0')}</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setDiscarding(true)}><CustomerText message="m_eb1a70e39274" /></DropdownMenuItem></> : null}{deactivationTargets.map(target => <DropdownMenuItem key={target.id} variant="destructive" onSelect={() => { deactivate.reset(); setDeactivation(target) }}>{target.id === item.id ? <CustomerSourceText source={"Deactivate"} /> : __customerText('m_707f2e7f2163', { p0: String(target.revision) })}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu></header>
    {configuration.error || history.error || catalog.error ? <Alert variant="destructive" className="mb-5"><AlertTitle><CustomerText message="m_54c5b0702130" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(configuration.error ?? history.error ?? catalog.error, 'Refresh before creating a revision or previewing a recommendation.')} />}</AlertDescription></Alert> : null}
    {dependencyWarnings.length ? <Alert variant="warning" className="mb-5"><AlertTitle><CustomerText message="m_a5a68ddc4e55" /></AlertTitle><AlertDescription><p><CustomerText message="m_d4aea6c66fd6" /></p><ul className="mt-2 list-disc pl-5">{dependencyWarnings.map((warning, index) => <li key={index}>{<CustomerSourceText source={warning.message} />}</li>)}</ul></AlertDescription></Alert> : null}
    {item.isActive && item.assemblyWorkflowReady === false ? <Alert variant="warning" className="mb-5"><AlertTitle><CustomerText message="m_50212afbd982" /></AlertTitle><AlertDescription><CustomerText message="m_2213538dfb57" /></AlertDescription></Alert> : null}
    {revisions.length > 0 && !isLatest ? <p className="mb-5 rounded-md border bg-muted/40 p-3 text-sm"><CustomerText message="m_566ef1c66ceb" /><Link className="text-primary underline" to="/sample-shipping-settings/kit-specifications/$containerId" params={{ containerId: revisions[0].id }} search={search}><CustomerText message="m_4ead93d0ce5c" />{revisions[0].revision}</Link> <CustomerText message="m_f3acf1481d9c" /></p> : null}
    <div className="space-y-5"><Card><CardHeader><CardTitle><CustomerText message="m_a806cab6ca50" /></CardTitle></CardHeader><CardContent><dl className="divide-y text-sm"><div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground"><CustomerText message="m_1e3f2e3f87c9" /></dt><dd>{sampleType ? <Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: "sample-types", sampleTypeId: sampleType.id }}>{sampleType.name}</Link> : item.sampleTypeAnchorId ? <span role="alert" className="text-destructive"><CustomerText message="m_fa6a89c9563b" /></span> : __customerText('m_4bde07045fb6')}</dd></div><Fact label={__customerText('m_6ae37d32209e')} value={`${item.tubeCapacity} tubes`} /><Fact label={__customerText('m_269ad8645b4c')} value={item.dryIceQuantity ? `${item.dryIceQuantity} ${item.dryIceUnit ?? ''}` : "None"} /><Fact label={__customerText('m_540fc6ae338e')} value={String(item.displayOrder)} /><Fact label={__customerText('m_4f86b19b388a')} value={containerDateTime(item.effectiveFrom)} /><Fact label={__customerText('m_d896379f9340')} value={item.effectiveTo ? containerDateTime(item.effectiveTo) : "No end date"} /></dl></CardContent></Card>
      <Card><CardHeader><CardTitle><CustomerText message="m_5245fe36b581" /></CardTitle></CardHeader><CardContent>
        {<div className="mb-3 space-y-1 text-sm"><p>{workflows.isLoading ? <CustomerSourceText source={"Loading the current assembly workflow…"} /> : workflows.error ? "The current assembly workflow could not be loaded." : currentWorkflow ? __customerText('m_9ff0e112a551', { p0: String(currentWorkflow.revision) }) : <><CustomerText message="m_c081c31c71cd" /><Link className={recordLinkClassName} to="/lab-configuration" search={{ configurationTab: "workflows" }}><CustomerText message="m_8c0866666d44" /></Link> <CustomerText message="m_61299c8e0966" /></>}</p><p className="text-muted-foreground"><CustomerText message="m_84ada05cecc7" /></p></div>}
        {item.kitContents?.length ? <ShippingKitContents contents={item.kitContents} /> : <p className="text-sm text-muted-foreground"><CustomerText message="m_c30952e2c23e" /></p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle><CustomerText message="m_9bf421707f6e" /></CardTitle></CardHeader><CardContent><dl className="space-y-4 text-sm"><div><dt className="font-medium"><CustomerText message="m_cadf53581e85" /></dt><dd className="mt-1 whitespace-pre-wrap wrap-anywhere">{item.temperatureControlInstructions || 'Not recorded.'}</dd></div></dl></CardContent></Card>
      </div>
    <Card className="mt-5"><CardHeader><CardTitle><CustomerText message="m_5ae0d3d186c7" /></CardTitle></CardHeader><CardContent><p className="mb-3 text-xs text-muted-foreground"><CustomerText message="m_dc4eb50ebe5c" /></p><ul className="divide-y text-sm">{revisions.map(value => <li key={value.id} className="py-3"><Link className={recordLinkClassName} aria-current={value.id === item.id ? "page" : undefined} to="/sample-shipping-settings/kit-specifications/$containerId" params={{ containerId: value.id }} search={search}><CustomerText message="m_e330d85ff901" />{value.revision}</Link><p className="mt-1 text-xs text-muted-foreground">{containerEffectiveState(value)} · {value.tubeCapacity} <CustomerText message="m_0f4552851513" /></p><p className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_e484a95dcc85" />{containerDateTime(value.effectiveFrom)}</p></li>)}</ul>{history.isLoading ? <p role="status" className="text-sm"><CustomerText message="m_c5c851965992" /></p> : null}</CardContent></Card>
    {editing && configuration.data ? <ShippingContainerEditor source={editing} configuration={configuration.data} onClose={() => setEditing(null)} onSaved={saved} /> : null}
    {preview && configuration.data ? <ContainerRecommendationDialog definitions={catalog.data ?? []} configuration={configuration.data} draftDefinition={preview} onClose={() => setPreview(null)} /> : null}
    <Dialog open={discarding} onOpenChange={open => { if (!open && !discard.isPending) setDiscarding(false) }}><DialogContent><DialogHeader><DialogTitle><CustomerText message="m_cf1f2d80cffd" />{item.revision}?</DialogTitle><DialogDescription><CustomerText message="m_7e7f41d0aeb3" /></DialogDescription></DialogHeader>{discard.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_f39e54ae4225" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(discard.error, 'Refresh this specification and try again.')} />}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" onClick={() => setDiscarding(false)}><CustomerText message="m_19766ed6ccb2" /></Button><Button variant="destructive" disabled={discard.isPending} onClick={() => discard.mutate(item)}>{discard.isPending ? <CustomerSourceText source={"Discarding…"} /> : __customerText('m_35cefb4d4564')}</Button></RequiredDialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(deactivation)} onOpenChange={open => { if (!open && !deactivate.isPending) setDeactivation(null) }}><DialogContent><DialogHeader><DialogTitle><CustomerText message="m_56efcf0ef3cb" /></DialogTitle><DialogDescription>{deactivation?.commonName} <CustomerText message="m_ce92c91a9097" />{deactivation?.sku} <CustomerText message="m_3b0e4579f573" />{deactivation?.revision} <CustomerText message="m_bad86bcde958" /></DialogDescription></DialogHeader>{deactivate.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_ccebf4731b51" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(deactivate.error, 'Refresh the current kit specification and try again.')} />}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={deactivate.isPending} onClick={() => setDeactivation(null)}><CustomerText message="m_19766ed6ccb2" /></Button><Button variant="destructive" disabled={deactivate.isPending} onClick={() => { if (deactivation) deactivate.mutate(deactivation) }}>{deactivate.isPending ? <CustomerSourceText source={"Deactivating…"} /> : __customerText('m_fb1e6fa55327')}</Button></RequiredDialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(activation)} onOpenChange={open => { if (!open && !activate.isPending) setActivation(null) }}><DialogContent aria-describedby="kit-detail-activation-summary kit-detail-activation-consequences">
      <DialogHeader className="pr-[var(--dialog-inset)]"><DialogTitle className="pr-8"><CustomerText message="m_6ac12b9cd728" /></DialogTitle><DialogDescription id="kit-detail-activation-summary" className="pr-8">{activation?.commonName} <CustomerText message="m_ce92c91a9097" />{activation?.sku} <CustomerText message="m_3b0e4579f573" />{activation?.revision}</DialogDescription></DialogHeader>
      <div id="kit-detail-activation-consequences" className="space-y-2 text-sm">
        <p><CustomerText message="m_50b89b5a012e" /></p>
        <p><CustomerText message="m_d5f73f292c01" /></p>
      </div>
      {workflowApprovalMissing ? <Alert variant="warning"><AlertTitle><CustomerText message="m_fa96a6b2b3c1" /></AlertTitle><AlertDescription><CustomerText message="m_3e57745e0535" /><Link className={recordLinkClassName} to="/lab-configuration" search={{ configurationTab: "workflows" }}><CustomerText message="m_8c0866666d44" /></Link> <CustomerText message="m_05599f19dc18" /></AlertDescription></Alert> : null}
      {activate.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_8f778923fd6c" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(activate.error, 'Review the kit product, approved workflow, and specification details, then try again.')} />}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={activate.isPending} onClick={() => setActivation(null)}><CustomerText message="m_19766ed6ccb2" /></Button><Button disabled={activate.isPending} onClick={() => { if (activation) activate.mutate(activation) }}>{activate.isPending ? <CustomerSourceText source={"Activating…"} /> : __customerText('m_24433c70eba5')}</Button></RequiredDialogFooter>
    </DialogContent></Dialog>
  </>)
}
function Fact({ label, value }: { label: string; value: string }) { return <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 wrap-anywhere">{value}</dd></div> }
