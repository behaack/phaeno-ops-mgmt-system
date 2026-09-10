import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { getSampleShippingPacket } from '#/api/sample-shipping'
import { apiErrorMessage } from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { ShippingBarcode } from './ShippingBarcode'
import type { ShippingInsertIdentity } from './shipping-insert-acknowledgement'
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

export function SampleShippingPacketPage({ shipmentId, autoPrint = false, onAutoPrint, onFailure, embedded = false }: { shipmentId: string; autoPrint?: boolean; onAutoPrint?: (insert: ShippingInsertIdentity) => void; onFailure?: (message: string) => void; embedded?: boolean }) {
  const autoPrintHandled = useRef(false)
  const query = useQuery({
    queryKey: ['sample-shipping-packet', shipmentId],
    queryFn: () => getSampleShippingPacket(shipmentId),
    refetchOnMount: 'always',
    refetchOnWindowFocus: !embedded,
    refetchOnReconnect: !embedded,
  })
  const currentPacket = query.data?.shipment.currentPacket
  const printable = !query.isLoading && !query.isFetching && query.fetchStatus !== 'paused' && !query.error && Boolean(currentPacket && !currentPacket.isVoided)
  const failure = query.fetchStatus === 'paused'
    ? 'Reconnect so the Portal can check the current shipping insert before printing.'
    : !query.isLoading && !query.isFetching
      ? query.error ? apiErrorMessage(query.error) : !currentPacket || currentPacket.isVoided ? 'The shipping insert is no longer current. Refresh the shipment and try again.' : null
      : null
  useEffect(() => { if (failure) onFailure?.(failure) }, [failure, onFailure])
  useEffect(() => {
    if (!autoPrint) { autoPrintHandled.current = false; return }
    if (!printable || !currentPacket || autoPrintHandled.current) return
    const frame = window.requestAnimationFrame(() => {
      autoPrintHandled.current = true
      if (onAutoPrint) onAutoPrint({ id: currentPacket.id, revision: currentPacket.revision, packetNumber: currentPacket.packetNumber })
      else window.print()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [autoPrint, currentPacket, onAutoPrint, printable])

  if (query.isLoading || query.isFetching) {
    return <main className="page-wrap space-y-5 px-4 py-8"><PacketReturnLink shipmentId={shipmentId} /><p role="status">Checking the current shipping insert…</p></main>
  }

  if (query.fetchStatus === 'paused') {
    return <main className="page-wrap space-y-5 px-4 py-8"><PacketReturnLink shipmentId={shipmentId} /><Alert><AlertTitle>Connection needed</AlertTitle><AlertDescription>Reconnect so the Portal can check the current shipping insert revision before printing.</AlertDescription></Alert></main>
  }

  if (query.error || !query.data) {
    return (
      <main className="page-wrap space-y-5 px-4 py-8">
        <PacketReturnLink shipmentId={shipmentId} />
        <Alert variant="destructive">
          <AlertTitle>Shipping insert unavailable</AlertTitle>
          <AlertDescription>
            {query.error ? apiErrorMessage(query.error) : 'The shipping insert was not found.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
      </main>
    )
  }

  const { shipment } = query.data
  const packet = shipment.currentPacket
  if (!packet || packet.isVoided) return <main className="page-wrap space-y-5 px-4 py-8"><PacketReturnLink shipmentId={shipmentId} /><Alert><AlertTitle>Shipping insert no longer current</AlertTitle><AlertDescription>Return to the shipment to review its current contents and shipping insert revision before printing.</AlertDescription></Alert><Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></main>
  const destination = parseObject(query.data.destinationSnapshotJson)
  const instructions = parseObject(query.data.instructionSnapshotJson)
  const manifest = parseObject(query.data.manifestSnapshotJson)
  const frozenSamples = readFrozenSamples(manifest)

  return (
    <main className="shipping-packet-page page-wrap px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <style>{`@media print { @page { margin: 10mm 12mm 15mm !important; @bottom-left { content: ${JSON.stringify(`Shipping insert ${packet.packetNumber} · Barcode ${packet.barcode} · Shipment ${shipment.shipmentNumber}`)}; font: 8pt Arial, sans-serif; color: black; } } }`}</style>
      {!embedded ? <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <PacketReturnLink shipmentId={shipmentId} />
        <Button onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          Print shipping insert
        </Button>
      </div> : null}

      <article data-packet-id={packet.id} data-packet-revision={packet.revision} className="shipping-packet mx-auto max-w-4xl space-y-8 bg-background pb-16 text-foreground print:max-w-none print:bg-white print:text-black">
        <header className="packet-header break-inside-avoid border-b pb-5">
          <div className="flex items-center justify-between gap-4"><img src="/phaeno124x40.webp" alt="Phaeno" width={124} height={40} /><p className="text-sm font-medium uppercase tracking-wide">Shipping insert</p></div>
          <h1 className="mt-2 text-3xl font-semibold">{packet?.packetNumber}</h1>
          <p className="mt-3 text-sm">Revision {packet.revision} · Place inside this container</p>
        </header>

        <section aria-label="Receiving summary" className="packet-summary grid gap-3 text-sm sm:grid-cols-2">
          <p><strong>Customer</strong><br />{shipment.organizationName}</p>
          <p><strong>Job / Trial</strong><br />{text(manifest.authorizationReference) || shipment.authorizationReference}</p>
          <p><strong>Shipment</strong><br />{text(manifest.shipmentNumber) || shipment.shipmentNumber}</p>
          <p><strong>Contents in this container</strong><br />{frozenSamples.length} {frozenSamples.length === 1 ? 'sample' : 'samples'} · {frozenSamples.reduce((count, sample) => count + sample.tubes.length, 0)} tubes</p>
          {text(asObject(manifest.container).commonName) ? <p className="sm:col-span-2"><strong>Container</strong><br />{text(asObject(manifest.container).commonName)} · SKU {text(asObject(manifest.container).sku)}</p> : null}
        </section>

        <section aria-label="Receiving barcodes" className="packet-scan-targets">
          <div className="packet-scan-target">
            <h2 className="font-semibold">Scan to receive this shipment</h2>
            <p className="text-sm">Shipping insert QR code · current revision</p>
            <ShippingBarcode value={packet.barcode} label="Shipping insert revision barcode" size="receiving" />
          </div>
          {text(asObject(manifest.containerKit).barcode) ? <div className="packet-scan-target">
            <h2 className="font-semibold">Physical container reference</h2>
            <p className="text-sm">Match to the barcode on the container</p>
            <ShippingBarcode value={text(asObject(manifest.containerKit).barcode)} label="Container barcode" size="receiving" />
          </div> : null}
        </section>

        <section className="packet-receiving-notes space-y-3 text-sm">
          <h2 className="font-semibold">Receiving notes</h2>
          {receivingInstructions(instructions).map(value => <p key={value}>{value}</p>)}
          <p>Open the shipment in POMS for the complete sample and tube list. Accession each physical tube separately.</p>
          <p><strong>Missing, damaged or unexpected contents?</strong> Record the discrepancy before proceeding.{text(destination.receivingEmail) ? ` Contact: ${text(destination.receivingEmail)}.` : ''}{text(destination.receivingPhone) ? ` Phone: ${text(destination.receivingPhone)}.` : ''}</p>
        </section>

        <details className="packet-full-details print:hidden">
          <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4">Full packing instructions and sample / tube list</summary>
          <p className="mt-3 text-sm text-muted-foreground">Review these instructions before shipping. Printing produces the receiving sheet above; retain the full tube list using Download tube list (CSV) on the shipment.</p>
          <div className="mt-6 space-y-8">
          {text(manifest.orderBarcode) ? <ShippingBarcode value={text(manifest.orderBarcode)} label="Order barcode" /> : null}
          {text(manifest.shipmentBarcode) ? <ShippingBarcode value={text(manifest.shipmentBarcode)} label="Shipment barcode" /> : null}

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
            Follow every instruction for each sample type in this shipping insert. Contact Phaeno before shipping if any requirement cannot be met.
          </p>
          <div className="mt-5 space-y-6">
            {asObjects(instructions.samples).map((entry, index) => (
              <SampleInstructions entry={entry} index={index} key={index} />
            ))}
          </div>
        </section>

        <section className="packet-manifest">
          <h2 className="text-xl font-semibold">Sample and tube list</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This confirmed manifest lists only the physical contents of this container. Retain the tube list for your records.
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
            The order, shipment and sample barcodes identify their records. The shipping insert barcode identifies this confirmed revision. The container barcode identifies the physical container, and each permanent tube barcode identifies one physical tube. Scanning an identifier does not confirm receipt of material. Do not place patient names, dates of birth, medical record numbers, or other PHI on the shipping insert or tubes.
          </p>
        </section>

          </div>
        </details>

        <footer className="border-t bg-background pt-4 text-xs print:fixed print:inset-x-0 print:bottom-0 print:px-4 print:pb-2">
          <p>Shipping insert {packet?.packetNumber} · Barcode {packet?.barcode} · Shipment {shipment.shipmentNumber}</p>
        </footer>
      </article>
    </main>
  )
}

function receivingInstructions(instructions: JsonObject): string[] {
  const notes = new Set<string>()
  for (const entry of asObjects(instructions.samples)) {
    const sampleType = asObject(entry.sampleType)
    const rule = asObject(entry.instructionRule)
    for (const value of [sampleType.temperatureRequirements, rule.temperatureInstructions, sampleType.safetyRequirements]) {
      const note = text(value).trim()
      if (note) notes.add(note)
    }
  }
  return [...notes]
}

function SampleInstructions({ entry, index }: { entry: JsonObject; index: number }) {
  const sampleType = asObject(entry.sampleType)
  const rule = asObject(entry.instructionRule)
  return (
    <article className="border-t pt-4">
      <h3 className="font-semibold">{text(sampleType.name) || `Sample type ${index + 1}`}</h3>
      <div className="packet-instruction-fields">
        <Instruction label="Material" value={materialClassLabel(sampleType.materialClass)} />
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
      </div>
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

function materialClassLabel(value: unknown) {
  const materialClass = text(value)
  return materialClass === 'extracted_rna' ? 'Extracted RNA' : materialClass
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
    <div className="mt-3 break-inside-avoid">
      <h4 className="text-sm font-medium">{label}</h4>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{content}</p>
    </div>
  )
}
