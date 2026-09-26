import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronDown, FilePenLine, Link2, Plus, SearchCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import type { SampleShippingConfiguration, SampleTypeDefinition } from '#/api/sample-shipping'
import { deactivateShippingContainerDefinition, getShippingContainerDefinitions, linkTransportationKitSampleType, type ShippingContainerDefinition } from '#/api/shipping-containers'
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
import { ShippingActivationBadge } from './ShippingActivationBadge'
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
  const [linking, setLinking] = useState<ShippingContainerDefinition | null>(null)
  const [linkedSampleTypeId, setLinkedSampleTypeId] = useState('')
  const actionsTriggerRef = useRef<HTMLButtonElement | null>(null)
  const query = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions, enabled: apiEnabled })
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
  const linkSampleType = useMutation({
    mutationFn: (item: ShippingContainerDefinition) => linkTransportationKitSampleType(item.id, linkedSampleTypeId, item.version),
    onSuccess: async () => {
      setLinking(null)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['shipping-container-definitions'] }),
        client.invalidateQueries({ queryKey: ['shipping-container'] }),
        client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }),
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
  const latest = allLatest.filter(item => !sampleType || item.sampleTypeAnchorId && familyIds.has(item.sampleTypeAnchorId))
  const unlinkedNamedCount = allLatest.filter(item => !item.sampleTypeAnchorId && item.finishedKitProductId).length
  const historicalUnlinkedCount = allLatest.filter(item => !item.sampleTypeAnchorId && !item.finishedKitProductId).length
  const sampleTypeChoices = [...new Map([...configuration.sampleTypes].sort((a, b) => a.revision - b.revision).map(value => [value.definitionKey, value])).values()]
  const activeByKey = new Map(latestContainerRevisions((query.data ?? []).filter(value => containerEffectiveState(value) === 'Active now')).map(value => [value.definitionKey, value]))
  const deactivatableRevisions = (query.data ?? []).filter(value => value.isActive && !value.deactivatedAt && containerEffectiveState(value) !== 'Ended')
  const affectedSpecifications = latest.filter(value => containerDependencyWarnings(value, configuration).length > 0)
  const needle = (search.containerSearch ?? '').trim().toLowerCase()
  const visibleByActivation = latest.filter(item => search.containerShowInactive || item.isActive && !item.deactivatedAt)
  const filtered = visibleByActivation.filter(item => (!needle || `${item.commonName} ${item.sku} ${item.supplierName ?? ''} ${item.supplierProductNumber ?? ''}`.toLowerCase().includes(needle))
    && (search.containerStatus === 'all' || (search.containerStatus === 'active' ? activeByKey.has(item.definitionKey) : !activeByKey.has(item.definitionKey))))
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const page = Math.min(search.containerPage ?? 1, pageCount)
  const items = filtered.slice((page - 1) * pageSize, page * pageSize)
  async function saved(item: ShippingContainerDefinition) {
    setEditing(undefined)
    await client.invalidateQueries({ queryKey: ['shipping-container-definitions'] })
    await navigate({ to: '/order-configuration/shipping-containers/$containerId', params: { containerId: item.id }, search: { ...search, configurationSection: 'shipping' } })
  }
  function openDeactivation(item: ShippingContainerDefinition) {
    deactivate.reset()
    setDeactivation(item)
  }
  function openLink(item: ShippingContainerDefinition) {
    linkSampleType.reset()
    setLinkedSampleTypeId('')
    setLinking(item)
  }
  return <Card id="container-sizes" className="gap-0 py-0"><CardHeader className="grid-cols-1 gap-x-3 border-b bg-muted/50 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
    <CardTitle className="min-w-0">Kit specifications</CardTitle>
    <div className="flex flex-wrap gap-2 sm:col-start-2 sm:row-start-1 sm:justify-self-end"><Button variant="outline" disabled={!apiEnabled || !query.data} onClick={() => setPreview(null)}><SearchCheck aria-hidden="true" />Preview recommendation</Button><Button disabled={!apiEnabled} onClick={() => setEditing(null)}><Plus aria-hidden="true" />Add Transportation kit</Button></div>
    <CardDescription className="sm:col-span-full">{sampleType ? `${sampleType.name} can use multiple Transportation kits, each with its own capacity and preparation.` : 'Each Transportation kit may be linked once to one Sample type. Open a kit to review its preparation, bill of materials, and revisions.'}</CardDescription>
    <div className="mt-3 flex flex-wrap items-center gap-3 sm:col-span-full"><div className="min-w-48 flex-1"><Label htmlFor="container-search" className="sr-only">Search kit specifications</Label><Input id="container-search" value={searchText} onChange={event => setSearchText(event.target.value)} placeholder="Search by common name or SKU" /></div><div><Label htmlFor="container-status" className="sr-only">Availability</Label><select id="container-status" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" value={search.containerStatus} onChange={event => changeSearch({ containerStatus: event.target.value as ShippingContainerListSearch['containerStatus'], containerPage: 1 })}><option value="all">All availability</option><option value="active">Available now</option><option value="inactive">Not available now</option></select></div><div className="flex items-center gap-2"><Checkbox id="container-show-inactive" checked={Boolean(search.containerShowInactive)} onCheckedChange={checked => changeSearch({ containerShowInactive: checked === true, containerPage: 1 })} /><Label htmlFor="container-show-inactive" className="cursor-pointer">Show inactive</Label></div>{needle || search.containerStatus !== 'all' || search.containerShowInactive ? <Button variant="ghost" onClick={() => { setSearchText(''); changeSearch({ containerSearch: undefined, containerStatus: 'all', containerShowInactive: false, containerPage: 1 }) }}>Clear all</Button> : null}</div>
  </CardHeader><CardContent className="space-y-4 p-4">
    {affectedSpecifications.length ? <Alert variant="destructive"><AlertTitle>{affectedSpecifications.length} Active kit {affectedSpecifications.length === 1 ? 'specification needs' : 'specifications need'} attention</AlertTitle><AlertDescription>Review the linked Sample type and kit preparation before using these specifications for new work.</AlertDescription></Alert> : null}
    {query.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading kit specifications…</p> : null}
    {query.error ? <Alert variant="destructive"><AlertTitle>Kit specifications unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Refresh the list and try again.')} <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : null}
    {query.data && items.length ? <div className="overflow-x-auto" role="region" aria-label="Kit specifications list"><table className="w-full min-w-[28rem] table-fixed text-left text-sm">
      <thead className="border-b text-xs text-muted-foreground"><tr><th className="pb-2 pr-3 font-medium">Container</th><th className="w-16 pb-2 pr-2 font-medium sm:w-24">Usable tubes</th><th className="w-24 pb-2"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody className="divide-y">{items.map(item => {
        const deactivationTargets = deactivatableRevisions.filter(value => value.definitionKey === item.definitionKey).sort((a, b) => b.revision - a.revision)
        const warnings = containerDependencyWarnings(item, configuration)
        return <tr key={item.id}>
        <td className="py-3 pr-3"><div className="flex flex-wrap items-center gap-2"><Link className={`wrap-anywhere ${recordLinkClassName}`} to="/order-configuration/shipping-containers/$containerId" params={{ containerId: item.id }} search={{ ...search, configurationSection: 'shipping' }}>{item.commonName}</Link><Badge variant="outline" className="h-auto max-w-full whitespace-normal break-all">SKU {item.sku} · rev {item.revision}</Badge><ShippingActivationBadge item={item} /></div>{!sampleType ? <p className="mt-1 text-xs text-muted-foreground">Sample type: {configuration.sampleTypes.find(value => value.id === item.sampleTypeAnchorId)?.name ?? (item.sampleTypeAnchorId ? 'Unavailable' : 'None')}</p> : null}{activeByKey.has(item.definitionKey) && activeByKey.get(item.definitionKey)!.id !== item.id ? <p className="mt-1 text-xs text-muted-foreground">Revision {activeByKey.get(item.definitionKey)!.revision} active</p> : null}{warnings.length ? <p role="alert" className="mt-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"><strong>Needs attention: </strong>Review this kit's Sample type and preparation before new work.</p> : null}</td>
        <td className="py-3 pr-2">{item.tubeCapacity}</td>
        <td className="py-3"><DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" aria-label={`Actions for ${item.commonName}`} onPointerDown={event => { actionsTriggerRef.current = event.currentTarget }} onFocus={event => { actionsTriggerRef.current = event.currentTarget }}>Actions<ChevronDown aria-hidden="true" className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]"><DropdownMenuItem onSelect={() => setPreview(item)}><SearchCheck aria-hidden="true" />Preview recommendation</DropdownMenuItem><DropdownMenuItem onSelect={() => setEditing(item)}><FilePenLine aria-hidden="true" />Create revision</DropdownMenuItem>{!item.sampleTypeAnchorId ? <DropdownMenuItem onSelect={() => openLink(item)}><Link2 aria-hidden="true" />Link Sample type</DropdownMenuItem> : null}{deactivationTargets.map(target => <DropdownMenuItem key={target.id} variant="destructive" onSelect={() => openDeactivation(target)}>{target.id === item.id ? 'Deactivate' : `Deactivate active specification (rev ${target.revision})`}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></td>
      </tr>})}</tbody>
    </table></div> : null}
    {query.data && !items.length ? <div className="py-6 text-center text-sm text-muted-foreground">{!latest.length && sampleType ? <p>No Transportation kit is linked to this Sample type. {unlinkedNamedCount > 0 ? <><Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: 'containers', containerShowInactive: true }}>Review {unlinkedNamedCount} unlinked named {unlinkedNamedCount === 1 ? 'kit' : 'kits'}</Link> and use its Actions menu to link it once.</> : historicalUnlinkedCount > 0 ? <>{historicalUnlinkedCount} historical container {historicalUnlinkedCount === 1 ? 'definition exists' : 'definitions exist'} without a named Phaeno kit product. They cannot support new Orders; add a new named Transportation kit.</> : 'Add a named Phaeno kit product and its approved shipping specification.'}</p> : !latest.length ? <p>No kit specifications are configured. Add a named Phaeno kit product and its approved shipping specification.</p> : !visibleByActivation.length && !needle && search.containerStatus === 'all' ? <p>All kit specifications have an inactive latest revision. Select Show inactive to review them.</p> : <p>No kit specifications match these filters.</p>}</div> : null}
    {query.data && filtered.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>{filtered.length} specifications · Page {page} of {pageCount}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => changeSearch({ containerPage: page - 1 })}>Previous</Button><Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => changeSearch({ containerPage: page + 1 })}>Next</Button></div></div> : null}
    {editing !== undefined ? <ShippingContainerEditor source={editing} configuration={configuration} initialSampleTypeDefinitionKey={sampleType?.definitionKey} onClose={() => setEditing(undefined)} onSaved={saved} /> : null}
    {preview !== undefined ? <ContainerRecommendationDialog definitions={query.data ?? []} configuration={configuration} draftDefinition={preview ?? undefined} onClose={() => setPreview(undefined)} /> : null}
    {linking ? <Dialog open onOpenChange={open => { if (!open && !linkSampleType.isPending) setLinking(null) }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); (actionsTriggerRef.current?.isConnected ? actionsTriggerRef.current : document.getElementById('container-search'))?.focus() }}><DialogHeader><DialogTitle>Link Sample type</DialogTitle><DialogDescription>Choose the one Sample type for {linking.commonName}. This relationship cannot be changed after saving and does not create a kit revision.</DialogDescription></DialogHeader>{!linking.finishedKitProductId ? <Alert><AlertTitle>Historical container</AlertTitle><AlertDescription>Linking this container will not make it available for new Orders. Add a named Phaeno Transportation kit for new work.</AlertDescription></Alert> : null}<div className="space-y-2"><Label htmlFor="kit-list-link-sample-type">Sample type *</Label><select id="kit-list-link-sample-type" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" value={linkedSampleTypeId} onChange={event => setLinkedSampleTypeId(event.target.value)} disabled={linkSampleType.isPending}><option value="">Choose a Sample type…</option>{sampleTypeChoices.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></div>{linkSampleType.error ? <Alert variant="destructive"><AlertTitle>Sample type was not linked</AlertTitle><AlertDescription>{getOrderErrorMessage(linkSampleType.error, 'Refresh this kit and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter><Button variant="outline" disabled={linkSampleType.isPending} onClick={() => setLinking(null)}>Cancel</Button><Button disabled={!linkedSampleTypeId || linkSampleType.isPending} onClick={() => linkSampleType.mutate(linking)}>{linkSampleType.isPending ? 'Saving…' : 'Link Sample type'}</Button></RequiredDialogFooter></DialogContent></Dialog> : null}
    {deactivation ? <Dialog open onOpenChange={open => { if (!open && !deactivate.isPending) setDeactivation(null) }}><DialogContent showCloseButton={!deactivate.isPending} onCloseAutoFocus={event => { event.preventDefault(); (actionsTriggerRef.current?.isConnected ? actionsTriggerRef.current : document.getElementById('container-search'))?.focus() }}>
      <DialogHeader><DialogTitle>Deactivate kit specification?</DialogTitle><DialogDescription>{deactivation.commonName} · SKU {deactivation.sku} · revision {deactivation.revision} will no longer be eligible for new recommendations. No older revision is reactivated automatically. Existing kits, confirmed shipments, and manifests keep their recorded facts.</DialogDescription></DialogHeader>
      {deactivate.error ? <Alert variant="destructive"><AlertTitle>Kit specification was not deactivated</AlertTitle><AlertDescription>{getOrderErrorMessage(deactivate.error, 'Refresh the kit specifications and try again.')}</AlertDescription></Alert> : null}
      <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={deactivate.isPending} onClick={() => setDeactivation(null)}>Cancel</Button><Button type="button" variant="destructive" disabled={deactivate.isPending} onClick={() => deactivate.mutate(deactivation)}>{deactivate.isPending ? 'Deactivating…' : 'Deactivate'}</Button></RequiredDialogFooter>
    </DialogContent></Dialog> : null}
  </CardContent></Card>
}
