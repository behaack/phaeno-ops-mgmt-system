import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Printer } from 'lucide-react'

import { getSampleShippingPacket } from '#/api/sample-shipping'
import { apiErrorMessage } from '#/api/organization-management'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Code39Barcode } from '#/features/lab-operations/Code39Barcode'

type JsonObject = Record<string, unknown>
type FrozenSample = {
  customerSampleId: string
  sampleName: string
  sampleTypeName: string
  quantity: string
  quantityUnit: string
  supplierTubeBarcode: string
}

export function SampleShippingPacketPage({ shipmentId }: { shipmentId: string }) {
  const query = useQuery({
    queryKey: ['sample-shipping-packet', shipmentId],
    queryFn: () => getSampleShippingPacket(shipmentId),
  })

  if (query.isLoading) {
    return <main className="page-wrap px-4 py-8"><p role="status">Loading shipping packet…</p></main>
  }

  if (query.error || !query.data) {
    return (
      <main className="page-wrap px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Packet unavailable</AlertTitle>
          <AlertDescription>
            {query.error ? apiErrorMessage(query.error) : 'The packet was not found.'}
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  const { shipment } = query.data
  const packet = shipment.currentPacket
  const destination = parseObject(query.data.destinationSnapshotJson)
  const instructions = parseObject(query.data.instructionSnapshotJson)
  const manifest = parseObject(query.data.manifestSnapshotJson)
  const frozenSamples = readFrozenSamples(manifest)

  return (
    <main className="page-wrap px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link
          to="/sample-shipping/$shipmentId"
          params={{ shipmentId }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to shipment
        </Link>
        <Button onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          Print packet
        </Button>
      </div>

      <article className="mx-auto max-w-4xl space-y-8 bg-background pb-16 text-foreground print:max-w-none">
        <header className="break-inside-avoid border-b pb-5">
          <p className="text-sm font-medium uppercase tracking-wide">Phaeno sample shipment</p>
          <h1 className="mt-2 text-3xl font-semibold">{packet?.packetNumber}</h1>
          {packet ? (
            <div className="mt-4 max-w-2xl">
              <Code39Barcode value={packet.barcode} />
              <p className="mt-1 text-center font-mono text-base tracking-wider">{packet.barcode}</p>
            </div>
          ) : null}
          <p className="mt-3 text-sm">
            Shipment {shipment.shipmentNumber} · {shipment.authorizationReference}
          </p>
        </header>

        <section className="break-inside-avoid">
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

        <section>
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

        <section>
          <h2 className="text-xl font-semibold">Submission manifest and retained tube crosswalk</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep a copy for your records and place this manifest inside the package.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="border p-2">Customer sample ID</th>
                  <th className="border p-2">Sample</th>
                  <th className="border p-2">Declared quantity</th>
                  <th className="border p-2">Supplier tube barcode</th>
                </tr>
              </thead>
              <tbody>
                {frozenSamples.map((item) => (
                  <tr key={`${item.customerSampleId}-${item.supplierTubeBarcode}`} className="break-inside-avoid">
                    <td className="border p-2 font-medium">{item.customerSampleId}</td>
                    <td className="border p-2">
                      {item.sampleName}
                      {item.sampleTypeName ? <><br /><span className="text-xs">{item.sampleTypeName}</span></> : null}
                    </td>
                    <td className="border p-2">{item.quantity} {item.quantityUnit}</td>
                    <td className="border p-2 font-mono">{item.supplierTubeBarcode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="break-inside-avoid border p-4 text-sm">
          <h2 className="font-semibold">Identity and privacy</h2>
          <p className="mt-2">
            The packet barcode identifies this package. It is not a tube barcode or accession number. Do not place patient names, dates of birth, medical record numbers, or other PHI on the packet or tubes.
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
  return asObjects(manifest.samples).map((item) => ({
    customerSampleId: text(item.customerSampleId),
    sampleName: text(item.sampleName),
    sampleTypeName: text(item.sampleTypeName),
    quantity: text(item.quantity),
    quantityUnit: text(item.quantityUnit),
    supplierTubeBarcode: text(item.supplierTubeBarcode),
  }))
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
