import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { reconcileLotQuantity } from '#/api/lab-materials'
import type { LabMaterialLot } from '#/api/lab-operations'
import { Input } from '#/components/ui/input'
import { CatalogEditor } from './SupplierCatalogDialogs'
import { PreparationField, prepSelectClass } from './preparation-ui'

export function MaterialLotQuantityDialog({ lot, onClose }: { lot: LabMaterialLot; onClose: () => void }) {
  const id = useId()
  const client = useQueryClient()
  const schema = z.object({ quantity: z.string().trim().min(1, 'Enter the counted quantity.').refine(v => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= lot.availableQuantity, 'Use zero or a quantity no greater than the last recorded balance.'), reason: z.string().trim().min(1, 'Explain the reconciliation.').max(2000) })
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { quantity: '', reason: '' } })
  const save = useMutation({ mutationFn: (v: z.infer<typeof schema>) => reconcileLotQuantity(lot.id, Number(v.quantity), v.reason, lot.version), onSuccess: async () => { form.reset(); await client.invalidateQueries({ queryKey: ['lab-operations'] }); await client.invalidateQueries({ queryKey: ['lab-preparation'] }); onClose() } })
  return <CatalogEditor title="Reconcile lot quantity" description={`${lot.name} · ${lot.lotNumber}. Count the remaining stock. Earlier unknown sample amounts stay unknown; this records the verified remaining balance.`} formId={id} dirty={form.formState.isDirty} busy={save.isPending} error={save.error} onClose={onClose}>
    <form id={id} className="space-y-4" noValidate onSubmit={form.handleSubmit(v => { if (!save.isPending) save.mutate(v) })}>
      <p className="text-sm">Last recorded balance: {lot.availableQuantity} {lot.quantityUnit}. {lot.quantityHoldReason}</p>
      <PreparationField required id={`${id}-quantity`} label={`Counted remaining quantity (${lot.quantityUnit})`} error={form.formState.errors.quantity?.message}><Input id={`${id}-quantity`} type="number" min="0" max={lot.availableQuantity} step="any" {...form.register('quantity')} /></PreparationField>
      <PreparationField required id={`${id}-reason`} label="Reconciliation reason" error={form.formState.errors.reason?.message}><textarea id={`${id}-reason`} maxLength={2000} className={`${prepSelectClass} min-h-24 py-2`} {...form.register('reason')} /></PreparationField>
    </form>
  </CatalogEditor>
}
