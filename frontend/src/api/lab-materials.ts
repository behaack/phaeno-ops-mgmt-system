import { useQuery } from '@tanstack/react-query'
import { api } from './client'
import type { CatalogSupplier } from './supplier-catalog'
import type { LabMaterialDefinition, LabMaterialLot } from './lab-operations'

export const useLotProducts = (enabled = true) => useQuery({ queryKey: ['lab-lot-products'], queryFn: async () => (await api.get<{ data: CatalogSupplier[] }>('/platform/lab-operations/material-lots/products')).data.data, enabled })
export const usePreparedMaterialDefinitions = () => useQuery({ queryKey: ['lab-step-prepared-materials'], queryFn: async () => (await api.get<{ data: LabMaterialDefinition[] }>('/platform/lab-operations/steps/prepared-materials')).data.data })
export const assignLotProduct = async (id: string, supplierProductId: string, version: number) => (await api.post<{ data: LabMaterialLot }>(`/platform/lab-operations/material-lots/${id}/product`, { supplierProductId, version })).data.data

export const reconcileLotQuantity = async (id: string, countedQuantity: number, reason: string, version: number) => (await api.post<{ data: LabMaterialLot }>(`/platform/lab-operations/material-lots/${id}/reconcile-quantity`, { countedQuantity, reason, version })).data.data
