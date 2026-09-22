import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { deleteCatalogItem, getCatalogItemDeletion, getOrderErrorMessage, type OrderConfiguration } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter } from '#/components/ui/required-field'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'

export function CatalogItemActions({ item, apiEnabled, onEdit }: {
  item: OrderConfiguration['catalogItems'][number]; apiEnabled: boolean; onEdit: (trigger: HTMLButtonElement | null) => void
}) {
  const [confirm, setConfirm] = useState<{ id: string; name: string; version: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const client = useQueryClient()
  const navigate = useNavigate()
  const eligibility = useQuery({ queryKey: ['catalog-item-deletion', item.id, item.version],
    queryFn: () => getCatalogItemDeletion(item.id), enabled: apiEnabled && !item.isActive })
  const canDelete = eligibility.data?.canDelete === true && eligibility.data.version === item.version && !eligibility.isError
  const reason = eligibility.isError ? 'Deletion eligibility could not be checked. Reopen this item to try again.'
    : eligibility.data?.version !== undefined && eligibility.data.version !== item.version ? 'This item changed. Reopen it before deleting.'
    : eligibility.data?.reason ?? (eligibility.isPending ? 'Checking activation history…' : null)
  const deletion = useMutation({ mutationFn: (reviewed: { id: string; version: number }) => deleteCatalogItem(reviewed.id, reviewed.version),
    onSuccess: async () => {
      setConfirm(null)
      await client.invalidateQueries({ queryKey: ['order-configuration'] })
      await navigate({ to: '/order-configuration', search: { configurationSection: 'catalog' } })
    }, onError: async () => {
      await client.invalidateQueries({ queryKey: ['catalog-item-deletion', item.id] })
      await client.invalidateQueries({ queryKey: ['order-configuration'] })
    } })
  return <div className="col-start-2 row-start-1 justify-self-end">
    <ActionMenu><DropdownMenuTrigger asChild><Button ref={trigger} variant="outline" disabled={!apiEnabled}>Actions <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-80">
        <DropdownMenuItem onSelect={() => onEdit(trigger.current)}>Edit item</DropdownMenuItem>
        {!item.isActive ? <DropdownMenuItem variant="destructive" disabled={!canDelete} onSelect={() => { deletion.reset(); setConfirm({ id: item.id, name: item.name, version: item.version }) }}>Delete item</DropdownMenuItem> : null}
        {!item.isActive && reason ? <DropdownMenuLabel className="max-w-72 whitespace-normal text-xs font-normal text-muted-foreground">{reason}</DropdownMenuLabel> : null}
      </DropdownMenuContent>
    </ActionMenu>
    <Dialog open={confirm !== null} onOpenChange={open => { if (!open && !deletion.isPending) setConfirm(null) }}>
      <DialogContent showCloseButton={!deletion.isPending} aria-busy={deletion.isPending}
        onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus() }}
        onCloseAutoFocus={event => { if (trigger.current?.isConnected) { event.preventDefault(); trigger.current.focus() } }}>
        <DialogHeader><DialogTitle>Delete {confirm?.name}?</DialogTitle><DialogDescription>This item has never been active and is not used by saved work or configuration. Deletion permanently removes it from the catalog. Its audit history is retained.</DialogDescription></DialogHeader>
        {confirm && confirm.version !== item.version ? <p role="status" className="text-sm">This item changed. Close this confirmation and review the latest item before deleting.</p> : null}
        {deletion.error ? <p role="alert" className="text-sm text-destructive">{getOrderErrorMessage(deletion.error, 'The item was not deleted. Refresh and review it again.')}</p> : null}
        <RequiredDialogFooter showLegend={false}><Button ref={cancel} variant="outline" disabled={deletion.isPending} onClick={() => setConfirm(null)}>Cancel</Button><Button variant="destructive" disabled={deletion.isPending || !canDelete || confirm?.version !== item.version} onClick={() => { if (confirm) deletion.mutate(confirm) }}>{deletion.isPending ? 'Deleting…' : 'Delete item'}</Button></RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
