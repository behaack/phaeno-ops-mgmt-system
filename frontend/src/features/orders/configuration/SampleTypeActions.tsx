import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FilePenLine, RefreshCw } from 'lucide-react'
import { useRef, useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import { changeSampleTypeProcedure, setSampleTypeStatus, type SampleShippingConfiguration, type SampleTypeDefinition } from '#/api/sample-shipping'
import { getShippingContainerDefinitions } from '#/api/shipping-containers'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { Label } from '#/components/ui/label'

type StatusChange = { item: SampleTypeDefinition; isActive: boolean }
const hasNotEnded = (item: SampleTypeDefinition) => !item.effectiveTo || new Date(item.effectiveTo).getTime() > Date.now()

export function SampleTypeActions({ item, revisions, configuration, onCreateRevision, onStatusChanged }: {
  item: SampleTypeDefinition
  revisions: SampleTypeDefinition[]
  configuration: SampleShippingConfiguration
  onCreateRevision: (item: SampleTypeDefinition) => void
  onStatusChanged?: (item: SampleTypeDefinition, isActive: boolean) => void
}) {
  const client = useQueryClient()
  const trigger = useRef<HTMLButtonElement>(null)
  const fallback = useRef<HTMLDivElement>(null)
  const [change, setChange] = useState<StatusChange | null>(null)
  const [procedureOpen, setProcedureOpen] = useState(false)
  const [procedureId, setProcedureId] = useState('')
  const kits = useQuery({ queryKey: ['shipping-container-definitions'], queryFn: getShippingContainerDefinitions, enabled: Boolean(change && !change.isActive) })
  const latest = !revisions.some(value => value.revision > item.revision)
  const latestRevision = [...revisions].sort((a, b) => b.revision - a.revision)[0]
  const activeProcedures = [...new Map((configuration.procedures ?? []).filter(value => value.isActive)
    .sort((a, b) => a.revision - b.revision).map(value => [value.definitionKey, value])).values()]
  const earlierActive = latest ? revisions.filter(value => value.id !== item.id && value.isActive && hasNotEnded(value)) : []
  const mutation = useMutation({
    mutationFn: ({ item: target, isActive }: StatusChange) => setSampleTypeStatus(target.id, { isActive, version: target.version }),
    onSuccess: async (_result, variables) => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setChange(null); onStatusChanged?.(variables.item, variables.isActive) },
  })
  const procedureMutation = useMutation({
    mutationFn: () => changeSampleTypeProcedure(latestRevision.id, procedureId, latestRevision.version),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setProcedureOpen(false) },
  })
  function choose(target: SampleTypeDefinition, isActive: boolean) { mutation.reset(); setChange({ item: target, isActive }) }
  const future = change && new Date(change.item.effectiveFrom).getTime() > Date.now()
  const affected = change && !change.isActive ? (kits.data ?? []).filter(kit => kit.sampleTypeAnchorId && revisions.some(revision => revision.id === kit.sampleTypeAnchorId) && kit.isActive) : []
  return <div ref={fallback} tabIndex={-1} aria-label={`${item.name} actions`} className="shrink-0">
    <ActionMenu><DropdownMenuTrigger asChild><Button ref={trigger} type="button" variant="outline">Actions<ChevronDown data-icon="inline-end" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">
        {latest ? <DropdownMenuItem onSelect={() => onCreateRevision(item)}><FilePenLine aria-hidden="true" />Create revision</DropdownMenuItem> : null}
        {latest ? <DropdownMenuItem onSelect={() => { setProcedureId(''); procedureMutation.reset(); setProcedureOpen(true) }}><RefreshCw aria-hidden="true" />Change procedure</DropdownMenuItem> : null}
        {hasNotEnded(item) && (latest || item.isActive) ? <DropdownMenuItem variant={item.isActive ? 'destructive' : 'default'} onSelect={() => choose(item, !item.isActive)}>{item.isActive ? 'Deactivate' : 'Activate'}</DropdownMenuItem> : null}
        {earlierActive.map(value => <DropdownMenuItem key={value.id} variant="destructive" onSelect={() => choose(value, false)}>Deactivate revision {value.revision}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </ActionMenu>
    <Dialog open={Boolean(change)} onOpenChange={open => { if (!open && !mutation.isPending) setChange(null) }}>
      <DialogContent showCloseButton={!mutation.isPending} onCloseAutoFocus={event => { event.preventDefault(); (trigger.current ?? fallback.current)?.focus() }}>
        <DialogHeader><DialogTitle>{change?.isActive ? 'Activate sample type?' : 'Deactivate sample type?'}</DialogTitle>
          <DialogDescription>{change?.item.name} · revision {change?.item.revision}. {change?.isActive
            ? `Approves this revision for new shipping work${future ? ` from ${new Date(change.item.effectiveFrom).toLocaleString()}` : ' now'} and replaces any earlier active revision at that time.`
            : 'Stops this revision from being used for new shipping work. Older revisions will not be reactivated.'} The revision number, sample requirements and issued shipment instructions stay unchanged.</DialogDescription>
        </DialogHeader>
        {affected.length ? <Alert variant="destructive"><AlertTitle>{affected.length} Active transportation {affected.length === 1 ? 'kit depends' : 'kits depend'} on this Sample type</AlertTitle><AlertDescription>These kits cannot be selected for new Orders until this Sample type has an Active revision: {affected.slice(0, 3).map(kit => kit.commonName).join('; ')}{affected.length > 3 ? `; and ${affected.length - 3} more` : ''}.</AlertDescription></Alert> : null}
        {mutation.error ? <Alert variant="destructive"><AlertTitle>Sample-type status was not changed</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Try again, or refresh the sample types before retrying.')}<Button type="button" variant="outline" disabled={mutation.isPending} onClick={async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setChange(null) }}>Refresh sample types</Button></AlertDescription></Alert> : null}
        <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setChange(null)}>Cancel</Button><Button type="button" variant={change?.isActive ? 'default' : 'destructive'} disabled={mutation.isPending} onClick={() => { if (change) mutation.mutate(change) }}>{mutation.isPending ? 'Saving…' : change?.isActive ? 'Activate' : 'Deactivate'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={procedureOpen} onOpenChange={open => { if (!open && !procedureMutation.isPending) setProcedureOpen(false) }}>
      <DialogContent showCloseButton={!procedureMutation.isPending} onCloseAutoFocus={event => { event.preventDefault(); (trigger.current ?? fallback.current)?.focus() }}>
        <DialogHeader><DialogTitle>Change shipping procedure</DialogTitle><DialogDescription>Choose the shared procedure for {item.name}. This changes its relationship immediately without creating a Sample type revision. New instructions use the selected procedure's current Active revision; issued packets keep their saved text.</DialogDescription></DialogHeader>
        <div className="space-y-2"><Label htmlFor={`sample-type-procedure-${item.id}`}>Shared shipping procedure *</Label><select id={`sample-type-procedure-${item.id}`} className="h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 text-sm" value={procedureId} onChange={event => setProcedureId(event.target.value)} disabled={procedureMutation.isPending} required><option value="">Choose an Active procedure…</option>{activeProcedures.map(value => <option key={value.id} value={value.id}>{value.name}</option>)}</select></div>
        {procedureMutation.error ? <Alert variant="destructive"><AlertTitle>Procedure was not changed</AlertTitle><AlertDescription>{getOrderErrorMessage(procedureMutation.error, 'Refresh the Sample type and try again.')}</AlertDescription></Alert> : null}
        <RequiredDialogFooter><Button type="button" variant="outline" disabled={procedureMutation.isPending} onClick={() => setProcedureOpen(false)}>Cancel</Button><Button type="button" disabled={!procedureId || procedureMutation.isPending} onClick={() => procedureMutation.mutate()}>{procedureMutation.isPending ? 'Saving…' : 'Change procedure'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}

export function SampleTypeActiveRevisionNote({ item, revisions }: { item: SampleTypeDefinition; revisions: SampleTypeDefinition[] }) {
  const current = revisions.filter(value => value.isActive && hasNotEnded(value) && new Date(value.effectiveFrom).getTime() <= Date.now()).sort((a, b) => b.revision - a.revision)[0]
  return current && current.id !== item.id ? <p className="mt-2 text-sm text-muted-foreground">Revision {current.revision} is currently active for new shipments. Use Actions to deactivate it or activate the latest revision.</p> : null
}
