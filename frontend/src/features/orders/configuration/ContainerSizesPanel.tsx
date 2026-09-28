import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronDown, FilePenLine, Plus, SearchCheck } from 'lucide-react'
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
import { ActionMenu as DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
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
    <CardTitle className="min-w-0">Kit specifications</CardTitle>
    <div className="flex flex-wrap gap-2 sm:col-start-2 sm:row-start-1 sm:justify-self-end"><Button variant="outline" disabled={!apiEnabled || !query.data} onClick={() => setPreview(null)}><SearchCheck aria-hidden="true" />Preview recommendation</Button><Button disabled={!apiEnabled || !query.data} onClick={() => setEditing(null)}><Plus aria-hidden="true" />Add Transportation kit</Button></div>
    <CardDescription className="sm:col-span-full">{sampleType ? `${sampleType.name} can use multiple Transportation kits, each with its own capacity and preparation.` : 'Each Kit specification revision selects its Sample type. Open a kit to review its preparation, workflow, and revisions.'}</CardDescription>
    <div className="mt-3 flex flex-wrap items-center gap-3 sm:col-span-full"><div className="min-w-48 flex-1"><Label htmlFor="container-search" className="sr-only">Search kit specifications</Label><Input id="container-search" value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Search by common name or SKU" /></div><div><Label htmlFor="container-status" className="sr-only">Availability</Label><select id="container-status" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" value={search.containerStatus} onChange={event => changeSearch({ containerStatus: event.target.value as ShippingContainerListSearch['containerStatus'], containerPage: 1 })}><option value="all">All availability</option><option value="active">Available now</option><option value="inactive">Not available now</option></select></div><div className="flex items-center gap-2"><Checkbox id="container-show-inactive" checked={Boolean(search.containerShowInactive)} onCheckedChange={checked => changeSearch({ containerShowInactive: checked === true, containerPage: 1 })} /><Label htmlFor="container-show-inactive" className="cursor-pointer">Show inactive</Label></div>{needle || search.containerStatus !== 'all' || search.containerShowInactive ? <Button variant="ghost" onClick={() => { setSearchText(''); changeSearch({ containerSearch: undefined, containerStatus: 'all', containerShowInactive: false, containerPage: 1 }) }}>Clear all</Button> : null}</div>
  </CardHeader><CardContent className="space-y-4 p-4">
    {affectedSpecifications.length ? <Alert variant="warning"><AlertTitle>{affectedSpecifications.length} Active kit {affectedSpecifications.length === 1 ? 'specification needs' : 'specifications need'} attention</AlertTitle><AlertDescription>Review the specific issues shown under each kit before using it for new work.</AlertDescription></Alert> : null}
    {query.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading kit specifications…</p> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle>Kit specifications unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Refresh the list and try again.')} <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : null}
    {query.data && items.length ? <div className="overflow-x-auto" role="region" aria-label="Kit specifications list"><table className="w-full min-w-[28rem] table-fixed text-left text-sm">
      <thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-2 pr-3 font-medium">Container</th><th className="w-16 pb-2 pr-2 font-medium sm:w-24">Usable tubes</th><th className="w-24 pb-2"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody className="divide-y">{items.map(item => {
        const latestReleased = (query.data ?? []).filter(value => value.definitionKey === item.definitionKey && (value.lifecycle === 'Released' || value.lifecycle === 'Superseded' || value.lifecycle === 'Deactivated')).sort((a, b) => b.revision - a.revision)[0]
        const displayed = activeByKey.get(item.definitionKey) ?? (sampleType && item.sampleTypeAnchorId && familyIds.has(item.sampleTypeAnchorId) ? item : latestReleased) ?? item
        const hasNewerRevision = displayed.id !== item.id
        const pendingRevision = item.lifecycle === 'Draft'
        const deactivationTargets = deactivatableRevisions.filter(value => value.definitionKey === item.definitionKey).sort((a, b) => b.revision - a.revision)
        const warnings = containerDependencyWarnings(displayed, configuration)
        return <tr key={item.id}>
        <td className="py-3 pr-3"><div className="flex flex-wrap items-center gap-2"><Link className={`wrap-anywhere ${recordLinkClassName}`} to="/sample-shipping-settings/kit-specifications/$containerId" params={{ containerId: displayed.id }} search={search}>{displayed.commonName}</Link><Badge variant="outline" className="h-auto max-w-full whitespace-normal break-all">SKU {displayed.sku} · rev {displayed.revision}</Badge><Badge variant={activeByKey.has(item.definitionKey) ? 'secondary' : 'outline'}>{activeByKey.has(item.definitionKey) ? 'Active' : item.lifecycle === 'Draft' ? 'Draft' : 'Inactive'}</Badge></div>{!sampleType ? <p className="mt-1 text-xs text-muted-foreground">Sample type: {configuration.sampleTypes.find(value => value.id === displayed.sampleTypeAnchorId)?.name ?? (displayed.sampleTypeAnchorId ? 'Unavailable' : 'None')}</p> : null}{hasNewerRevision && pendingRevision ? <p className="mt-1 text-sm"><Link className={recordLinkClassName} to="/sample-shipping-settings/kit-specifications/$containerId" params={{ containerId: item.id }} search={search}>Draft revision {item.revision}</Link> · Sample type: {configuration.sampleTypes.find(value => value.id === item.sampleTypeAnchorId)?.name ?? 'not selected'}</p> : null}{warnings.length ? <div role="alert" className="mt-2 rounded-md border border-warning-border bg-warning-background px-3 py-2 text-sm text-warning"><strong>Needs attention</strong><ul className="mt-1 list-disc pl-5">{warnings.map(warning => <li key={warning.message}>{warning.message}</li>)}</ul></div> : null}{displayed.isActive && displayed.assemblyWorkflowReady === false ? <p role="status" className="mt-2 rounded-md border border-warning-border bg-warning-background px-3 py-2 text-sm text-warning">Assembly workflow pending. Orders can be placed, but new physical Phaeno kits cannot be prepared yet.</p> : null}</td>
        <td className="py-3 pr-2 align-top">{displayed.tubeCapacity}</td>
        <td className="py-3 align-top"><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={`Actions for ${displayed.commonName}`} onPointerDown={event => { actionsTriggerRef.current = event.currentTarget }} onFocus={event => { actionsTriggerRef.current = event.currentTarget }}>Actions<ChevronDown aria-hidden="true" className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]"><DropdownMenuItem onSelect={() => setPreview(displayed)}><SearchCheck aria-hidden="true" />Preview recommendation</DropdownMenuItem><DropdownMenuItem onSelect={() => setEditing(pendingRevision ? item : latestReleased ?? displayed)}><FilePenLine aria-hidden="true" />{pendingRevision ? `Edit Draft revision ${item.revision}` : 'Create revision'}</DropdownMenuItem>{pendingRevision ? <><DropdownMenuItem disabled={!item.sampleTypeAnchorId} onSelect={() => { activate.reset(); setActivation(item) }}>{item.sampleTypeAnchorId ? `Activate revision ${item.revision}` : 'Activate (select Sample type first)'}</DropdownMenuItem><DropdownMenuItem variant="destructive" onSelect={() => setDiscarding(item)}>Discard Draft</DropdownMenuItem></> : null}{deactivationTargets.map(target => <DropdownMenuItem key={target.id} variant="destructive" onSelect={() => openDeactivation(target)}>{target.id === item.id ? 'Deactivate' : `Deactivate active specification (rev ${target.revision})`}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></td>
      </tr>})}</tbody>
    </table></div> : null}
    {query.data && !items.length ? <div className="py-6 text-center text-sm text-muted-foreground">{!latest.length && sampleType ? <p>No Transportation kit revision currently selects this Sample type. Add a kit specification Draft or edit an existing Draft to select it.</p> : !latest.length ? <p>No kit specifications are configured. Add a supplier Transportation kit product and its shipping specification Draft.</p> : !visibleByActivation.length && !needle && search.containerStatus === 'all' ? <p>All kit specifications are inactive. Select Show inactive to review them.</p> : <p>No kit specifications match these filters.</p>}</div> : null}
    {query.data && filtered.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filtered.length} specifications · Page {page} of {pageCount}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changeSearch({ containerPage: page - 1 })}>Previous</Button><Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => changeSearch({ containerPage: page + 1 })}>Next</Button></div></div> : null}
    {editing !== undefined ? <ShippingContainerEditor source={editing} configuration={configuration} existingDefinitions={query.data ?? []} initialSampleTypeDefinitionKey={sampleType?.definitionKey} onClose={() => setEditing(undefined)} onSaved={saved} /> : null}
    {preview !== undefined ? <ContainerRecommendationDialog definitions={query.data ?? []} configuration={configuration} draftDefinition={preview ?? undefined} onClose={() => setPreview(undefined)} /> : null}
    {discarding ? <Dialog open onOpenChange={open => { if (!open && !discard.isPending) setDiscarding(null) }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); (actionsTriggerRef.current?.isConnected ? actionsTriggerRef.current : document.getElementById('container-search'))?.focus() }}><DialogHeader><DialogTitle>Discard Draft revision {discarding.revision}?</DialogTitle><DialogDescription>The revision remains in history and its number cannot be reused. The released specification stays available.</DialogDescription></DialogHeader>{discard.error ? <Alert variant="destructive"><AlertTitle>Draft was not discarded</AlertTitle><AlertDescription>{getOrderErrorMessage(discard.error, 'Refresh this kit and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={discard.isPending} onClick={() => setDiscarding(null)}>Cancel</Button><Button variant="destructive" disabled={discard.isPending} onClick={() => discard.mutate(discarding)}>{discard.isPending ? 'Discarding…' : 'Discard Draft'}</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
    {deactivation ? <Dialog open onOpenChange={open => { if (!open && !deactivate.isPending) setDeactivation(null) }}><DialogContent showCloseButton={!deactivate.isPending} onCloseAutoFocus={event => { event.preventDefault(); (actionsTriggerRef.current?.isConnected ? actionsTriggerRef.current : document.getElementById('container-search'))?.focus() }}>
      <DialogHeader><DialogTitle>Deactivate kit specification?</DialogTitle><DialogDescription>{deactivation.commonName} · SKU {deactivation.sku} · revision {deactivation.revision} will no longer be eligible for new recommendations. No older revision is reactivated automatically. Existing kits, confirmed shipments, and manifests keep their recorded facts.</DialogDescription></DialogHeader>
      {deactivate.error ? <Alert variant="destructive"><AlertTitle>Kit specification was not deactivated</AlertTitle><AlertDescription>{getOrderErrorMessage(deactivate.error, 'Refresh the kit specifications and try again.')}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={deactivate.isPending} onClick={() => setDeactivation(null)}>Cancel</Button><Button type="button" variant="destructive" disabled={deactivate.isPending} onClick={() => deactivate.mutate(deactivation)}>{deactivate.isPending ? 'Deactivating…' : 'Deactivate'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
    {activation ? <Dialog open onOpenChange={open => { if (!open && !activate.isPending) setActivation(null) }}><DialogContent aria-describedby="kit-list-activation-summary kit-list-activation-consequences" showCloseButton={!activate.isPending} onCloseAutoFocus={event => { event.preventDefault(); (actionsTriggerRef.current?.isConnected ? actionsTriggerRef.current : document.getElementById('container-search'))?.focus() }}>
      <DialogHeader className="pr-[var(--dialog-inset)]"><DialogTitle className="pr-8">Activate kit specification?</DialogTitle><DialogDescription id="kit-list-activation-summary" className="pr-8">{activation.commonName} · SKU {activation.sku} · revision {activation.revision}</DialogDescription></DialogHeader>
      <div id="kit-list-activation-consequences" className="space-y-2 text-sm">
        <p>This revision will become Active. Any earlier active revision will close when this one takes effect.</p>
        <p>New Orders require an Active Sample type and Shipping procedure. Preparing physical kits requires an approved assembly workflow, completed assembly, and verified tubes.</p>
      </div>
      {workflowApprovalMissing ? <Alert variant="warning"><AlertTitle>Assembly workflow pending</AlertTitle><AlertDescription>This specification can become Active and accept kit orders, but new physical kits cannot be prepared yet. <Link className={recordLinkClassName} to="/lab-configuration" search={{ configurationTab: 'workflows' }}>Open Lab settings → Workflows</Link> to approve a compatible Transportation kit workflow.</AlertDescription></Alert> : null}
      {activate.error ? <Alert variant="destructive"><AlertTitle>Kit specification was not activated</AlertTitle><AlertDescription>{getOrderErrorMessage(activate.error, 'Review the kit product, approved workflow, and specification details.')}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={activate.isPending} onClick={() => setActivation(null)}>Cancel</Button><Button type="button" disabled={activate.isPending} onClick={() => activate.mutate(activation)}>{activate.isPending ? 'Activating…' : 'Activate'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
  </CardContent></Card>
}
