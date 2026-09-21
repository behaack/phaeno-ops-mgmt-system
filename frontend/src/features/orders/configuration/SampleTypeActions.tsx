import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, FilePenLine } from 'lucide-react'
import { useRef, useState } from 'react'
import { getOrderErrorMessage } from '#/api/order-management'
import { setSampleTypeStatus, type SampleTypeDefinition } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { RequiredDialogFooter } from '#/components/ui/required-field'

type StatusChange = { item: SampleTypeDefinition; isActive: boolean }
const hasNotEnded = (item: SampleTypeDefinition) => !item.effectiveTo || new Date(item.effectiveTo).getTime() > Date.now()

export function SampleTypeActions({ item, revisions, onCreateRevision }: {
  item: SampleTypeDefinition
  revisions: SampleTypeDefinition[]
  onCreateRevision: (item: SampleTypeDefinition) => void
}) {
  const client = useQueryClient()
  const trigger = useRef<HTMLButtonElement>(null)
  const fallback = useRef<HTMLDivElement>(null)
  const [change, setChange] = useState<StatusChange | null>(null)
  const latest = !revisions.some(value => value.revision > item.revision)
  const earlierActive = latest ? revisions.filter(value => value.id !== item.id && value.isActive && hasNotEnded(value)) : []
  const mutation = useMutation({
    mutationFn: ({ item: target, isActive }: StatusChange) => setSampleTypeStatus(target.id, { isActive, version: target.version }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setChange(null) },
  })
  function choose(target: SampleTypeDefinition, isActive: boolean) { mutation.reset(); setChange({ item: target, isActive }) }
  const future = change && new Date(change.item.effectiveFrom).getTime() > Date.now()
  return <div ref={fallback} tabIndex={-1} aria-label={`${item.name} actions`} className="shrink-0">
    <ActionMenu><DropdownMenuTrigger asChild><Button ref={trigger} type="button" variant="outline">Actions<ChevronDown data-icon="inline-end" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {latest ? <DropdownMenuItem onSelect={() => onCreateRevision(item)}><FilePenLine aria-hidden="true" />Create revision</DropdownMenuItem> : null}
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
        {mutation.error ? <Alert variant="destructive"><AlertTitle>Sample-type status was not changed</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Try again, or refresh the sample types before retrying.')}<Button type="button" variant="outline" disabled={mutation.isPending} onClick={async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setChange(null) }}>Refresh sample types</Button></AlertDescription></Alert> : null}
        <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setChange(null)}>Cancel</Button><Button type="button" variant={change?.isActive ? 'default' : 'destructive'} disabled={mutation.isPending} onClick={() => { if (change) mutation.mutate(change) }}>{mutation.isPending ? 'Saving…' : change?.isActive ? 'Activate' : 'Deactivate'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}

export function SampleTypeActiveRevisionNote({ item, revisions }: { item: SampleTypeDefinition; revisions: SampleTypeDefinition[] }) {
  const current = revisions.filter(value => value.isActive && hasNotEnded(value) && new Date(value.effectiveFrom).getTime() <= Date.now()).sort((a, b) => b.revision - a.revision)[0]
  return current && current.id !== item.id ? <p className="mt-2 text-sm text-muted-foreground">Revision {current.revision} is currently active for new shipments. Use Actions to deactivate it or activate the latest revision.</p> : null
}
