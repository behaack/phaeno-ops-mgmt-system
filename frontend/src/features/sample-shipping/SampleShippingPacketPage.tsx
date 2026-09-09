import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Printer } from 'lucide-react'

import { getSampleShippingPacket } from '#/api/sample-shipping'
import { apiErrorMessage } from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { ShippingBarcode } from './ShippingBarcode'
import './sample-shipping-packet.css'

type JsonObject = Record<string, unknown>
type FrozenSample = {
  id: string
  customerSampleId: string
  sampleName: string
  sampleTypeName: string
  sampleBarcode: string
  totalTubeCount: number
  unallocatedTubeCount: number
  otherShipments: Array<{ shipmentNumber: string; tubeCount: number }>
  tubes: Array<{ barcode: string; ordinal: string; quantity: string; quantityUnit: string }>
}

export function SampleShippingPacketPage({ shipmentId }: { shipmentId: string }) {
  const query = useQuery({
    queryKey: ['sample-shipping-packet', shipmentId],
    queryFn: () => getSampleShippingPacket(shipmentId),
    refetchOnMount: 'always',
  })

  if (query.isLoading || query.isFetching) {
    return <main className="page-wrap space-y-5 px-4 py-8"><PacketReturnLink shipmentId={shipmentId} /><p role="status">Checking the current shipping packet…</p></main>
  }

  if (query.fetchStatus === 'paused') {
    return <main className="page-wrap space-y-5 px-4 py-8"><PacketReturnLink shipmentId={shipmentId} /><Alert><AlertTitle>Connection needed</AlertTitle><AlertDescription>Reconnect so the Portal can check the current packet revision before printing.</AlertDescription></Alert></main>
  }

  if (query.error || !query.data) {
    return (
      <main className="page-wrap space-y-5 px-4 py-8">
        <PacketReturnLink shipmentId={shipmentId} />
        <Alert variant="destructive">
          <AlertTitle>Packet unavailable</AlertTitle>
          <AlertDescription>
            {query.error ? apiErrorMessage(query.error) : 'The packet was not found.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
      </main>
    )
  }

  const { shipment } = query.data
  const packet = shipment.currentPacket
  if (!packet || packet.isVoided) return <main className="page-wrap space-y-5 px-4 py-8"><PacketReturnLink shipmentId={shipmentId} /><Alert><AlertTitle>Packet no longer current</AlertTitle><AlertDescription>Return to the shipment to review its current contents and packet revision before printing.</AlertDescription></Alert><Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></main>
  const destination = parseObject(query.data.destinationSnapshotJson)
  const instructions = parseObject(query.data.instructionSnapshotJson)
  const manifest = parseObject(query.data.manifestSnapshotJson)
  const frozenSamples = readFrozenSamples(manifest)

  return (
    <main className="shipping-packet-page page-wrap px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <style>{`@media print { @page { margin: 10mm 12mm 15mm !important; @bottom-left { content: ${JSON.stringify(`Packet ${packet.packetNumber} · Barcode ${packet.barcode} · Shipment ${shipment.shipmentNumber}`)}; font: 8pt Arial, sans-serif; color: black; } } }`}</style>
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <PacketReturnLink shipmentId={shipmentId} />
        <Button onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          Print packet
        </Button>
      </div>

      <article className="shipping-packet mx-auto max-w-4xl space-y-8 bg-background pb-16 text-foreground print:max-w-none print:bg-white print:text-black">
        <header className="packet-header break-inside-avoid border-b pb-5">
          <div className="flex items-center justify-between gap-4"><img src="/phaeno124x40.webp" alt="Phaeno" width={124} height={40} /><p className="text-sm font-medium uppercase tracking-wide">Sample shipment</p></div>
          <h1 className="mt-2 text-3xl font-semibold">{packet?.packetNumber}</h1>
          {packet ? (
            <div className="packet-revision mt-4 max-w-2xl">
              <ShippingBarcode value={packet.barcode} label="Packet revision barcode" />
            </div>
          ) : null}
          <p className="mt-3 text-sm">
            Shipment {shipment.shipmentNumber} · {shipment.authorizationReference} · Revision {packet?.revision}
          </p>
          {text(manifest.orderBarcode) ? <div className="packet-identity mt-5 space-y-2"><p className="text-sm font-medium">Order {shipment.authorizationReference}</p><ShippingBarcode value={text(manifest.orderBarcode)} label="Order barcode" /></div> : null}
          {text(manifest.shipmentBarcode) ? <div className="packet-identity mt-5 space-y-2"><p className="text-sm font-medium">Shipment {shipment.shipmentNumber}</p><ShippingBarcode value={text(manifest.shipmentBarcode)} label="Shipment barcode" /></div> : null}
          {text(asObject(manifest.container).sku) ? <p className="mt-4 text-sm"><strong>{text(asObject(manifest.container).commonName)}</strong> · SKU {text(asObject(manifest.container).sku)} · Capacity {text(asObject(manifest.container).capacity)} tubes</p> : null}
        </header>

        <section className="packet-destination break-inside-avoid">
          <h2 className="text-xl font-semibold">Ship to</h2>
          <div className="mt-3 text-sm leading-6">
            <p className="font-medium">{text(destination.recipientName)}</p>
            <p>{text(destination.organizationName)}</p>
            <p>{text(destination.addressLine1)}</p>
            {destination.addressLine2 ? <p>{text(destination.addressLine2)}</p> : null}
            <p>
              {text(destination.city)}, {text(destination.stateOrProvince)} {text(destination.postalCode)}
            </p>
            <p>{text(destination.countryCode)}</p>
            {destination.receivingPhone ? <p>Phone: {text(destination.receivingPhone)}</p> : null}
            {destination.receivingEmail ? <p>Email: {text(destination.receivingEmail)}</p> : null}
          </div>
          <Instruction label="Receiving hours" value={destination.receivingHours} />
          <Instruction label="Closure guidance" value={destination.closureInstructions} />
          <Instruction label="Delivery directions" value={destination.deliveryInstructions} />
          <Instruction label="Carrier restrictions" value={destination.carrierRestrictions} />
        </section>

        <section className="packet-instructions">
          <h2 className="text-xl font-semibold">Preparation, packing, and delivery instructions</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Follow every instruction for each sample type in this packet. Contact Phaeno before shipping if any requirement cannot be met.
          </p>
          <div className="mt-5 space-y-6">
            {asObjects(instructions.samples).map((entry, index) => (
              <SampleInstructions entry={entry} index={index} key={index} />
            ))}
          </div>
        </section>

        <section className="packet-manifest">
          <h2 className="text-xl font-semibold">Submission manifest and retained tube crosswalk</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep a copy for your records and place this manifest inside the package.
          </p>
          <div className="packet-samples mt-4 space-y-5">{frozenSamples.map(item => <article key={item.id} className="packet-sample rounded-md border p-4">
            <header className="break-inside-avoid space-y-2"><h3 className="wrap-anywhere font-semibold">{item.customerSampleId}</h3><p className="text-sm">{item.sampleName}{item.sampleTypeName ? ` · ${item.sampleTypeName}` : ''}</p><p className="text-sm font-medium">{item.tubes.length} of {item.totalTubeCount} tubes in this shipment</p>{item.sampleBarcode ? <div className="max-w-2xl"><ShippingBarcode value={item.sampleBarcode} label="Sample barcode" /></div> : null}</header>
            <h4 className="mt-4 text-sm font-semibold">Physical tubes in this container</h4>
            <ul className="mt-2 divide-y">{item.tubes.map((tube, index) => <li key={`${tube.barcode}-${index}`} className="packet-tube break-inside-avoid space-y-2 py-3"><p className="text-sm"><span className="hidden wrap-anywhere font-medium print:block">{item.customerSampleId}</span>Tube {tube.ordinal || index + 1}{tube.quantity ? ` · ${tube.quantity} ${tube.quantityUnit}` : ''}</p>{tube.barcode ? <div className="max-w-2xl"><ShippingBarcode value={tube.barcode} label="Permanent tube barcode" /></div> : <p className="text-sm">No tube barcode recorded in this revision.</p>}</li>)}</ul>
            {item.otherShipments.length || item.unallocatedTubeCount > 0 ? <aside className="mt-3 break-inside-avoid border-t pt-3 text-sm"><h4 className="font-semibold">Other tubes for this sample — not in this container</h4><ul className="mt-2 space-y-1">{item.otherShipments.map(other => <li key={other.shipmentNumber}>{other.tubeCount} {other.tubeCount === 1 ? 'tube' : 'tubes'} in shipment {other.shipmentNumber}</li>)}{item.unallocatedTubeCount > 0 ? <li>{item.unallocatedTubeCount} {item.unallocatedTubeCount === 1 ? 'tube is' : 'tubes are'} not yet allocated to a shipment.</li> : null}</ul><p className="mt-2 text-xs">These references reflect this confirmed manifest revision. Check the Portal for current progress.</p></aside> : null}
          </article>)}</div>
        </section>

        <section className="packet-privacy break-inside-avoid border p-4 text-sm">
          <h2 className="font-semibold">Identity and privacy</h2>
          <p className="mt-2">
            The order, shipment and sample barcodes identify their records. The packet barcode identifies this confirmed revision. Each permanent tube barcode identifies one physical tube. Scanning an identifier does not confirm receipt of material. Do not place patient names, dates of birth, medical record numbers, or other PHI on the packet or tubes.
          </p>
        </section>

        <footer className="border-t bg-background pt-4 text-xs print:fixed print:inset-x-0 print:bottom-0 print:px-4 print:pb-2">
          <p>Packet {packet?.packetNumber} · Barcode {packet?.barcode} · Shipment {shipment.shipmentNumber}</p>
        </footer>
      </article>
    </main>
  )
}

function SampleInstructions({ entry, index }: { entry: JsonObject; index: number }) {
  const sampleType = asObject(entry.sampleType)
  const rule = asObject(entry.instructionRule)
  return (
    <article className="break-inside-avoid border-t pt-4">
      <h3 className="font-semibold">{text(sampleType.name) || `Sample type ${index + 1}`}</h3>
      <Instruction label="Material" value={sampleType.materialClass} />
      <Instruction label="Required quantity" value={quantityRange(sampleType)} />
      <Instruction label="Primary container" value={sampleType.primaryContainerRequirements} />
      <Instruction label="Temperature" value={sampleType.temperatureRequirements} />
      <Instruction label="Stabilizer" value={sampleType.stabilizerRequirements} />
      <Instruction label="Sample preparation and packaging" value={sampleType.packagingInstructions} />
      <Instruction label="Customer labeling" value={sampleType.labelingInstructions} />
      <Instruction label="Prohibited identifiers" value={sampleType.prohibitedIdentifiers} />
      <Instruction label="Safety" value={sampleType.safetyRequirements} />
      <Instruction label="Packing" value={rule.packingInstructions} />
      <Instruction label="Temperature during transit" value={rule.temperatureInstructions} />
      <Instruction label="Carrier" value={rule.carrierInstructions} />
      <Instruction label="Dispatch timing" value={rule.dispatchInstructions} />
      <Instruction label="Delivery" value={rule.deliveryInstructions} />
      <Instruction label="Documents to include" value={rule.requiredDocuments} />
      <Instruction label="Exceptions" value={rule.exceptionInstructions} />
      <Instruction label="International customs" value={rule.internationalCustomsInstructions} />
    </article>
  )
}

function readFrozenSamples(manifest: JsonObject): FrozenSample[] {
  const groups = new Map<string, FrozenSample>()
  for (const item of asObjects(manifest.samples)) {
    const id = text(item.submittedSpecimenId) || JSON.stringify([item.customerSampleId, item.sampleName])
    let group = groups.get(id)
    if (!group) {
      group = { id, customerSampleId: text(item.customerSampleId), sampleName: text(item.sampleName), sampleTypeName: text(item.sampleTypeName), sampleBarcode: text(item.sampleBarcode), totalTubeCount: Number(item.totalSampleTubeCount) || 0, unallocatedTubeCount: Number(item.unallocatedTubeCount) || 0, otherShipments: asObjects(item.otherShipments).map(other => ({ shipmentNumber: text(other.shipmentNumber), tubeCount: Number(other.tubeCount) || 0 })), tubes: [] }
      groups.set(id, group)
    }
    group.tubes.push({ barcode: text(item.supplierTubeBarcode), ordinal: text(item.tubeOrdinal), quantity: text(item.quantity), quantityUnit: text(item.quantityUnit) })
  }
  return [...groups.values()].map(group => ({ ...group, totalTubeCount: group.totalTubeCount || group.tubes.length }))
}

function quantityRange(sampleType: JsonObject) {
  const unit = text(sampleType.quantityUnit)
  const minimum = text(sampleType.minimumQuantity)
  const maximum = text(sampleType.maximumQuantity)
  if (minimum && maximum) return `${minimum}–${maximum} ${unit}`
  if (minimum) return `At least ${minimum} ${unit}`
  if (maximum) return `No more than ${maximum} ${unit}`
  return unit
}

function parseObject(value: string): JsonObject {
  try {
    return asObject(JSON.parse(value) as unknown)
  } catch {
    return {}
  }
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}
}

function asObjects(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.map(asObject) : []
}

function text(value: unknown) {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return ''
}

function PacketReturnLink({ shipmentId }: { shipmentId: string }) {
  return <Link to="/sample-shipping/$shipmentId" params={{ shipmentId }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft aria-hidden="true" className="size-4" />Back to shipment</Link>
}

function Instruction({ label, value }: { label: string; value: unknown }) {
  const content = text(value)
  if (!content) return null
  return (
    <div className="mt-3">
      <h4 className="text-sm font-medium">{label}</h4>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{content}</p>
    </div>
  )
}
