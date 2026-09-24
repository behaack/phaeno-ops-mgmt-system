import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export type SupplierProductKind = 'Tube' | 'ShippingContainer' | 'Other'
export type SupplierProduct = { id: string; supplierId: string; productNumber: string; description: string; kind: SupplierProductKind; productTypeId: string; productTypeName: string; productTypeIsActive: boolean; canExpire?: boolean; defaultQuantityUnit?: string | null; isActive: boolean; version: number }
export type CatalogSupplier = { id: string; name: string; isActive: boolean; version: number; products: SupplierProduct[]; isInternalProducer?: boolean }
export type SupplierWrite = { name: string; isActive: boolean; version?: number }
export type ProductWrite = { productNumber: string; description: string; productTypeId: string; canExpire?: boolean; defaultQuantityUnit?: string | null; isActive: boolean; version?: number }
type Envelope<T> = { data: T }
const path = '/platform/lab-operations/suppliers'
export const supplierCatalogKey = ['supplier-catalog'] as const
export async function getSupplierCatalog() { return (await api.get<Envelope<CatalogSupplier[]>>(path)).data.data }
export function useSupplierCatalog(enabled = true) { return useQuery({ queryKey: supplierCatalogKey, queryFn: getSupplierCatalog, enabled }) }
export async function saveSupplier(input: SupplierWrite, id?: string) { return (id ? await api.put<Envelope<CatalogSupplier>>(`${path}/${id}`, input) : await api.post<Envelope<CatalogSupplier>>(path, input)).data.data }
export async function saveSupplierProduct(supplierId: string, input: ProductWrite, id?: string) { return (id ? await api.put<Envelope<SupplierProduct>>(`${path}/${supplierId}/products/${id}`, input) : await api.post<Envelope<SupplierProduct>>(`${path}/${supplierId}/products`, input)).data.data }
export function productKindLabel(kind: SupplierProductKind) { return kind === 'Tube' ? 'Tube' : kind === 'ShippingContainer' ? 'Shipping Container' : 'Other product' }

export type ProductType = { id: string; name: string; description: string; kitUse: SupplierProductKind; isActive: boolean; version: number; productCount: number }
export type ProductTypeWrite = { name: string; description: string; kitUse: SupplierProductKind; isActive: boolean; version?: number }
export const productTypesKey = ['supplier-product-types'] as const
const typesPath = '/platform/lab-operations/product-types'
export async function getProductTypes() { return (await api.get<Envelope<ProductType[]>>(typesPath)).data.data }
export function useProductTypes(enabled = true) { return useQuery({ queryKey: productTypesKey, queryFn: getProductTypes, enabled }) }
export async function saveProductType(input: ProductTypeWrite, id?: string) { return (id ? await api.put<Envelope<ProductType>>(`${typesPath}/${id}`, input) : await api.post<Envelope<ProductType>>(typesPath, input)).data.data }
