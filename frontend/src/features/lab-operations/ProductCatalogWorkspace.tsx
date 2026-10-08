import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { ProductCatalogPage } from './ProductCatalogPage'
import { ProductTypesPage } from './ProductTypesPage'

export function ProductCatalogWorkspace({ tab = 'products', onTabChange }: { tab?: 'products' | 'product-types'; onTabChange?: (tab: 'products' | 'product-types') => void }) {
  return <Tabs value={tab} onValueChange={value => onTabChange?.(value === 'product-types' ? 'product-types' : 'products')} className="gap-4">
    <TabsList aria-label="Products and product types" className="grid w-full grid-cols-2">
      <TabsTrigger value="products">Products</TabsTrigger>
      <TabsTrigger value="product-types">Product types</TabsTrigger>
    </TabsList>
    <TabsContent value="products"><ProductCatalogPage /></TabsContent>
    <TabsContent value="product-types"><ProductTypesPage /></TabsContent>
  </Tabs>
}
