import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Pencil, Power } from 'lucide-react'
import { productTypesKey, supplierCatalogKey } from '#/api/supplier-catalog'
import { getLabOperationsError } from '#/api/lab-operations'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { useOrderDraftGuard } from '#/features/orders/use-order-draft-guard'

export function CatalogActions({ id, name, isActive, onEdit, onStatus }: { id: string; name: string; isActive: boolean; onEdit: () => void; onStatus: () => void }) {
  return <ActionMenu><DropdownMenuTrigger asChild><Button id={id} variant="outline" aria-label={`Actions for ${name}`}>Actions <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-max min-w-44 max-w-[calc(100vw-2rem)]"><DropdownMenuLabel>{name}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={onEdit}><Pencil aria-hidden="true" />Edit</DropdownMenuItem><DropdownMenuItem onSelect={onStatus}><Power aria-hidden="true" />{isActive ? 'Deactivate' : 'Activate'}</DropdownMenuItem></DropdownMenuContent></ActionMenu>
}

export function CatalogStatusConfirmation({ name, isActive, description, actionId, fallbackId, onSave, onClose }: { name: string; isActive: boolean; description: string; actionId: string; fallbackId: string; onSave: () => Promise<unknown>; onClose: () => void }) {
  const cache = useQueryClient()
  const cancel = useRef<HTMLButtonElement>(null)
  const save = useMutation({ mutationFn: onSave, onSuccess: async () => {
    await Promise.all([cache.invalidateQueries({ queryKey: productTypesKey }), cache.invalidateQueries({ queryKey: supplierCatalogKey }), cache.invalidateQueries({ queryKey: ['lab-operations'] })])
    onClose()
  } })
  useOrderDraftGuard(false, save.isPending)
  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose() }}><DialogContent onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus() }} onCloseAutoFocus={event => { event.preventDefault(); (document.getElementById(actionId) ?? document.getElementById(fallbackId))?.focus() }}>
    <DialogHeader><DialogTitle>{isActive ? 'Deactivate' : 'Activate'} {name}?</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    {save.error ? <Alert variant="destructive"><AlertTitle>Status could not be confirmed</AlertTitle><AlertDescription>{getLabOperationsError(save.error, 'Refresh to check the current status before trying again.')}</AlertDescription></Alert> : null}
    <DialogFooter><Button ref={cancel} variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button disabled={save.isPending} onClick={() => { if (!save.isPending) save.mutate() }}>{save.isPending ? 'Saving…' : isActive ? 'Deactivate' : 'Activate'}</Button></DialogFooter>
  </DialogContent></Dialog>
}
