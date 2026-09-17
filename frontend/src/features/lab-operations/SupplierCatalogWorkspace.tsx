import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { SupplierCatalogPage } from './SupplierCatalogPage'
import { ProductTypesPage } from './ProductTypesPage'
import { parseSupplierCatalogTab, type SupplierCatalogTab } from './supplier-catalog-tabs'

export function SupplierCatalogWorkspace({ tab, onTabChange }: { tab?: SupplierCatalogTab; onTabChange?: (tab: SupplierCatalogTab) => void }) {
  const [localTab, setLocalTab] = useState<SupplierCatalogTab>('suppliers')
  return <Tabs value={tab ?? localTab} onValueChange={value => {
    const next = parseSupplierCatalogTab(value)
    if (!next) return
    if (onTabChange) onTabChange(next)
    else setLocalTab(next)
  }} className="gap-4">
    <TabsList aria-label="Suppliers and products" className="grid w-full grid-cols-2">
      <TabsTrigger value="suppliers">Suppliers &amp; Products</TabsTrigger>
      <TabsTrigger value="product-types">Product types</TabsTrigger>
    </TabsList>
    <TabsContent value="suppliers"><SupplierCatalogPage /></TabsContent>
    <TabsContent value="product-types"><ProductTypesPage /></TabsContent>
  </Tabs>
}
