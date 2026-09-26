import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, ChevronDown, FilePenLine, Link2, SearchCheck } from 'lucide-react'
import { useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import { getSampleShippingConfiguration } from '#/api/sample-shipping'
import { deactivateShippingContainerDefinition, getShippingContainerDefinition, getShippingContainerDefinitions, getShippingContainerRevisions, linkTransportationKitSampleType, type ShippingContainerDefinition } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu as DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { Label } from '#/components/ui/label'
import { recordLinkClassName } from '#/components/ui/record-link'
import { usePhaenoSession } from '#/features/auth/session-context'
import { ContainerRecommendationDialog } from './ContainerRecommendationDialog'
import { ShippingContainerEditor } from './ShippingContainerEditor'
import { ShippingKitContents } from './ShippingKitContents'
import { parseShippingContainerListSearch } from './shipping-container-navigation'
import { containerDateTime, containerEffectiveState } from './shipping-container-utils'
import { containerDependencyWarnings } from './shipping-dependency-health'

export function ShippingContainerDetailPage({ containerId }: { containerId: string }) {
  const { authProvider, session } = usePhaenoSession()
  const client = useQueryClient()
  const navigate = useNavigate()
  const search = { ...parseShippingContainerListSearch(useSearch({ strict: false })), configurationSection: 'shipping' as const }
  const canManage = Boolean(session?.capabilities.canManageOrderConfiguration)
  const enabled = canManage && authProvider !== 'mock'
  const query = useQuery({ queryKey: ['shipping-container', containerId], queryFn: () => getShippingContainerDefinition(containerId), enabled })
  const history = useQuery({ queryKey: ['shipping-container-revisions', containerId], queryFn: () => getShippingContainerRevisions(containerId), enabled })
  const configuration = useQuery({ queryKey: ['sample-shipping-configuration'], queryFn: getSampleShippingConfiguration, enabled })
  const catalog = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions, enabled })
  const [editing, setEditing] = useState<ShippingContainerDefinition | null>(null)
  const [preview, setPreview] = useState<ShippingContainerDefinition | null>(null)
  const [deactivation, setDeactivation] = useState<ShippingContainerDefinition | null>(null)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkedSampleTypeId, setLinkedSampleTypeId] = useState('')
  const linkSampleType = useMutation({
    mutationFn: () => linkTransportationKitSampleType(containerId, linkedSampleTypeId, query.data!.version),
    onSuccess: async () => {
      setLinkOpen(false)
      await Promise.all([client.invalidateQueries({ queryKey: ['shipping-container'] }), client.invalidateQueries({ queryKey: ['shipping-container-definitions'] }), client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] })])
    },
  })
  const deactivate = useMutation({
    mutationFn: (value: ShippingContainerDefinition) => deactivateShippingContainerDefinition(value.id, value.version),
    onSuccess: async () => {
      setDeactivation(null)
      await Promise.all([client.invalidateQueries({ queryKey: ['shipping-container'] }), client.invalidateQueries({ queryKey: ['shipping-container-revisions'] }), client.invalidateQueries({ queryKey: ['shipping-container-definitions'] })])
    },
  })
  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Container configuration unavailable</AlertTitle><AlertDescription>A Phaeno configuration administrator is required.</AlertDescription></Alert></main>
  if (!enabled) return <main className="page-wrap px-4 py-8"><p>Use a connected Phaeno session to review kit specifications.</p></main>
  if (query.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading kit specification…</p></main>
  if (!query.data || query.error) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Kit specification unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'The requested kit specification could not be loaded.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert><Button asChild variant="outline" className="mt-4"><Link to="/sample-shipping-settings" search={{ ...parseShippingContainerListSearch(search), shippingSection: 'containers' }}>Back to kit specifications</Link></Button></main>
  const item = query.data
  const sampleType = configuration.data?.sampleTypes.find(value => value.id === item.sampleTypeAnchorId)
  const sampleTypeChoices = [...new Map((configuration.data?.sampleTypes ?? []).sort((a, b) => a.revision - b.revision).map(value => [value.definitionKey, value])).values()]
  const dependencyWarnings = configuration.data ? containerDependencyWarnings(item, configuration.data) : []
  const revisions = [...(history.data ?? [])].sort((a, b) => b.revision - a.revision)
  const isLatest = Boolean(revisions.length && revisions[0].id === item.id)
  const deactivationTargets = (isLatest ? revisions : [item]).filter(value => value.isActive && !value.deactivatedAt && containerEffectiveState(value) !== 'Ended')
  async function saved(value: ShippingContainerDefinition) {
    setEditing(null)
    await Promise.all([client.invalidateQueries({ queryKey: ['shipping-container-definitions'] }), client.invalidateQueries({ queryKey: ['shipping-container'] }), client.invalidateQueries({ queryKey: ['shipping-container-revisions'] })])
    await navigate({ to: '/order-configuration/shipping-containers/$containerId', params: { containerId: value.id }, search })
  }
  return <main className="page-wrap px-4 py-8"><Link className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2" to="/sample-shipping-settings" search={{ ...parseShippingContainerListSearch(search), shippingSection: sampleType ? 'sample-types' : 'containers', sampleTypeId: sampleType?.id }} hash="container-sizes"><ArrowLeft aria-hidden="true" className="size-4" />Back to {sampleType ? `${sampleType.name} kits` : 'kit specifications'}</Link>
    <header className="my-5 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="wrap-anywhere text-2xl font-semibold">{item.commonName}</h1><Badge variant="outline">{containerEffectiveState(item)}</Badge></div><p className="mt-2 wrap-anywhere text-sm text-muted-foreground">SKU {item.sku} · revision {item.revision} · {item.tubeCapacity} tubes</p></div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions<ChevronDown aria-hidden="true" data-icon="inline-end" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]"><DropdownMenuItem disabled={!configuration.data || !catalog.data} onSelect={() => setPreview(item)}><SearchCheck aria-hidden="true" />Preview recommendation</DropdownMenuItem><DropdownMenuItem disabled={!configuration.data || !isLatest} onSelect={() => setEditing(item)}><FilePenLine aria-hidden="true" />Create revision</DropdownMenuItem>{!item.sampleTypeAnchorId && isLatest ? <DropdownMenuItem onSelect={() => { setLinkedSampleTypeId(''); linkSampleType.reset(); setLinkOpen(true) }}><Link2 aria-hidden="true" />Link Sample type</DropdownMenuItem> : null}{deactivationTargets.map(target => <DropdownMenuItem key={target.id} variant="destructive" onSelect={() => { deactivate.reset(); setDeactivation(target) }}>{target.id === item.id ? 'Deactivate' : `Deactivate active specification (rev ${target.revision})`}</DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu></header>
    {configuration.error || history.error || catalog.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Some configuration could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(configuration.error ?? history.error ?? catalog.error, 'Refresh before creating a revision or previewing a recommendation.')}</AlertDescription></Alert> : null}
    {dependencyWarnings.length ? <Alert variant="destructive" className="mb-5"><AlertTitle>Specification needs attention</AlertTitle><AlertDescription><p>Review the linked Sample type and repair unavailable dependencies. Create a new specification revision to change kit content.</p><ul className="mt-2 list-disc pl-5">{dependencyWarnings.map((warning, index) => <li key={index}>{warning.message}</li>)}</ul></AlertDescription></Alert> : null}
    {revisions.length > 0 && !isLatest ? <p className="mb-5 rounded-md border bg-muted/40 p-3 text-sm">This is a historical revision. <Link className="text-primary underline" to="/order-configuration/shipping-containers/$containerId" params={{ containerId: revisions[0].id }} search={search}>Open revision {revisions[0].revision}</Link> to make changes.</p> : null}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]"><div className="space-y-5"><Card><CardHeader><CardTitle>Transportation kit details</CardTitle></CardHeader><CardContent><dl className="divide-y text-sm"><div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">Sample type</dt><dd>{sampleType ? <Link className={recordLinkClassName} to="/sample-shipping-settings" search={{ shippingSection: 'sample-types', sampleTypeId: sampleType.id }}>{sampleType.name}</Link> : item.sampleTypeAnchorId ? <span role="alert" className="text-destructive">Linked Sample type unavailable</span> : 'None — link a Sample type before use'}</dd></div><Fact label="Usable tube capacity" value={`${item.tubeCapacity} tubes`} /><Fact label="Dry ice" value={item.dryIceQuantity ? `${item.dryIceQuantity} ${item.dryIceUnit ?? ''}` : 'None'} /><Fact label="Display order" value={String(item.displayOrder)} /><Fact label="Effective from" value={containerDateTime(item.effectiveFrom)} /><Fact label="Effective through" value={item.effectiveTo ? containerDateTime(item.effectiveTo) : 'No end date'} /></dl></CardContent></Card>
      <Card><CardHeader><CardTitle>Bill of materials</CardTitle></CardHeader><CardContent>
        {item.kitContents?.length ? <ShippingKitContents contents={item.kitContents} /> : <div className="space-y-2 text-sm text-muted-foreground"><p>No product list was recorded for this revision. Use Actions → Create revision to add supplier products and quantities.</p>{item.supplierName ? <p>Earlier container reference: {item.supplierName}{item.supplierProductNumber ? ` · ${item.supplierProductNumber}` : ''}</p> : null}</div>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Kit preparation</CardTitle></CardHeader><CardContent><dl className="space-y-4 text-sm"><div><dt className="font-medium">Temperature control</dt><dd className="mt-1 whitespace-pre-wrap wrap-anywhere">{item.temperatureControlInstructions || 'Not recorded.'}</dd></div><div><dt className="font-medium">Packing instructions</dt><dd className="mt-1 whitespace-pre-wrap wrap-anywhere">{item.packingInstructions || 'Not recorded.'}</dd></div></dl></CardContent></Card>
      {item.packingInstructions ? <Card><CardHeader><CardTitle>Earlier container notes</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap wrap-anywhere text-sm">{item.packingInstructions}</p></CardContent></Card> : null}</div>
      </div>
    <Card className="mt-5"><CardHeader><CardTitle>Revision history</CardTitle></CardHeader><CardContent><p className="mb-3 text-xs text-muted-foreground">Confirmed shipments and manifests retain their original container facts.</p><ul className="divide-y text-sm">{revisions.map(value => <li key={value.id} className="py-3"><Link className={recordLinkClassName} aria-current={value.id === item.id ? 'page' : undefined} to="/order-configuration/shipping-containers/$containerId" params={{ containerId: value.id }} search={search}>Revision {value.revision}</Link><p className="mt-1 text-xs text-muted-foreground">{containerEffectiveState(value)} · {value.tubeCapacity} tubes</p><p className="mt-1 text-xs text-muted-foreground">From {containerDateTime(value.effectiveFrom)}</p></li>)}</ul>{history.isLoading ? <p role="status" className="text-sm">Loading revisions…</p> : null}</CardContent></Card>
    {editing && configuration.data ? <ShippingContainerEditor source={editing} configuration={configuration.data} onClose={() => setEditing(null)} onSaved={saved} /> : null}
    {preview && configuration.data ? <ContainerRecommendationDialog definitions={catalog.data ?? []} configuration={configuration.data} draftDefinition={preview} onClose={() => setPreview(null)} /> : null}
    <Dialog open={linkOpen} onOpenChange={open => { if (!open && !linkSampleType.isPending) setLinkOpen(false) }}><DialogContent><DialogHeader><DialogTitle>Link Sample type</DialogTitle><DialogDescription>Choose the one Sample type for this Transportation kit. This relationship cannot be changed after saving and does not create a kit revision.</DialogDescription></DialogHeader>{!item.finishedKitProductId ? <Alert><AlertTitle>Historical container</AlertTitle><AlertDescription>Linking this container will not make it available for new Orders. Add a named Phaeno Transportation kit for new work.</AlertDescription></Alert> : null}<div className="space-y-2"><Label htmlFor="kit-link-sample-type">Sample type *</Label><select id="kit-link-sample-type" className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" value={linkedSampleTypeId} onChange={event => setLinkedSampleTypeId(event.target.value)} disabled={linkSampleType.isPending}><option value="">Choose a Sample type…</option>{sampleTypeChoices.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></div>{linkSampleType.error ? <Alert variant="destructive"><AlertTitle>Sample type was not linked</AlertTitle><AlertDescription>{getOrderErrorMessage(linkSampleType.error, 'Refresh this kit and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter><Button variant="outline" disabled={linkSampleType.isPending} onClick={() => setLinkOpen(false)}>Cancel</Button><Button disabled={!linkedSampleTypeId || linkSampleType.isPending} onClick={() => linkSampleType.mutate()}>{linkSampleType.isPending ? 'Saving…' : 'Link Sample type'}</Button></RequiredDialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(deactivation)} onOpenChange={open => { if (!open && !deactivate.isPending) setDeactivation(null) }}><DialogContent><DialogHeader><DialogTitle>Deactivate kit specification?</DialogTitle><DialogDescription>{deactivation?.commonName} · SKU {deactivation?.sku} · revision {deactivation?.revision} will no longer be eligible for new recommendations. No older revision is reactivated automatically. Existing kits, confirmed shipments, and manifests keep their recorded facts.</DialogDescription></DialogHeader>{deactivate.error ? <Alert variant="destructive"><AlertTitle>Kit specification was not deactivated</AlertTitle><AlertDescription>{getOrderErrorMessage(deactivate.error, 'Refresh the current kit specification and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={deactivate.isPending} onClick={() => setDeactivation(null)}>Cancel</Button><Button variant="destructive" disabled={deactivate.isPending} onClick={() => { if (deactivation) deactivate.mutate(deactivation) }}>{deactivate.isPending ? 'Deactivating…' : 'Deactivate'}</Button></RequiredDialogFooter></DialogContent></Dialog>
  </main>
}
function Fact({ label, value }: { label: string; value: string }) { return <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 wrap-anywhere">{value}</dd></div> }
