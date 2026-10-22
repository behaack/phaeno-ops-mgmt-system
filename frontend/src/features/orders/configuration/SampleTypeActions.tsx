import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FilePenLine } from 'lucide-react'
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
  const __customerText = useCustomerText()

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
  return <div ref={fallback} tabIndex={-1} aria-label={__customerText('m_e6887baa4a66', { p0: String(item.name) })} className="shrink-0">
    <ActionMenu><DropdownMenuTrigger asChild><Button ref={trigger} type="button" variant="outline"><CustomerText message="m_ff8059dc6752" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-max max-w-[calc(100vw-2rem)]">
        {draft ? <DropdownMenuItem onSelect={() => onCreateRevision(draft)}><FilePenLine aria-hidden="true" /><CustomerText message="m_439cdd5d5ae6" />{draft.revision}</DropdownMenuItem> : latest || latestReleased?.id === item.id ? <DropdownMenuItem onSelect={() => onCreateRevision(latestReleased ?? item)}><FilePenLine aria-hidden="true" /><CustomerText message="m_68bf5426f2b3" /></DropdownMenuItem> : null}
        {item.lifecycle === 'Draft' && hasNotEnded(item) ? <DropdownMenuItem onSelect={() => choose(item, true)}><CustomerText message="m_24433c70eba5" /></DropdownMenuItem> : null}
        {item.lifecycle === 'Draft' ? <DropdownMenuItem variant="destructive" onSelect={() => setDiscarding(true)}><CustomerText message="m_eb1a70e39274" /></DropdownMenuItem> : null}
        {item.isActive ? <DropdownMenuItem variant="destructive" onSelect={() => choose(item, false)}><CustomerText message="m_fb1e6fa55327" /></DropdownMenuItem> : null}
        {earlierActive.map(value => <DropdownMenuItem key={value.id} variant="destructive" onSelect={() => choose(value, false)}><CustomerText message="m_21258394677b" />{value.revision}</DropdownMenuItem>)}
      </DropdownMenuContent>
    </ActionMenu>
    <Dialog open={Boolean(change)} onOpenChange={open => { if (!open && !mutation.isPending) setChange(null) }}>
      <DialogContent aria-describedby="sample-type-status-summary sample-type-status-consequences" showCloseButton={!mutation.isPending} onCloseAutoFocus={event => { event.preventDefault(); (trigger.current ?? fallback.current)?.focus() }}>
        <DialogHeader className="pr-[var(--dialog-inset)]"><DialogTitle className="pr-8">{change?.isActive ? <CustomerSourceText source={"Activate sample type?"} /> : __customerText('m_fef07dca0a4f')}</DialogTitle>
          <DialogDescription id="sample-type-status-summary" className="pr-8">{change?.item.name} <CustomerText message="m_3b0e4579f573" />{change?.item.revision}</DialogDescription>
        </DialogHeader>
        <div id="sample-type-status-consequences" className="space-y-2 text-sm">
          {change?.isActive
            ? <><p><CustomerText message="m_767901a0a49c" />{future ? __customerText('m_d337f5a9ae6d', { p0: String(new Date(change.item.effectiveFrom).toLocaleString()) }) : __customerText('m_4ea6cf4a6d30')} <CustomerText message="m_d5ff8cd889b0" /></p><p><CustomerText message="m_83c695323a3a" /></p></>
            : <p><CustomerText message="m_34ae561f5046" /></p>}
          <p><CustomerText message="m_1a4f11c06412" /></p>
        </div>
        {affected.length ? <Alert variant="warning"><AlertTitle>{affected.length} <CustomerText message="m_4b869e7185a4" />{affected.length === 1 ? <CustomerSourceText source={"kit depends"} /> : __customerText('m_e063ef462d40')} <CustomerText message="m_b3bdec87d903" /></AlertTitle><AlertDescription><CustomerText message="m_7947b7805b53" />{affected.slice(0, 3).map(kit => kit.commonName).join('; ')}{affected.length > 3 ? __customerText('m_e01121508df3', { p0: String(affected.length - 3) }) : ''}.</AlertDescription></Alert> : null}
        {mutation.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_548dd9f845df" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(mutation.error, 'Try again, or refresh the sample types before retrying.')} />}<Button type="button" variant="outline" disabled={mutation.isPending} onClick={async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); setChange(null) }}><CustomerText message="m_ca0de97f08d6" /></Button></AlertDescription></Alert> : null}
        <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => setChange(null)}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="button" variant={change?.isActive ? "default" : "destructive"} disabled={mutation.isPending} onClick={() => { if (change) mutation.mutate(change) }}>{mutation.isPending ? <CustomerSourceText source={"Saving…"} /> : change?.isActive ? "Activate" : __customerText('m_fb1e6fa55327')}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={discarding} onOpenChange={open => { if (!open && !discardMutation.isPending) setDiscarding(false) }}><DialogContent onCloseAutoFocus={event => { event.preventDefault(); (trigger.current ?? fallback.current)?.focus() }}><DialogHeader><DialogTitle><CustomerText message="m_cf1f2d80cffd" />{item.revision}?</DialogTitle><DialogDescription><CustomerText message="m_e07d302fb13d" /></DialogDescription></DialogHeader>{discardMutation.error ? <Alert variant="destructive"><AlertTitle><CustomerText message="m_f39e54ae4225" /></AlertTitle><AlertDescription>{<CustomerSourceText source={getOrderErrorMessage(discardMutation.error, 'Refresh this Sample type and try again.')} />}</AlertDescription></Alert> : null}<RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" onClick={() => setDiscarding(false)}><CustomerText message="m_19766ed6ccb2" /></Button><Button type="button" variant="destructive" disabled={discardMutation.isPending} onClick={() => discardMutation.mutate()}>{discardMutation.isPending ? <CustomerSourceText source={"Discarding…"} /> : __customerText('m_35cefb4d4564')}</Button></RequiredDialogFooter></DialogContent></Dialog>
  </div>
}

export function SampleTypeActiveRevisionNote({ item, revisions }: { item: SampleTypeDefinition; revisions: SampleTypeDefinition[] }) {
  const current = revisions.filter(value => value.isActive && hasNotEnded(value) && new Date(value.effectiveFrom).getTime() <= Date.now()).sort((a, b) => b.revision - a.revision)[0]
  return current && current.id !== item.id ? <p className="mt-2 text-sm text-muted-foreground"><CustomerText message="m_e330d85ff901" />{current.revision} <CustomerText message="m_7d1fd57a90f6" /></p> : null
}
