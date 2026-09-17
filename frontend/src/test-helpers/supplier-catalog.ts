import type { CatalogSupplier, ProductType } from '#/api/supplier-catalog'
import { containerDefinition } from './shipping-containers'
export const tubeSupplierId = '81000000-0000-4000-8000-000000000001'
export const shipperSupplierId = '81000000-0000-4000-8000-000000000002'
export const tubeProductId = '82000000-0000-4000-8000-000000000001'
export const shipperProductId = '82000000-0000-4000-8000-000000000002'
export const supplierCatalogFixture: CatalogSupplier[] = [
  { id: tubeSupplierId, name: 'Tube maker', isActive: true, version: 1, products: [{ id: tubeProductId, supplierId: tubeSupplierId, productNumber: 'T-001', description: 'Sterile transport tube', kind: 'Tube', productTypeId: '90000000-0000-4000-8000-000000000001', productTypeName: 'Tube', productTypeIsActive: true, isActive: true, version: 1 }] },
  { id: shipperSupplierId, name: containerDefinition.supplierName!, isActive: true, version: 1, products: [{ id: shipperProductId, supplierId: shipperSupplierId, productNumber: containerDefinition.supplierProductNumber!, description: 'Insulated shipping container', kind: 'ShippingContainer', productTypeId: '90000000-0000-4000-8000-000000000002', productTypeName: 'Shipping Container', productTypeIsActive: true, isActive: true, version: 1 }] },
]

export const productTypesFixture: ProductType[] = [
  { id: '90000000-0000-4000-8000-000000000001', name: 'Tube', description: 'Sample transportation tubes', kitUse: 'Tube', isActive: true, version: 1, productCount: 1 },
  { id: '90000000-0000-4000-8000-000000000002', name: 'Shipping Container', description: 'Transportation containers', kitUse: 'ShippingContainer', isActive: true, version: 1, productCount: 1 },
  { id: '90000000-0000-4000-8000-000000000003', name: 'Reagent', description: 'Laboratory reagents', kitUse: 'Other', isActive: true, version: 1, productCount: 0 },
]
