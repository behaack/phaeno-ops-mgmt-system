import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FilePenLine } from 'lucide-react'
import { useRef, useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import { discardSampleTypeDraft, setSampleTypeStatus, type SampleTypeDefinition } from '#/api/sample-shipping'
import { getShippingContainerDefinitions } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { RequiredDialogFooter } from '#/components/ui/required-field'

type StatusChange = { item: SampleTypeDefinition; isActive: boolean }
const hasNotEnded = (item: SampleTypeDefinition) => !item.effectiveTo || new Date(item.effectiveTo).getTime() > Date.now()

export function SampleTypeActions({ item, revisions, onCreateRevision, onStatusChanged }: {
  item: SampleTypeDefinition
  revisions: SampleTypeDefinition[]
  onCreateRevision: (item: SampleTypeDefinition) => void
  onStatusChanged?: (item: SampleTypeDefinition, isActive: boolean) => void
}) {
  const client = useQueryClient()
  const trigger = useRef<HTMLButtonElement>(null)
  const fallback = useRef<HTMLDivElement>(null)
  const [change, setChange] = useState<StatusChange | null>(null)
  const [discarding, setDiscarding] = useState(false)
  const kits = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions, enabled: Boolean(change && !change.isActive) })
  const latest = !revisions.some(value => value.revision > item.revision)
  const draft = revisions.find(value => value.lifecycle === 'Draft')
  const latestReleased = [...revisions].filter(value => value.lifecycle === 'Released' || value.lifecycle === 'Superseded' || value.lifecycle === 'Deactivated').sort((a, b) => b.revision - a.revision)[0]
  const earlierActive = latest ? revisions.filter(value => value.id !== item.id && value.isActive && hasNotEnded(value)) : []
  const mutation = useMutation({
    mutationFn: ({ item: target, isActive }: StatusChange) => setSampleTypeStatus(target.id, { isActive, version: target.version }),
    onSuccess: async (_result, variables) => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setChange(null); onStatusChanged?.(variables.item, variables.isActive) },
  })
  const discardMutation = useMutation({
    mutationFn: () => discardSampleTypeDraft(item.id, item.version),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setDiscarding(false) },
  })
  function choose(target: SampleTypeDefinition, isActive: boolean) { mutation.reset(); setChange({ item: target, isActive }) }
  const future = change && new Date(change.item.effectiveFrom).getTime() > Date.now()
  const affected = change && !change.isActive ? (kits.data ?? []).filter(kit => kit.sampleTypeAnchorId && revisions.some(revision => revision.id === kit.sampleTypeAnchorId) && kit.isActive) : []
  if (!latest && !item.isActive && latestReleased?.id !== item.id) return null
  return <div ref={fallback} tabIndex={-1} aria-label={`${item.name} actions`} className="shrink-0">
    <ActionMenu><DropdownMenuTrigger asChild><Button ref={trigger} type="button" variant="outline">Actions<ChevronDown data-icon="inline-end" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">
        {draft ? <DropdownMenuItem onSelect={() => onCreateRevision(draft)}><FilePenLine aria-hidden="true" />Edit Draft revision {draft.revision}</DropdownMenuItem> : latest || latestReleased?.id === item.id ? <DropdownMenuItem onSelect={() => onCreateRevision(latestReleased ?? item)}><FilePenLine aria-hidden="true" />Create revision</DropdownMenuItem> : null}
        {item.lifecycle === 'Draft' && hasNotEnded(item) ? <DropdownMenuItem onSelect={() => choose(item, true)}>Activate</DropdownMenuItem> : null}
        {item.lifecycle === 'Draft' ? <DropdownMenuItem variant="destructive" onSelect={() => setDiscarding(true)}>Discard</DropdownMenuItem> : null}
        {item.isActive ? <DropdownMenuItem variant="destructive" onSelect={() => choose(item, false)}>Deactivate</DropdownMenuItem> : null}
        {earlierActive.map(value => <DropdownMenuItem key={value.id} variant="destructive" onSelect={() => choose(value, false)}>Deactivate revision {value.revision}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </ActionMenu>
    <Dialog open={Boolean(change)} onOpenChange={open => { if (!open && !mutation.isPending) setChange(null) }}>
      <DialogContent aria-describedby="sample-type-status-summary sample-type-status-consequences" showCloseButton={!mutation.isPending} onCloseAutoFocus={event => { event.preventDefault(); (trigger.current ?? fallback.current)?.focus() }}>
        <DialogHeader className="pr-[var(--dialog-inset)]"><DialogTitle className="pr-8">{change?.isActive ? 'Activate sample type?' : 'Deactivate sample type?'}</DialogTitle>
          <DialogDescription id="sample-type-status-summary" className="pr-8">{change?.item.name} · revision {change?.item.revision}</DialogDescription>
        </DialogHeader>
        <div id="sample-type-status-consequences" className="space-y-2 text-sm">
          {change?.isActive
            ? <><p>This revision will become Active{future ? ` from ${new Date(change.item.effectiveFrom).toLocaleString()}` : ' now'} and replace any earlier active revision when it takes effect.</p><p>New Orders also require an Active Shipping procedure and a usable Active kit.</p></>
            : <p>This revision will stop being used for new shipping work. Older revisions will not be reactivated.</p>}
          <p>The revision number, sample requirements, and issued shipment instructions stay unchanged.</p>
        </div>
        {affected.length ? <Alert variant="warning"><AlertTitle>{affected.length} Active transportation {affected.length === 1 ? 'kit depends' : 'kits depend'} on this Sample type</AlertTitle><AlertDescription>These kits cannot be selected for new Orders until this Sample type has an Active revision: {affected.slice(0, 3).map(kit => kit.commonName).join('; ')}{affected.length > 3 ? `; and ${affected.length - 3} more` : ''}.</AlertDescription></Alert> : null}
        {mutation.error ? <Alert variant="destructive"><AlertTitle>Sample-type status was not changed</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Try again, or refresh the sample types before retrying.')}<Button type="button" variant="outline" disabled={mutation.isPending} onClick={async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setChange(null) }}>Refresh sample types</Button></AlertDescription></Alert> : null}
        <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setChange(null)}>Cancel</Button><Button type="button" variant={change?.isActive ? 'default' : 'destructive'} disabled={mutation.isPending} onClick={() => { if (change) mutation.mutate(change) }}>{mutation.isPending ? 'Saving…' : change?.isActive ? 'Activate' : 'Deactivate'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={discarding} onOpenChange={open => { if (!open && !discardMutation.isPending) setDiscarding(false) }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); (trigger.current ?? fallback.current)?.focus() }}><DialogHeader><DialogTitle>Discard Draft revision {item.revision}?</DialogTitle><DialogDescription>The number remains in history and cannot be reused. The released revision stays available.</DialogDescription></DialogHeader>{discardMutation.error ? <Alert variant="destructive"><AlertTitle>Draft was not discarded</AlertTitle><AlertDescription>{getOrderErrorMessage(discardMutation.error, 'Refresh this Sample type and try again.')}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" onClick={() => setDiscarding(false)}>Cancel</Button><Button type="button" variant="destructive" disabled={discardMutation.isPending} onClick={() => discardMutation.mutate()}>{discardMutation.isPending ? 'Discarding…' : 'Discard Draft'}</Button></RequiredDialogFooter></DialogContent></Dialog>
  </div>
}

export function SampleTypeActiveRevisionNote({ item, revisions }: { item: SampleTypeDefinition; revisions: SampleTypeDefinition[] }) {
  const current = revisions.filter(value => value.isActive && hasNotEnded(value) && new Date(value.effectiveFrom).getTime() <= Date.now()).sort((a, b) => b.revision - a.revision)[0]
  return current && current.id !== item.id ? <p className="mt-2 text-sm text-muted-foreground">Revision {current.revision} is currently active for new shipments. Use Actions to deactivate it or activate the latest revision.</p> : null
}
