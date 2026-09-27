import { Link } from '@tanstack/react-router'

export function SampleShippingSettingsHeader() {
  return <header className="mb-6">
    <h1 className="text-3xl font-semibold">Samples &amp; shipping settings</h1>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Define each Sample type, select its Shipping procedure, and link usable Transportation kits. Set one Default Phaeno destination for Orders using customer-held kits.</p>
    <details className="mt-3 max-w-3xl rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">Setup guide: where each instruction belongs</summary><ol className="mt-3 list-decimal space-y-2 pl-5">
      <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'sample-types' }}>Sample types</Link>: specimen requirements, one selected procedure, and linked kits.</li>
      <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'destinations' }}>Phaeno ship-to destinations</Link>: address, receiving hours, contacts and delivery directions.</li>
      <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'procedures' }}>Shipping procedures</Link>: reusable common steps for carriers, dispatch, documents and handling problems.</li>
      <li><Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: 'containers' }}>Transportation kits</Link>: selected Sample type, capacity, dry ice, and packing; approved workflow before preparing new Phaeno kits.</li>
    </ol><p className="mt-3 text-muted-foreground">Every Active destination can receive any orderable Sample type. Phaeno fixes the destination when first dispatching a requested kit; customer-held kits use the Default destination. Issued shipments retain their saved instructions.</p></details>
  </header>
}
