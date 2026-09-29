import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getKitAssemblyRun, requestKitAssemblyLabelPrint, saveKitAssemblySession, type KitAssemblySessionInput } from '#/api/lab-kit-assembly'
import type { ShippingStockKit } from '#/api/shipping-containers'

export function useKitAssemblyRun(kitId: string, kit: ShippingStockKit | undefined, enabled: boolean, onSaved: () => Promise<void>, onRecordSaved?: () => Promise<void>) {
  const client = useQueryClient()
  const query = useQuery({ queryKey: ['kit-assembly-run', kitId], queryFn: () => getKitAssemblyRun(kitId), enabled: enabled && Boolean(kit?.assemblyWorkflowRevisionId) })
  const [componentsOpen, setComponentsOpen] = useState(false)
  async function refresh() {
    await client.invalidateQueries({ queryKey: ['kit-assembly-run', kitId] })
    await client.invalidateQueries({ queryKey: ['lab-operations'] })
    await onSaved()
  }
  const useMutationRecord = useMutation({ mutationFn: (input: KitAssemblySessionInput) => saveKitAssemblySession(kitId, input), onSuccess: async () => { setComponentsOpen(false); await refresh(); await onRecordSaved?.() }, onError: async () => { await query.refetch(); await client.invalidateQueries({ queryKey: ['lab-operations'] }); await onSaved() } })
  const printLabel = useMutation({ mutationFn: () => requestKitAssemblyLabelPrint(kitId, query.data!.version), onSuccess: result => { client.setQueryData(['kit-assembly-run', kitId], result); window.print() }, onError: async () => { await query.refetch() } })
  const run = query.data
  const used = (productId: string) => (run?.uses ?? []).filter(item => item.supplierProductId === productId).reduce((sum, item) => sum + item.quantity, 0)
  const completedComponents = (run?.components ?? []).filter(item => used(item.supplierProductId) === item.quantity).length
  const ready = Boolean(run && kit && run.stepRecords.length === run.steps.length && completedComponents === run.components.length && kit.tubes.length === kit.container.capacity)
  const canEdit = Boolean(run?.status === 'InProgress' && kit?.status === 'Preparing' && !kit.withdrawnAt && !query.error)
  const pending = useMutationRecord.isPending || printLabel.isPending
  return { query, run, used, completedComponents, ready, canEdit, pending,
    componentsOpen, setComponentsOpen, useMutationRecord, printLabel }
}

export type KitAssemblyState = ReturnType<typeof useKitAssemblyRun>
