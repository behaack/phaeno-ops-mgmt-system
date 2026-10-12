import { CustomerSourceText } from '#/features/customer-i18n/customer-text'
import { Printer } from 'lucide-react'
import type { ShippingStockKit } from '#/api/shipping-containers'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { ShippingBarcode } from '#/features/sample-shipping/ShippingBarcode'
import './stock-kit-print.css'

export function StockKitBarcodeDialog({ kit, onClose }: { kit: ShippingStockKit; onClose: () => void }) {
  return <Dialog open onOpenChange={open => { if (!open) onClose() }}>
    <DialogContent className="stock-kit-print-dialog">
      <DialogHeader><DialogTitle><CustomerSourceText source={"Print container barcode"} /></DialogTitle><DialogDescription><CustomerSourceText source={"Use this permanent identity to select the physical container during Customer preparation."} /></DialogDescription></DialogHeader>
      <div className="stock-kit-print-surface space-y-3 rounded-md border bg-white p-4 text-black">
        <p className="text-sm font-semibold"><CustomerSourceText source={"Phaeno · Transportation kit"} /></p>
        <p className="wrap-anywhere text-sm">{kit.container.commonName} <CustomerSourceText source={"· SKU"} /> {kit.container.sku} · {kit.container.capacity} <CustomerSourceText source={"tubes"} /></p>
        <ShippingBarcode value={kit.kitNumber} label="Container barcode" />
      </div>
      <p className="text-sm text-muted-foreground"><CustomerSourceText source={"Printing keeps the same barcode. Check the printed barcode and readable identifier before using the container."} /></p>
      <DialogFooter><Button variant="outline" onClick={onClose}><CustomerSourceText source={"Close"} /></Button><Button onClick={() => window.print()}><Printer aria-hidden="true" /><CustomerSourceText source={"Print barcode"} /></Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
