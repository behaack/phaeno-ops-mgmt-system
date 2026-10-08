import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { getOrderErrorMessage, saveCatalogItem, type OrderConfiguration } from '#/api/order-management'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import { RequiredDialogFooter } from '#/components/ui/required-field'

type CatalogItem = OrderConfiguration['catalogItems'][number]

export function CatalogItemRowActions({ item, apiEnabled, onEdit }: {
  item: CatalogItem
  apiEnabled: boolean
  onEdit: (trigger: HTMLButtonElement | null) => void
}) {
  const [reviewed, setReviewed] = useState<CatalogItem | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const client = useQueryClient()
  const status = useMutation({
    mutationFn: (snapshot: CatalogItem) => saveCatalogItem(snapshot.id, {
      externalItemId: snapshot.externalItemId,
      name: snapshot.name,
      description: snapshot.description,
      salesUnit: snapshot.salesUnit,
      basePrice: snapshot.basePrice,
      currency: snapshot.currency,
      isActive: !snapshot.isActive,
      serviceFamily: snapshot.isPSeqLabService ? 'PSeqLabService' : 'Other',
      maximumCustomerSamples: snapshot.maximumCustomerSamples,
      version: snapshot.version,
    }),
    onSuccess: async saved => {
      setReviewed(null)
      client.setQueryData<OrderConfiguration>(['order-configuration'], current => current ? {
        ...current,
        catalogItems: current.catalogItems.map(entry => entry.id === saved.id ? saved : entry),
      } : current)
      await client.invalidateQueries({ queryKey: ['order-configuration'] })
    },
    onError: async () => {
      await client.invalidateQueries({ queryKey: ['order-configuration'] })
    },
  })
  const action = (reviewed ?? item).isActive ? 'Deactivate' : 'Activate'
  const changed = reviewed !== null && (reviewed.version !== item.version || reviewed.isActive !== item.isActive)

  return <div className="flex justify-end">
    <ActionMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={trigger} variant="outline" size="sm" aria-label={`Actions for ${item.name}`} disabled={!apiEnabled || status.isPending}>Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40 w-max">
        <DropdownMenuItem onSelect={() => onEdit(trigger.current)}>Edit</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => { status.reset(); setReviewed(item) }}>
          {item.isActive ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </ActionMenu>
    <Dialog open={reviewed !== null} onOpenChange={open => { if (!open && !status.isPending) setReviewed(null) }}>
      <DialogContent showCloseButton={!status.isPending} aria-busy={status.isPending}
        onOpenAutoFocus={event => { event.preventDefault(); cancel.current?.focus() }}
        onCloseAutoFocus={event => {
          const target = trigger.current?.isConnected ? trigger.current : document.getElementById('catalog-search')
          if (target) { event.preventDefault(); target.focus() }
        }}
        onEscapeKeyDown={event => { if (status.isPending) event.preventDefault() }}>
        <DialogHeader><DialogTitle>{action} {reviewed?.name}?</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <DialogDescription>
            {reviewed?.isActive ? 'This item will no longer be available for new pricing.' : 'This item will become available for new pricing.'}
            {' '}Existing orders and quotes retain their saved service details and prices.
          </DialogDescription>
          {changed ? <p role="status" className="text-sm">This item changed. Close this confirmation and review the latest item before changing its status.</p> : null}
          {status.error ? <p role="alert" className="text-sm text-destructive">{getOrderErrorMessage(status.error, 'The item status was not changed. Review the latest item and try again.')}</p> : null}
        </div>
        <RequiredDialogFooter showLegend={false}>
          <Button ref={cancel} variant="outline" disabled={status.isPending} onClick={() => setReviewed(null)}>Cancel</Button>
          <Button disabled={!apiEnabled || status.isPending || changed} onClick={() => { if (reviewed) status.mutate(reviewed) }}>
            {status.isPending ? 'Saving…' : action}
          </Button>
        </RequiredDialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
