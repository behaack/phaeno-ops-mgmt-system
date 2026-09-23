import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Printer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { getSampleShippingPacket } from '#/api/sample-shipping'
import { apiErrorMessage } from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { ShippingBarcode } from './ShippingBarcode'
import type { ShippingInsertIdentity } from './shipping-insert-acknowledgement'
import './sample-shipping-packet.css'

type JsonObject = Record<string, unknown>
const manifestPageSize = 8
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

export function SampleShippingPacketPage({ shipmentId, autoPrint = false, onAutoPrint, onFailure, embedded = false, packingOnly = false, onPrint }: { shipmentId: string; autoPrint?: boolean; onAutoPrint?: (insert: ShippingInsertIdentity) => void; onFailure?: (message: string) => void; embedded?: boolean; packingOnly?: boolean; onPrint?: () => void }) {
  const Page = packingOnly ? 'div' : 'main'
  const autoPrintHandled = useRef(false)
  const [manifestPage, setManifestPage] = useState<{ revisionKey: string; page: number } | null>(null)
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
    return <Page className="page-wrap space-y-5 px-4 py-8">{!packingOnly ? <PacketReturnLink shipmentId={shipmentId} /> : null}<p role="status">Checking the current shipping insert…</p></Page>
  }

  if (query.fetchStatus === 'paused') {
    return <Page className="page-wrap space-y-5 px-4 py-8">{!packingOnly ? <PacketReturnLink shipmentId={shipmentId} /> : null}<Alert><AlertTitle>Connection needed</AlertTitle><AlertDescription>Reconnect so the Portal can check the current shipping insert revision before printing.</AlertDescription></Alert></Page>
  }

  if (query.error || !query.data) {
    return (
      <Page className="page-wrap space-y-5 px-4 py-8">
        {!packingOnly ? <PacketReturnLink shipmentId={shipmentId} /> : null}
        <Alert variant="destructive">
          <AlertTitle>Shipping insert unavailable</AlertTitle>
          <AlertDescription>
            {query.error ? apiErrorMessage(query.error) : 'The shipping insert was not found.'}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void query.refetch()}>Try again</Button>
      </Page>
    )
  }

  const { shipment } = query.data
  const packet = shipment.currentPacket
  if (!packet || packet.isVoided) return <Page className="page-wrap space-y-5 px-4 py-8">{!packingOnly ? <PacketReturnLink shipmentId={shipmentId} /> : null}<Alert><AlertTitle>Shipping insert no longer current</AlertTitle><AlertDescription>Return to the shipment to review its current contents and shipping insert revision before printing.</AlertDescription></Alert><Button variant="outline" onClick={() => void query.refetch()}>Try again</Button></Page>
  const destination = parseObject(query.data.destinationSnapshotJson)
  const instructions = parseObject(query.data.instructionSnapshotJson)
  const manifest = parseObject(query.data.manifestSnapshotJson)
  const frozenSamples = readFrozenSamples(manifest)
  const revisionKey = `${shipmentId}:${packet.id}:${packet.revision}`
  const manifestPages = Math.max(1, Math.ceil(frozenSamples.length / manifestPageSize))
  const page = manifestPage?.revisionKey === revisionKey ? Math.min(manifestPage.page, manifestPages - 1) : 0
  const visibleSamples = frozenSamples.slice(page * manifestPageSize, (page + 1) * manifestPageSize)

  if (packingOnly) return <div className="space-y-6 wrap-anywhere" data-packet-id={packet.id} data-packet-revision={packet.revision}>
    <p className="text-sm text-muted-foreground">Shipment {shipment.shipmentNumber} · Shipping insert {packet.packetNumber} · revision {packet.revision}</p>
    <FrozenPackingInstructions destination={destination} instructions={instructions} />
    {onPrint ? <div className="border-t pt-4"><p className="mb-3 text-sm text-muted-foreground">Printing creates the receiving sheet to place inside this container. Return to these instructions at any time from the shipment’s Actions menu.</p><Button onClick={onPrint}><Printer aria-hidden="true" data-icon="inline-start" />Print shipping insert</Button></div> : null}
  </div>

  return (
    <Page className="shipping-packet-page page-wrap px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <style>{`@media print { @page { margin: 10mm 12mm 15mm !important; @bottom-left { content: ${JSON.stringify(`Shipping insert ${packet.packetNumber} · Barcode ${packet.barcode} · Shipment ${shipment.shipmentNumber}`)}; font: 8pt Arial, sans-serif; color: black; } } }`}</style>
      {!embedded ? <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        {!packingOnly ? <PacketReturnLink shipmentId={shipmentId} /> : null}
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

        <FrozenPackingInstructions destination={destination} instructions={instructions} />

        <section className="packet-manifest">
          <h2 className="text-xl font-semibold">Sample and tube list</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This confirmed manifest lists only the physical contents of this container. Retain the tube list for your records.
          </p>
          {manifestPages > 1 ? <nav aria-label="Manifest sample pages" className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground">Samples {page * manifestPageSize + 1}–{Math.min((page + 1) * manifestPageSize, frozenSamples.length)} of {frozenSamples.length}</p>
            <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setManifestPage({ revisionKey, page: page - 1 })}>Previous samples</Button><Button variant="outline" size="sm" disabled={page === manifestPages - 1} onClick={() => setManifestPage({ revisionKey, page: page + 1 })}>Next samples</Button></div>
          </nav> : null}
          <div className="packet-samples mt-4 space-y-5">{visibleSamples.map(item => <article key={item.id} className="packet-sample rounded-md border p-4">
            <header className="break-inside-avoid space-y-2"><h3 className="wrap-anywhere font-semibold">{item.customerSampleId}</h3><p className="text-sm">{item.sampleName}{item.sampleTypeName ? ` · ${item.sampleTypeName}` : ''}</p><p className="text-sm font-medium">{item.tubes.length} of {item.totalTubeCount} tubes in this shipment</p>{item.sampleBarcode ? <div className="max-w-2xl"><ShippingBarcode value={item.sampleBarcode} label="Sample barcode" /></div> : null}</header>
            <h4 className="mt-4 text-sm font-semibold">Physical tubes in this container</h4>
            <ul className="mt-2 divide-y">{item.tubes.map((tube, index) => <li key={`${tube.barcode}-${index}`} className="packet-tube break-inside-avoid space-y-2 py-3"><p className="text-sm"><span className="hidden wrap-anywhere font-medium print:block">{item.customerSampleId}</span>Tube {tube.ordinal || index + 1}{tube.quantity ? ` · Customer-declared material: ${tube.quantity} ${tube.quantityUnit}` : ' · Customer-declared material: unknown'}</p>{tube.barcode ? <div className="max-w-2xl"><ShippingBarcode value={tube.barcode} label="Permanent tube barcode" /></div> : <p className="text-sm">No tube barcode recorded in this revision.</p>}</li>)}</ul>
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
    </Page>
  )
}

function FrozenPackingInstructions({ destination, instructions }: { destination: JsonObject; instructions: JsonObject }) {
  const containerPacking = asObject(instructions.containerPacking)
  const sharedProcedures = [...new Map(asObjects(instructions.samples).map(entry => asObject(entry.instructionRule)).filter(rule => rule.shippingProcedureId).map(rule => [text(rule.shippingProcedureId), rule])).values()]
  return <div className="space-y-8">
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
          <Instruction label="Receiving hours" value={[text(destination.receivingHours), text(destination.timeZoneId)].filter(Boolean).join(' · ')} />
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
            {sharedProcedures.map((rule, index) => <article key={text(rule.shippingProcedureId)} className="rounded-lg border p-4"><h3 className="font-semibold">Common shipping steps{sharedProcedures.length > 1 ? ` ${index + 1}` : ''}</h3><p className="mt-1 text-sm text-muted-foreground">Applies to: {[...new Set(asObjects(instructions.samples).filter(entry => asObject(entry.instructionRule).shippingProcedureId === rule.shippingProcedureId).map(entry => text(asObject(entry.sampleType).name)).filter(Boolean))].join(', ')}</p><ShippingSteps rule={rule} /></article>)}
            {containerPacking.temperatureControlInstructions ? <article className="rounded-lg border p-4"><h3 className="font-semibold">Temperature control for this container</h3><p className="mt-1 text-sm">{text(containerPacking.commonName)} · revision {text(containerPacking.revision)}</p><Instruction label="Approved method and amount" value={containerPacking.temperatureControlInstructions} /><Instruction label="Container notes" value={containerPacking.packingInstructions} /></article> : null}
            {asObjects(instructions.samples).map((entry, index) => (
              <SampleInstructions entry={entry} index={index} key={index} packing={asObjects(containerPacking.samples).find(pair => pair.sampleTypeId === asObject(entry.sampleType).id)} />
            ))}
          </div>
        </section>

  </div>
}

function receivingInstructions(instructions: JsonObject): string[] {
  const notes = new Set<string>()
  const control = text(asObject(instructions.containerPacking).temperatureControlInstructions).trim()
  if (control) notes.add(control)
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

function SampleInstructions({ entry, index, packing }: { entry: JsonObject; index: number; packing?: JsonObject }) {
  const sampleType = asObject(entry.sampleType)
  const rule = asObject(entry.instructionRule)
  return (
    <article className="border-t pt-4">
      <h3 className="font-semibold">{text(sampleType.name) || `Sample type ${index + 1}`}</h3>
      <div className="packet-instruction-fields">
        <Instruction label="Material" value={materialClassLabel(sampleType.materialClass)} />
        <Instruction label="Required quantity" value={quantityRange(sampleType)} />
        <Instruction label="Sample tube or vessel" value={sampleType.primaryContainerRequirements} />
        <Instruction label="Preservation requirements" value={sampleType.temperatureRequirements} />
        <Instruction label="Stabilizer" value={sampleType.stabilizerRequirements} />
        <Instruction label="Maximum transit time" value={text(sampleType.maximumTransitHours) ? `${text(sampleType.maximumTransitHours)} hours` : ''} />
        {!rule.shippingProcedureId ? <Instruction label="Sample preparation and packaging" value={sampleType.packagingInstructions} /> : null}
        <Instruction label="Customer labeling" value={sampleType.labelingInstructions} />
        <Instruction label="Prohibited identifiers" value={sampleType.prohibitedIdentifiers} />
        <Instruction label="Safety" value={sampleType.safetyRequirements} />
        <Instruction label="Packing steps for this sample and container" value={packing?.packingInstructions} />
        {!rule.shippingProcedureId ? <><Instruction label="Sample carrier restrictions" value={sampleType.carrierRestrictions} /><ShippingSteps rule={rule} /></> : null}
        <Instruction label="Destination-specific additions" value={rule.destinationInstructions} />
        <Instruction label="Delivery" value={rule.deliveryInstructions} />
      </div>
    </article>
  )
}

function ShippingSteps({ rule }: { rule: JsonObject }) {
  return <><Instruction label="Packing" value={rule.packingInstructions} /><Instruction label="Transit handling" value={rule.temperatureInstructions} /><Instruction label="Carrier" value={rule.carrierInstructions} /><Instruction label="Dispatch timing" value={rule.dispatchInstructions} /><Instruction label="Documents to include" value={rule.requiredDocuments} /><Instruction label="Exceptions" value={rule.exceptionInstructions} /><Instruction label="International customs" value={rule.internationalCustomsInstructions} /></>
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
    group.tubes.push({ barcode: text(item.supplierTubeBarcode), ordinal: text(item.tubeOrdinal), quantity: text(item.customerDeclaredQuantity), quantityUnit: text(item.customerDeclaredQuantityUnit) })
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
