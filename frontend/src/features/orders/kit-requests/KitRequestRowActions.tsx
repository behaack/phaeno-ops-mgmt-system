import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useRef } from 'react'
import { getPlatformTransportationKitRequest, type TransportationKitRequest } from '#/api/transportation-kit-requests'
import { getOrderErrorMessage } from '#/api/order-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { CancelKitRequestDialog } from './CancelKitRequestDialog'
import { KitRequestDispatchDialog } from './KitRequestDispatchDialog'
import { PrepareRequestedKitsDialog } from './PrepareRequestedKitsDialog'
import { kitRequestReference } from './kit-request-navigation'
import { kitRequestSupply } from './kit-request-supply'
import { refreshStockKitSupply } from '../stock-kits/stock-kit-request-sync'

export type KitRequestAction = { request: TransportationKitRequest; kind: 'prepare' | 'dispatch' | 'cancel'; opener: HTMLButtonElement | null }

export function KitRequestRowActions({ request, disabled, onAction }: { request: TransportationKitRequest; disabled: boolean; onAction: (action: KitRequestAction) => void }) {
  const search = useSearch({ strict: false })
  const trigger = useRef<HTMLButtonElement>(null)
  const active = ['Pending', 'PartiallyDispatched'].includes(request.status)
  const open = (kind: KitRequestAction['kind']) => onAction({ request, kind, opener: trigger.current })
  return <ActionMenu modal={false}><DropdownMenuTrigger asChild><Button ref={trigger} size="sm" variant="outline" disabled={disabled} aria-label={`Actions for ${kitRequestReference(request)}`}>Actions</Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-max min-w-48 max-w-[calc(100vw-2rem)]">
      {active ? <><DropdownMenuItem onSelect={() => open('prepare')}>Prepare kits</DropdownMenuItem><DropdownMenuItem onSelect={() => open('dispatch')}>Record kit shipment</DropdownMenuItem></> : null}
      {request.canCancel ? <DropdownMenuItem variant="destructive" onSelect={() => open('cancel')}>Cancel request</DropdownMenuItem> : null}
      <DropdownMenuItem asChild><Link to="/lab-operations/kit-requests/$requestId" params={{ requestId: request.id }} search={{ ...search, kitQueue: 'requests', section: 'kit-requests', receiptTab: undefined }}>View request</Link></DropdownMenuItem>
    </DropdownMenuContent>
  </ActionMenu>
}

// Fetch the authoritative request only for the invoked action, rather than for every list row.
export function KitRequestListActionDialog({ action, onClose }: { action: KitRequestAction; onClose: () => void }) {
  const client = useQueryClient(), navigate = useNavigate(), search = useSearch({ strict: false })
  const closeRef = useRef<HTMLButtonElement>(null)
  const query = useQuery({ queryKey: ['kit-request-action', action.request.id, action.kind], queryFn: () => getPlatformTransportationKitRequest(action.request.id), staleTime: 0, refetchOnMount: 'always', refetchOnWindowFocus: false, refetchOnReconnect: false })
  async function saved() { onClose(); await refreshStockKitSupply(client) }
  const detail = query.data
  // Never offer a write from a cached detail while the initial refresh is unresolved or failed.
  const refreshed = query.isFetchedAfterMount && !query.isFetching && !query.error && detail
  const supply = detail ? kitRequestSupply(detail) : null
  const active = detail && ['Pending', 'PartiallyDispatched'].includes(detail.request.status)
  if (refreshed && action.kind === 'cancel' && detail.request.canCancel) return <CancelKitRequestDialog request={detail.request} onClose={onClose} onSaved={saved} />
  if (refreshed && action.kind === 'dispatch' && active && detail.canDispatch && supply!.readyCount > 0) return <KitRequestDispatchDialog detail={detail} onClose={onClose} onSaved={async value => { client.setQueryData(['platform-transportation-kit-request', value.request.id], value); await saved() }} />
  if (refreshed && action.kind === 'prepare' && active && supply!.shortage.length > 0) return <PrepareRequestedKitsDialog neededSizeIds={supply!.shortage.map(line => line.containerDefinitionId)} onClose={onClose} onSaved={async kit => {
    await saved()
    await navigate({ to: '/lab-operations/stock-kits/$kitId', params: { kitId: kit.id }, search: { ...search, section: 'transportation-kits', receiptTab: 'standard-kits', returnKitRequestId: action.request.id } })
  }} />
  const title = action.kind === 'cancel' ? 'Cancel kit request' : action.kind === 'prepare' ? 'Prepare kits' : 'Record kit shipment'
  const blocked = !active ? 'This request no longer has kits awaiting dispatch.' : action.kind === 'prepare' ? 'The requested kits are already ready. Use Record kit shipment after carrier handoff.' : detail?.dispatchBlockedReason ?? 'Prepare fully registered kits before recording this shipment.'
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); closeRef.current?.focus() }}>
    <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{kitRequestReference(action.request)} · Job {action.request.jobNumber}</DialogDescription></DialogHeader>
    <div>{query.error ? <Alert variant="destructive"><AlertTitle>Request could not be refreshed</AlertTitle><AlertDescription>{getOrderErrorMessage(query.error, 'Try again before making changes.')}</AlertDescription></Alert> : !refreshed ? <p role="status">Checking the current request and available kits…</p> : <p>{action.kind === 'cancel' ? 'This request can no longer be cancelled. Cancellation is available only before dispatch.' : blocked}</p>}</div>
    <DialogFooter><Button ref={closeRef} variant="outline" onClick={onClose}>Close</Button>{query.error ? <Button onClick={() => void query.refetch()}>Retry</Button> : null}</DialogFooter>
  </DialogContent></Dialog>
}
