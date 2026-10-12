import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { NativeSelect } from '#/components/ui/native-select'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { FilePenLine, Plus, SearchCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import { getKitAssemblyWorkflows, kitAssemblyWorkflowsKey } from '#/api/lab-kit-assembly'
import type { SampleShippingConfiguration, SampleTypeDefinition } from '#/api/sample-shipping'
import { activateShippingContainerDefinition, deactivateShippingContainerDefinition, discardShippingContainerDraft, getShippingContainerDefinitions, type ShippingContainerDefinition } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { recordLinkClassName } from '#/components/ui/record-link'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { ContainerRecommendationDialog } from './ContainerRecommendationDialog'
import { ShippingContainerEditor } from './ShippingContainerEditor'
import { parseShippingContainerListSearch, type ShippingContainerListSearch } from './shipping-container-navigation'
import { containerEffectiveState, latestContainerRevisions } from './shipping-container-utils'
import { containerDependencyWarnings } from './shipping-dependency-health'

const pageSize = 12
export function ContainerSizesPanel({ apiEnabled, configuration, sampleType }: { apiEnabled: boolean; configuration: SampleShippingConfiguration; sampleType?: SampleTypeDefinition }) {
  const __customerText = useCustomerText()

  const client = useQueryClient()
  const navigate = useNavigate()
  const routeSearch = useSearch({ strict: false })
  const search = useMemo(() => parseShippingContainerListSearch(routeSearch), [routeSearch])
  const [searchText, setSearchText] = useState(search.containerSearch ?? '')
  const [editing, setEditing] = useState<ShippingContainerDefinition | null | undefined>()
  const [preview, setPreview] = useState<ShippingContainerDefinition | null | undefined>()
  const [deactivation, setDeactivation] = useState<ShippingContainerDefinition | null>(null)
  const [activation, setActivation] = useState<ShippingContainerDefinition | null>(null)
  const [discarding, setDiscarding] = useState<ShippingContainerDefinition | null>(null)
  const actionsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const query = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions, enabled: apiEnabled })
  const workflows = useQuery({ queryKey: kitAssemblyWorkflowsKey, queryFn: getKitAssemblyWorkflows, enabled: apiEnabled && Boolean(activation?.shippingContainerProductId) })
  const deactivate = useMutation({
    mutationFn: (item: ShippingContainerDefinition) => deactivateShippingContainerDefinition(item.id, item.version),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['shipping-container-definitions'] }),
        client.invalidateQueries({ queryKey: ['shipping-container'] }),
        client.invalidateQueries({ queryKey: ['shipping-container-revisions'] }),
      ])
      setDeactivation(null)
    },
  })
  const activate = useMutation({
    mutationFn: (item: ShippingContainerDefinition) => activateShippingContainerDefinition(item.id, item.version),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['shipping-container-definitions'] }),
        client.invalidateQueries({ queryKey: ['shipping-container'] }),
        client.invalidateQueries({ queryKey: ['shipping-container-revisions'] }),
        client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }),
      ])
      setActivation(null)
    },
  })
  const discard = useMutation({
    mutationFn: (item: ShippingContainerDefinition) => discardShippingContainerDraft(item.id, item.version),
    onSuccess: async () => {
      setDiscarding(null)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['shipping-container-definitions'] }),
        client.invalidateQueries({ queryKey: ['shipping-container'] }),
        client.invalidateQueries({ queryKey: ['shipping-container-revisions'] }),
      ])
    },
  })
  useEffect(() => {
    if (searchText === (search.containerSearch ?? '')) return
    const timer = window.setTimeout(() => { void navigate({ to: '/sample-shipping-settings', search: { ...search, shippingSection: sampleType ? 'sample-types' : 'containers', sampleTypeId: sampleType?.id, containerSearch: searchText || undefined, containerPage: 1 }, replace: true, resetScroll: false }) }, 200)
    return () => window.clearTimeout(timer)
  }, [navigate, sampleType, search, searchText])
  function changeSearch(update: ShippingContainerListSearch) {
    void navigate({ to: '/sample-shipping-settings', search: { ...search, ...update, shippingSection: sampleType ? 'sample-types' : 'containers', sampleTypeId: sampleType?.id }, replace: true, resetScroll: false })
  }
  const familyIds = new Set(configuration.sampleTypes.filter(item => item.definitionKey === sampleType?.definitionKey).map(item => item.id))
  const allLatest = latestContainerRevisions(query.data ?? [])
  const activeByKey = new Map(latestContainerRevisions((query.data ?? []).filter(value => containerEffectiveState(value) === 'Active now' && (!sampleType || Boolean(value.sampleTypeAnchorId && familyIds.has(value.sampleTypeAnchorId))))).map(value => [value.definitionKey, value]))
  const latest = allLatest.filter(item => !sampleType || Boolean(item.sampleTypeAnchorId && familyIds.has(item.sampleTypeAnchorId)) || activeByKey.has(item.definitionKey))
  const deactivatableRevisions = (query.data ?? []).filter(value => value.isActive && !value.deactivatedAt && containerEffectiveState(value) !== 'Ended')
  const activationWorkflow = workflows.data?.find(value => value.id === activation?.assemblyWorkflowId)
    ?.revisions.some(value => value.status === 'Approved')
  const workflowApprovalMissing = Boolean(activation?.shippingContainerProductId && workflows.data && !activationWorkflow)
  const affectedSpecifications = [...activeByKey.values()]
    .filter(value => containerDependencyWarnings(value, configuration).length > 0)
  const needle = (search.containerSearch ?? '').trim().toLowerCase()
  const visibleByActivation = latest.filter(item => search.containerShowInactive || activeByKey.has(item.definitionKey) || item.lifecycle === 'Draft')
  const filtered = visibleByActivation.filter(item => (!needle || `${item.commonName} ${item.sku} ${activeByKey.get(item.definitionKey)?.commonName ?? ''}`.toLowerCase().includes(needle))
    && (search.containerStatus === 'all' || (search.containerStatus === 'active' ? activeByKey.has(item.definitionKey) : !activeByKey.has(item.definitionKey))))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(search.containerPage ?? 1, pageCount)
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)
  async function saved(item: ShippingContainerDefinition) {
    setEditing(undefined)
    await client.invalidateQueries({ queryKey: ['shipping-container-definitions'] })
    await navigate({ to: '/sample-shipping-settings/kit-specifications/$containerId', params: { containerId: item.id }, search })
  }
  function openDeactivation(item: ShippingContainerDefinition) {
    deactivate.reset()
    setDeactivation(item)
  }
  return <Card id="container-sizes" className="gap-0 py-0"><CardHeader className="grid-cols-1 gap-x-3 border-b bg-muted/50 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
    <CardTitle className="min-w-0"><CustomerText message="m_6f2979e4d104" /></CardTitle>
    <div className="flex flex-wrap gap-2 sm:col-start-2 sm:row-start-1 sm:justify-self-end"><Button variant="outline" disabled={!apiEnabled || !query.data} onClick={() => setPreview(null)}><SearchCheck aria-hidden="true" /><CustomerText message="m_83efd961fce9" /></Button><Button disabled={!apiEnabled || !query.data} onClick={() => setEditing(null)}><Plus aria-hidden="true" /><CustomerText message="m_9df53a853f13" /></Button></div>
    <CardDescription className="sm:col-span-full">{sampleType ? __customerText('m_8caece6e4d17', { p0: String(sampleType.name) }) : __customerText('m_7835102a4eb6')}</CardDescription>
    <div className="mt-3 flex flex-wrap items-center gap-3 sm:col-span-full"><div className="min-w-48 flex-1"><Label htmlFor="container-search" className="sr-only"><CustomerText message="m_9b662c08c8e3" /></Label><Input id="container-search" value={searchText} onChange={event => setSearchText(event.target.value)} placeholder={__customerText('m_7a633d808cd0')} /></div><div><Label htmlFor="container-status" className="sr-only"><CustomerText message="m_12f67f8539c4" /></Label><NativeSelect id="container-status" className="w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" value={search.containerStatus} onChange={event => changeSearch({ containerStatus: event.target.value as ShippingContainerListSearch['containerStatus'], containerPage: 1 })}><option value="all"><CustomerText message="m_2ac0f50706fa" /></option><option value="active"><CustomerText message="m_2a4729fa7647" /></option><option value="inactive"><CustomerText message="m_2e886f9c5815" /></option></NativeSelect></div><div className="flex items-center gap-2"><Checkbox id="container-show-inactive" checked={Boolean(search.containerShowInactive)} onCheckedChange={checked => changeSearch({ containerShowInactive: checked === true, containerPage: 1 })} /><Label htmlFor="container-show-inactive" className="cursor-pointer"><CustomerText message="m_1f91c29f3f97" /></Label></div>{needle || search.containerStatus !== 'all' || search.containerShowInactive ? <Button variant="ghost" onClick={() => { setSearchText(''); changeSearch({ containerSearch: undefined, containerStatus: 'all', containerShowInactive: false, containerPage: 1 }) }}><CustomerText message="m_29a390f9237e" /></Button> : null}</div>
  </CardHeader><CardContent className="space-y-4 p-4">
    {affectedSpecifications.length ? <Alert variant="warning"><AlertTitle>{affectedSpecifications.length} <CustomerText message="m_7e45f5635796" />{affectedSpecifications.length === 1 ? <CustomerSourceText source={"specification needs"} /> : __customerText('m_e5867213bb0b')} <CustomerText message="m_0e593b3ef7e9" /></AlertTitle><AlertDescription><CustomerText message="m_4de2a53516e0" /></AlertDescription></Alert> : null}
    {query.isLoading ? <p role="status" className="text-sm text-muted-foreground"><CustomerText message="m_3e4c5a8a1329" /></p> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_184792c907c0" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(query.error, 'Refresh the list and try again.')} />} <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><CustomerText message="m_942087cc2d41" /></Button></AlertDescription></Alert> : null}
    {query.data && items.length ? <div className="overflow-x-auto" role="region" aria-label={__customerText('m_86ae31211232')}><table className="w-full min-w-[28rem] table-fixed text-left text-sm">
      <thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-2 pr-3 font-medium"><CustomerText message="m_0c7823e8c759" /></th><th className="w-16 pb-2 pr-2 font-medium sm:w-24"><CustomerText message="m_b1186bc83c90" /></th><th className="w-24 pb-2"><span className="sr-only"><CustomerText message="m_ff8059dc6752" /></span></th></tr></thead>
      <tbody className="divide-y">{items.map(item => {
        const latestReleased = (query.data ?? []).filter(value => value.definitionKey === item.definitionKey && (value.lifecycle === 'Released' || value.lifecycle === 'Superseded' || value.lifecycle === 'Deactivated')).sort((a, b) => b.revision - a.revision)[0]
        const displayed = activeByKey.get(item.definitionKey) ?? (sampleType && item.sampleTypeAnchorId && familyIds.has(item.sampleTypeAnchorId) ? item : latestReleased) ?? item
        const hasNewerRevision = displayed.id !== item.id
        const pendingRevision = item.lifecycle === 'Draft'
        const deactivationTargets = deactivatableRevisions.filter(value => value.definitionKey === item.definitionKey).sort((a, b) => b.revision - a.revision)
        const warnings = containerDependencyWarnings(displayed, configuration)
        return <tr key={item.id}>
        <td className="py-3 pr-3"><div className="flex flex-wrap items-center gap-2"><Link className={`wrap-anywhere ${recordLinkClassName}`} to="/sample-shipping-settings/kit-specifications/$containerId" params={{ containerId: displayed.id }} search={search}>{displayed.commonName}</Link><Badge variant="outline" className="h-auto max-w-full whitespace-normal break-all"><CustomerText message="m_7370f6c81297" />{displayed.sku} <CustomerText message="m_e322a1be7afe" />{displayed.revision}</Badge><Badge variant={activeByKey.has(item.definitionKey) ? "secondary" : "outline"}>{activeByKey.has(item.definitionKey) ? <CustomerSourceText source={"Active"} /> : item.lifecycle === 'Draft' ? "Draft" : __customerText('m_ac7c949f1211')}</Badge></div>{!sampleType ? <p className="mt-1 text-xs text-muted-foreground"><CustomerText message="m_50db69d79718" />{configuration.sampleTypes.find(value => value.id === displayed.sampleTypeAnchorId)?.name ?? (displayed.sampleTypeAnchorId ? 'Unavailable' : 'None')}</p> : null}{hasNewerRevision && pendingRevision ? <p className="mt-1 text-sm"><Link className={recordLinkClassName} to="/sample-shipping-settings/kit-specifications/$containerId" params={{ containerId: item.id }} search={search}><CustomerText message="m_d0adc1bb6f60" />{item.revision}</Link> <CustomerText message="m_80228cbce414" />{configuration.sampleTypes.find(value => value.id === item.sampleTypeAnchorId)?.name ?? 'not selected'}</p> : null}{warnings.length ? <div role="alert" className="mt-2 rounded-md border border-warning-border bg-warning-background px-3 py-2 text-sm text-warning"><strong><CustomerText message="m_c1ebc7817870" /></strong><ul className="mt-1 list-disc pl-5">{warnings.map(warning => <li key={warning.message}>{<CustomerSourceText source={warning.message} />}</li>)}</ul></div> : null}{displayed.isActive && displayed.assemblyWorkflowReady === false ? <p role="status" className="mt-2 rounded-md border border-warning-border bg-warning-background px-3 py-2 text-sm text-warning"><CustomerText message="m_b91d843c220d" /></p> : null}</td>
        <td className="py-3 pr-2 align-top">{displayed.tubeCapacity}</td>
        <td className="py-3 align-top"><ActionMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={__customerText('m_e78d9a50658a', { p0: String(displayed.commonName) })} onPointerDown={event => { actionsTriggerRef.current = event.currentTarget }} onFocus={event => { actionsTriggerRef.current = event.currentTarget }}><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]"><DropdownMenuItem onSelect={() => setPreview(displayed)}><SearchCheck aria-hidden="true" /><CustomerText message="m_83efd961fce9" /></DropdownMenuItem><DropdownMenuItem onSelect={() => setEditing(pendingRevision ? item : latestReleased ?? displayed)}><FilePenLine aria-hidden="true" />{pendingRevision ? __customerText('m_fed098d586d6', { p0: String(item.revision) }) : __customerText('m_68bf5426f2b3')}</DropdownMenuItem>{pendingRevision ? <><DropdownMenuItem disabled={!item.sampleTypeAnchorId} onSelect={() => { activate.reset(); setActivation(item) }}>{item.sampleTypeAnchorId ? __customerText('m_a0a925f3e0be', { p0: String(item.revision) }) : __customerText('m_773ffeb9a1a0')}</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setDiscarding(item)}><CustomerText message="m_35cefb4d4564" /></DropdownMenuItem></> : null}{deactivationTargets.map(target => <DropdownMenuItem key={target.id} variant="destructive" onSelect={() => openDeactivation(target)}>{target.id === item.id ? <CustomerSourceText source={"Deactivate"} /> : __customerText('m_707f2e7f2163', { p0: String(target.revision) })}</DropdownMenuItem>)}</DropdownMenuContent></ActionMenu></td>
      </tr>})}</tbody>
    </table></div> : null}
    {query.data && !items.length ? <div className="py-6 text-center text-sm text-muted-foreground">{!latest.length && sampleType ? <p><CustomerText message="m_80344395f53e" /></p> : !latest.length ? <p><CustomerText message="m_b2006eff4041" /></p> : !visibleByActivation.length && !needle && search.containerStatus === 'all' ? <p><CustomerText message="m_ff66675f6cdf" /></p> : <p><CustomerText message="m_7064ce335056" /></p>}</div> : null}
    {query.data && filtered.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filtered.length} <CustomerText message="m_f45d215586b8" />{page} of {pageCount}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changeSearch({ containerPage: page - 1 })}><CustomerText message="m_a57b08a480b8" /></Button><Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => changeSearch({ containerPage: page + 1 })}><CustomerText message="m_1ff57a29d7c9" /></Button></div></div> : null}
    {editing !== undefined ? <ShippingContainerEditor source={editing} configuration={configuration} existingDefinitions={query.data ?? []} initialSampleTypeDefinitionKey={sampleType?.definitionKey} onClose={() => setEditing(undefined)} onSaved={saved} /> : null}
    {preview !== undefined ? <ContainerRecommendationDialog definitions={query.data ?? []} configuration={configuration} draftDefinition={preview ?? undefined} onClose={() => setPreview(undefined)} /> : null}
    {discarding ? <Dialog open onOpenChange={open => { if (!open && !discard.isPending) setDiscarding(null) }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); (actionsTriggerRef.current?.isConnected ? actionsTriggerRef.current : document.getElementById('container-search'))?.focus() }}><DialogHeader><DialogTitle><CustomerText message="m_cf1f2d80cffd" />{discarding.revision}?</DialogTitle><DialogDescription><CustomerText message="m_38c8deaa75f6" /></DialogDescription></DialogHeader>{discard.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_f39e54ae4225" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(discard.error, 'Refresh this kit and try again.')} />}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={discard.isPending} onClick={() => setDiscarding(null)}><CustomerText message="m_19766ed6ccb2" /></Button><Button variant="destructive" disabled={discard.isPending} onClick={() => discard.mutate(discarding)}>{discard.isPending ? <CustomerSourceText source={"Discarding…"} /> : __customerText('m_35cefb4d4564')}</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
    {deactivation ? <Dialog open onOpenChange={open => { if (!open && !deactivate.isPending) setDeactivation(null) }}><DialogContent showCloseButton={!deactivate.isPending} onCloseAutoFocus={event => { event.preventDefault(); (actionsTriggerRef.current?.isConnected ? actionsTriggerRef.current : document.getElementById('container-search'))?.focus() }}>
      <DialogHeader><DialogTitle><CustomerText message="m_56efcf0ef3cb" /></DialogTitle><DialogDescription>{deactivation.commonName} <CustomerText message="m_ce92c91a9097" />{deactivation.sku} <CustomerText message="m_3b0e4579f573" />{deactivation.revision} <CustomerText message="m_bad86bcde958" /></DialogDescription></DialogHeader>
      {deactivate.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_ccebf4731b51" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(deactivate.error, 'Refresh the kit specifications and try again.')} />}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={deactivate.isPending} onClick={() => setDeactivation(null)}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="button" variant="destructive" disabled={deactivate.isPending} onClick={() => deactivate.mutate(deactivation)}>{deactivate.isPending ? <CustomerSourceText source={"Deactivating…"} /> : __customerText('m_fb1e6fa55327')}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
    {activation ? <Dialog open onOpenChange={open => { if (!open && !activate.isPending) setActivation(null) }}><DialogContent aria-describedby="kit-list-activation-summary kit-list-activation-consequences" showCloseButton={!activate.isPending} onCloseAutoFocus={event => { event.preventDefault(); (actionsTriggerRef.current?.isConnected ? actionsTriggerRef.current : document.getElementById('container-search'))?.focus() }}>
      <DialogHeader className="pr-[var(--dialog-inset)]"><DialogTitle className="pr-8"><CustomerText message="m_6ac12b9cd728" /></DialogTitle><DialogDescription id="kit-list-activation-summary" className="pr-8">{activation.commonName} <CustomerText message="m_ce92c91a9097" />{activation.sku} <CustomerText message="m_3b0e4579f573" />{activation.revision}</DialogDescription></DialogHeader>
      <div id="kit-list-activation-consequences" className="space-y-2 text-sm">
        <p><CustomerText message="m_50b89b5a012e" /></p>
        <p><CustomerText message="m_d5f73f292c01" /></p>
      </div>
      {workflowApprovalMissing ? <Alert variant="warning"><AlertTitle><CustomerText message="m_fa96a6b2b3c1" /></AlertTitle><AlertDescription><CustomerText message="m_3e57745e0535" /><Link className={recordLinkClassName} to="/lab-configuration" search={{ configurationTab: "workflows" }}><CustomerText message="m_8c0866666d44" /></Link> <CustomerText message="m_05599f19dc18" /></AlertDescription></Alert> : null}
      {activate.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_8f778923fd6c" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(activate.error, 'Review the kit product, approved workflow, and specification details.')} />}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={activate.isPending} onClick={() => setActivation(null)}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="button" disabled={activate.isPending} onClick={() => activate.mutate(activation)}>{activate.isPending ? <CustomerSourceText source={"Activating…"} /> : __customerText('m_24433c70eba5')}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
  </CardContent></Card>
}
