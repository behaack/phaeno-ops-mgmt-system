import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import { getSampleShippingConfiguration } from '#/api/sample-shipping'
import { deactivateShippingContainerDefinition, getShippingContainerDefinition, getShippingContainerDefinitions, getShippingContainerRevisions, type ShippingContainerDefinition } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu as DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { usePhaenoSession } from '#/features/auth/session-context'
import { ContainerRecommendationDialog } from './ContainerRecommendationDialog'
import { ShippingContainerEditor } from './ShippingContainerEditor'
import { parseShippingContainerListSearch } from './shipping-container-navigation'
import { containerDateTime, containerEffectiveState } from './shipping-container-utils'

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
  const deactivate = useMutation({
    mutationFn: (value: ShippingContainerDefinition) => deactivateShippingContainerDefinition(value.id, value.version),
    onSuccess: async () => {
      setDeactivation(null)
      await Promise.all([client.invalidateQueries({ queryKey: ['shipping-container'] }), client.invalidateQueries({ queryKey: ['shipping-container-revisions'] }), client.invalidateQueries({ queryKey: ['shipping-container-definitions'] })])
    },
  })
  if (!canManage) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Container configuration unavailable</AlertTitle><AlertDescription>A Phaeno configuration administrator is required.</AlertDescription></Alert></main>
  if (!enabled) return <main className="page-wrap px-4 py-8"><p>Use a connected Phaeno session to review container sizes.</p></main>
  if (query.isLoading) return <main className="page-wrap px-4 py-8"><p role="status">Loading container size…</p></main>
  if (!query.data || query.error) return <main className="page-wrap px-4 py-8"><Alert variant="destructive"><AlertTitle>Container size unavailable</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'The requested size could not be loaded.')} <Button variant="outline" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert><Button asChild variant="outline" className="mt-4"><Link to="/order-configuration" search={search}>Back to container sizes</Link></Button></main>
  const item = query.data
  const revisions = [...(history.data ?? [])].sort((a, b) => b.revision - a.revision)
  const isLatest = Boolean(revisions.length && revisions[0].id === item.id)
  async function saved(value: ShippingContainerDefinition) {
    setEditing(null)
    await Promise.all([client.invalidateQueries({ queryKey: ['shipping-container-definitions'] }), client.invalidateQueries({ queryKey: ['shipping-container'] }), client.invalidateQueries({ queryKey: ['shipping-container-revisions'] })])
    await navigate({ to: '/order-configuration/shipping-containers/$containerId', params: { containerId: value.id }, search })
  }
  return <main className="page-wrap px-4 py-8"><Link className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2" to="/order-configuration" search={search} hash="container-sizes"><ArrowLeft aria-hidden="true" className="size-4" />Back to container sizes</Link>
    <header className="my-5 flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="wrap-anywhere text-2xl font-semibold">{item.commonName}</h1><Badge variant="outline">{containerEffectiveState(item)}</Badge></div><p className="mt-2 wrap-anywhere text-sm text-muted-foreground">SKU {item.sku} · revision {item.revision} · {item.tubeCapacity} tubes</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!configuration.data || !catalog.data} onClick={() => setPreview(item)}>Preview recommendation</Button><Button disabled={!configuration.data || !isLatest} onClick={() => setEditing(item)}>Create revision</Button>{item.isActive && containerEffectiveState(item) !== 'Ended' ? <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline">Actions</Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem variant="destructive" onSelect={() => { deactivate.reset(); setDeactivation(item) }}>Deactivate revision</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : null}</div></header>
    {configuration.error || history.error || catalog.error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Some configuration could not be loaded</AlertTitle><AlertDescription>{getOrderErrorMessage(configuration.error ?? history.error ?? catalog.error, 'Refresh before creating a revision or previewing a recommendation.')}</AlertDescription></Alert> : null}
    {revisions.length > 0 && !isLatest ? <p className="mb-5 rounded-md border bg-muted/40 p-3 text-sm">This is a historical revision. <Link className="text-primary underline" to="/order-configuration/shipping-containers/$containerId" params={{ containerId: revisions[0].id }} search={search}>Open revision {revisions[0].revision}</Link> to make changes.</p> : null}
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]"><div className="space-y-5"><Card><CardHeader><CardTitle>Container details</CardTitle></CardHeader><CardContent><dl className="divide-y text-sm"><Fact label="Usable tube capacity" value={`${item.tubeCapacity} tubes`} /><Fact label="Supplier" value={item.supplierName ?? 'Not specified'} /><Fact label="Supplier product number" value={item.supplierProductNumber ?? 'Not specified'} /><Fact label="Display order" value={String(item.displayOrder)} /><Fact label="Effective from" value={containerDateTime(item.effectiveFrom)} /><Fact label="Effective through" value={item.effectiveTo ? containerDateTime(item.effectiveTo) : 'No end date'} /></dl></CardContent></Card>
      <Card><CardHeader><CardTitle>Compatible sample and handling rules</CardTitle></CardHeader><CardContent><ul className="divide-y text-sm">{item.compatibilities.map(pair => { const rule = configuration.data?.instructionRules.find(value => value.id === pair.instructionRuleId); return <li key={`${pair.sampleTypeDefinitionId}-${pair.instructionRuleId}`} className="py-3">{rule ? <><p className="font-medium">{rule.sampleTypeName} · {rule.destinationName}</p><p className="mt-1 text-xs text-muted-foreground">{rule.compatibilityGroup} · rule revision {rule.revision}{rule.isActive ? '' : ' · inactive'}</p></> : <p className="text-muted-foreground">{configuration.isLoading ? 'Loading handling rule…' : 'Referenced handling rule is unavailable.'}</p>}</li> })}</ul>{!item.compatibilities.length ? <p className="text-sm text-muted-foreground">No compatible handling rules are configured.</p> : null}</CardContent></Card>
      <Card><CardHeader><CardTitle>Packing instructions</CardTitle></CardHeader><CardContent><p className="whitespace-pre-wrap wrap-anywhere text-sm">{item.packingInstructions || 'No additional container-specific instructions.'}</p></CardContent></Card></div>
      <Card><CardHeader><CardTitle>Revision history</CardTitle></CardHeader><CardContent><p className="mb-3 text-xs text-muted-foreground">Confirmed shipments and manifests retain their original container facts.</p><ul className="divide-y text-sm">{revisions.map(value => <li key={value.id} className="py-3"><Link className="font-medium text-primary underline" aria-current={value.id === item.id ? 'page' : undefined} to="/order-configuration/shipping-containers/$containerId" params={{ containerId: value.id }} search={search}>Revision {value.revision}</Link><p className="mt-1 text-xs text-muted-foreground">{containerEffectiveState(value)} · {value.tubeCapacity} tubes</p><p className="mt-1 text-xs text-muted-foreground">From {containerDateTime(value.effectiveFrom)}</p></li>)}</ul>{history.isLoading ? <p role="status" className="text-sm">Loading revisions…</p> : null}</CardContent></Card></div>
    {editing && configuration.data ? <ShippingContainerEditor source={editing} configuration={configuration.data} onClose={() => setEditing(null)} onSaved={saved} /> : null}
    {preview && configuration.data ? <ContainerRecommendationDialog definitions={catalog.data ?? []} configuration={configuration.data} draftDefinition={preview} onClose={() => setPreview(null)} /> : null}
    <Dialog open={Boolean(deactivation)} onOpenChange={open => { if (!open && !deactivate.isPending) setDeactivation(null) }}><DialogContent><DialogHeader><DialogTitle>Deactivate container revision?</DialogTitle><DialogDescription>{deactivation?.commonName} · SKU {deactivation?.sku} · revision {deactivation?.revision} will no longer be eligible for new recommendations. Existing kits, confirmed shipments, and manifests keep their recorded facts.</DialogDescription></DialogHeader>{deactivate.error ? <Alert variant="destructive"><AlertTitle>Revision was not deactivated</AlertTitle><AlertDescription>{getOrderErrorMessage(deactivate.error, 'Refresh the current revision and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button variant="outline" disabled={deactivate.isPending} onClick={() => setDeactivation(null)}>Cancel</Button><Button variant="destructive" disabled={deactivate.isPending} onClick={() => { if (deactivation) deactivate.mutate(deactivation) }}>{deactivate.isPending ? 'Deactivating…' : 'Deactivate revision'}</Button></RequiredDialogFooter></DialogContent></Dialog>
  </main>
}
function Fact({ label, value }: { label: string; value: string }) { return <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 wrap-anywhere">{value}</dd></div> }
