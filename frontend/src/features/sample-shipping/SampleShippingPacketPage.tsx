import { BackLink } from '#/components/ui/back-link'
import { CustomerSourceText, useCustomerSourceText } from '#/features/customer-i18n/customer-text'
import { CustomerText, useCustomerText } from '#/features/customer-i18n/customer-text'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Printer } from 'lucide-react'
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

export function SampleShippingPacketPage({ shipmentId, autoPrint = false, onAutoPrint, onFailure, embedded = false, packingOnly = false, expectedInsert }: { shipmentId: string; autoPrint?: boolean; onAutoPrint?: (insert: ShippingInsertIdentity) => void; onFailure?: (message: string) => void; embedded?: boolean; packingOnly?: boolean; expectedInsert?: ShippingInsertIdentity }) {
  const __customerSource = useCustomerSourceText()

  const __customerText = useCustomerText()

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
    return <Page className="page-wrap space-y-5 px-4 py-8">{!packingOnly ? <PacketReturnLink shipmentId={shipmentId} /> : null}<p role="status"><CustomerText message="m_762477bd629b" /></p></Page>
  }

  if (query.fetchStatus === 'paused') {
    return <Page className="page-wrap space-y-5 px-4 py-8">{!packingOnly ? <PacketReturnLink shipmentId={shipmentId} /> : null}<Alert><AlertTitle><CustomerText message="m_c2d745d71c8a" /></AlertTitle><AlertDescription><CustomerText message="m_bef475f94fd9" /></AlertDescription></Alert></Page>
  }

  if (query.error || !query.data) {
    return (
      <Page className="page-wrap space-y-5 px-4 py-8">
        {!packingOnly ? <PacketReturnLink shipmentId={shipmentId} /> : null}
        <Alert variant="destructive">
          <AlertTitle><CustomerText message="m_7585977e794c" /></AlertTitle>
          <AlertDescription>
            {query.error ? apiErrorMessage(query.error) : __customerText('m_66c91b7d865e')}
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => void query.refetch()}><CustomerText message="m_d8b8392e2c54" /></Button>
      </Page>
    )
  }

  const { shipment } = query.data
  const packet = shipment.currentPacket
  if (!packet || packet.isVoided) return <Page className="page-wrap space-y-5 px-4 py-8">{!packingOnly ? <PacketReturnLink shipmentId={shipmentId} /> : null}<Alert><AlertTitle><CustomerText message="m_f33e8d1fbe2c" /></AlertTitle><AlertDescription><CustomerText message="m_ab73b62901f0" /></AlertDescription></Alert><Button variant="outline" onClick={() => void query.refetch()}><CustomerText message="m_d8b8392e2c54" /></Button></Page>
  if (expectedInsert && (packet.id !== expectedInsert.id || packet.revision !== expectedInsert.revision)) return <Alert variant="destructive"><AlertTitle><CustomerText message="m_bbfeca2a3f76" /></AlertTitle><AlertDescription><CustomerText message="m_dedf42b4b591" /></AlertDescription></Alert>
  const destination = parseObject(query.data.destinationSnapshotJson)
  const instructions = parseObject(query.data.instructionSnapshotJson)
  const manifest = parseObject(query.data.manifestSnapshotJson)
  const frozenSamples = readFrozenSamples(manifest)
  const revisionKey = `${shipmentId}:${packet.id}:${packet.revision}`
  const manifestPages = Math.max(1, Math.ceil(frozenSamples.length / manifestPageSize))
  const page = manifestPage?.revisionKey === revisionKey ? Math.min(manifestPage.page, manifestPages - 1) : 0
  const visibleSamples = frozenSamples.slice(page * manifestPageSize, (page + 1) * manifestPageSize)

  if (packingOnly) return <div className="space-y-6 wrap-anywhere" data-packet-id={packet.id} data-packet-revision={packet.revision}>
    <p className="text-sm text-muted-foreground"><CustomerText message="m_0e7049acc0d7" />{shipment.shipmentNumber} <CustomerText message="m_d393cbdae650" />{packet.packetNumber} <CustomerText message="m_3b0e4579f573" />{packet.revision}</p>
    <FrozenPackingInstructions destination={destination} instructions={instructions} />
  </div>

  return (
    <Page className="shipping-packet-page page-wrap px-4 py-8 print:max-w-none print:px-0 print:py-0">
      <style>{__customerText('m_e3fb25f248a0', { p0: String(JSON.stringify(`Shipping insert ${packet.packetNumber} · Barcode ${packet.barcode} · Shipment ${shipment.shipmentNumber}`)) })}</style>
      {!embedded ? <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        {!packingOnly ? <PacketReturnLink shipmentId={shipmentId} /> : null}
        <Button onClick={() => window.print()}>
          <Printer data-icon="inline-start" />
          <CustomerText message="m_84eeca69e626" /></Button>
      </div> : null}

      <article data-packet-id={packet.id} data-packet-revision={packet.revision} className="shipping-packet mx-auto max-w-4xl space-y-8 bg-background pb-16 text-foreground print:max-w-none print:bg-white print:text-black">
        <header className="packet-header break-inside-avoid border-b pb-5">
          <div className="flex items-center justify-between gap-4"><img src="/phaeno124x40.webp" alt={__customerSource("Phaeno")} width={124} height={40} /><p className="text-sm font-medium uppercase tracking-wide"><CustomerText message="m_388945d1466a" /></p></div>
          <h1 className="mt-2 text-3xl font-semibold">{packet?.packetNumber}</h1>
          <p className="mt-3 text-sm"><CustomerText message="m_e330d85ff901" />{packet.revision} <CustomerText message="m_6192d81774e7" /></p>
        </header>

        <section aria-label={__customerText('m_2b2174b49e78')} className="packet-summary grid gap-3 text-sm sm:grid-cols-2">
          <p><strong><CustomerText message="m_bf3763383aaf" /></strong><br />{shipment.organizationName}</p>
          <p><strong><CustomerText message="m_92a6fe8fa823" /></strong><br />{text(manifest.authorizationReference) || shipment.authorizationReference}</p>
          <p><strong><CustomerText message="m_dfee01bfef72" /></strong><br />{text(manifest.shipmentNumber) || shipment.shipmentNumber}</p>
          <p><strong><CustomerText message="m_129eced24674" /></strong><br />{frozenSamples.length} {frozenSamples.length === 1 ? <CustomerSourceText source={"sample"} /> : __customerText('m_24baa7a731ce')} · {frozenSamples.reduce((count, sample) => count + sample.tubes.length, 0)} <CustomerText message="m_0f4552851513" /></p>
          {text(asObject(manifest.container).commonName) ? <p className="sm:col-span-2"><strong><CustomerText message="m_0c7823e8c759" /></strong><br />{text(asObject(manifest.container).commonName)} <CustomerText message="m_ce92c91a9097" />{text(asObject(manifest.container).sku)}</p> : null}
        </section>

        <section aria-label={__customerText('m_f63ad974321d')} className="packet-scan-targets">
          <div className="packet-scan-target">
            <h2 className="font-semibold"><CustomerText message="m_beaa603e5f5f" /></h2>
            <p className="text-sm"><CustomerText message="m_4e23a11b74dc" /></p>
            <ShippingBarcode value={packet.barcode} label={__customerText('m_5a8201861367')} size="receiving" />
          </div>
          {text(asObject(manifest.containerKit).barcode) ? <div className="packet-scan-target">
            <h2 className="font-semibold"><CustomerText message="m_2cb662cf936c" /></h2>
            <p className="text-sm"><CustomerText message="m_67725fad67bb" /></p>
            <ShippingBarcode value={text(asObject(manifest.containerKit).barcode)} label={__customerText('m_690050a9e7ce')} size="receiving" />
          </div> : null}
        </section>

        <section className="packet-receiving-notes space-y-3 text-sm">
          <h2 className="font-semibold"><CustomerText message="m_2862d64c92bd" /></h2>
          {receivingInstructions(instructions).map(value => <p key={value}>{value}</p>)}
          <p><CustomerText message="m_9390ab697c32" /></p>
          <p><strong><CustomerText message="m_46e50529a18a" /></strong> <CustomerText message="m_b6448e54b59f" />{text(destination.receivingEmail) ? __customerText('m_10a020fe3787', { p0: String(text(destination.receivingEmail)) }) : ''}{text(destination.receivingPhone) ? __customerText('m_f0df88f05670', { p0: String(text(destination.receivingPhone)) }) : ''}</p>
        </section>

        <details className="packet-full-details print:hidden">
          <summary className="cursor-pointer rounded-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4"><CustomerText message="m_475ce374a5e5" /></summary>
          <p className="mt-3 text-sm text-muted-foreground"><CustomerText message="m_98d8b9aca5a3" /></p>
          <div className="mt-6 space-y-8">
          {text(manifest.orderBarcode) ? <ShippingBarcode value={text(manifest.orderBarcode)} label={__customerText('m_33f88e33bf17')} /> : null}
          {text(manifest.shipmentBarcode) ? <ShippingBarcode value={text(manifest.shipmentBarcode)} label={__customerText('m_26e9c817e485')} /> : null}

        <FrozenPackingInstructions destination={destination} instructions={instructions} />

        <section className="packet-manifest">
          <h2 className="text-xl font-semibold"><CustomerText message="m_22e92249f63b" /></h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <CustomerText message="m_7563ee586a3f" /></p>
          {manifestPages > 1 ? <nav aria-label={__customerText('m_26f81af559cf')} className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground"><CustomerText message="m_25d51a4ef1d2" />{page * manifestPageSize + 1}–{Math.min((page + 1) * manifestPageSize, frozenSamples.length)} of {frozenSamples.length}</p>
            <div className="flex gap-2"><Button variant="outline" size="sm" disabled={page === 0} onClick={() => setManifestPage({ revisionKey, page: page - 1 })}><CustomerText message="m_e4c4ce3e9fa8" /></Button><Button variant="outline" size="sm" disabled={page === manifestPages - 1} onClick={() => setManifestPage({ revisionKey, page: page + 1 })}><CustomerText message="m_49c7f8cb9ceb" /></Button></div>
          </nav> : null}
          <div className="packet-samples mt-4 space-y-5">{visibleSamples.map(item => <article key={item.id} className="packet-sample rounded-md border p-4">
            <header className="break-inside-avoid space-y-2"><h3 className="wrap-anywhere font-semibold">{item.customerSampleId}</h3><p className="text-sm">{item.sampleName}{item.sampleTypeName ? ` · ${item.sampleTypeName}` : ''}</p><p className="text-sm font-medium">{item.tubes.length} of {item.totalTubeCount} <CustomerText message="m_6f8b3af8dca6" /></p>{item.sampleBarcode ? <div className="max-w-2xl"><ShippingBarcode value={item.sampleBarcode} label={__customerText('m_6500d1c034ff')} /></div> : null}</header>
            <h4 className="mt-4 text-sm font-semibold"><CustomerText message="m_a9eba104ca62" /></h4>
            <ul className="mt-2 divide-y">{item.tubes.map((tube, index) => <li key={`${tube.barcode}-${index}`} className="packet-tube break-inside-avoid space-y-2 py-3"><p className="text-sm"><span className="hidden wrap-anywhere font-medium print:block">{item.customerSampleId}</span><CustomerText message="m_a04259785d8e" />{tube.ordinal || index + 1}{tube.quantity ? __customerText('m_e4c039943946', { p0: String(tube.quantity), p1: String(tube.quantityUnit) }) : __customerText('m_d03caacd8c85')}</p>{tube.barcode ? <div className="max-w-2xl"><ShippingBarcode value={tube.barcode} label={__customerText('m_c8cc24fb143d')} /></div> : <p className="text-sm"><CustomerText message="m_6d0540a7fb0e" /></p>}</li>)}</ul>
            {item.otherShipments.length || item.unallocatedTubeCount > 0 ? <aside className="mt-3 break-inside-avoid border-t pt-3 text-sm"><h4 className="font-semibold"><CustomerText message="m_83c72c329c0d" /></h4><ul className="mt-2 space-y-1">{item.otherShipments.map(other => <li key={other.shipmentNumber}>{other.tubeCount} {other.tubeCount === 1 ? <CustomerSourceText source={"tube"} /> : __customerText('m_cc169e248ff2')} <CustomerText message="m_fe0a0957f844" />{other.shipmentNumber}</li>)}{item.unallocatedTubeCount > 0 ? <li>{item.unallocatedTubeCount} {item.unallocatedTubeCount === 1 ? <CustomerSourceText source={"tube is"} /> : __customerText('m_fb12a3d0225a')} <CustomerText message="m_5432b5fa4b8f" /></li> : null}</ul><p className="mt-2 text-xs"><CustomerText message="m_5804504237d1" /></p></aside> : null}
          </article>)}</div>
        </section>

        <section className="packet-privacy break-inside-avoid border p-4 text-sm">
          <h2 className="font-semibold"><CustomerText message="m_b6627676269a" /></h2>
          <p className="mt-2">
            <CustomerText message="m_e17d60800818" /></p>
        </section>

          </div>
        </details>

        <footer className="border-t bg-background pt-4 text-xs print:fixed print:inset-x-0 print:bottom-0 print:px-4 print:pb-2">
          <p><CustomerText message="m_a74dbd1de303" />{packet?.packetNumber} <CustomerText message="m_c781d4dff0da" />{packet?.barcode} <CustomerText message="m_973e93882711" />{shipment.shipmentNumber}</p>
        </footer>
      </article>
    </Page>
  )
}

function FrozenPackingInstructions({ destination, instructions }: { destination: JsonObject; instructions: JsonObject }) {
  const __customerText = useCustomerText()

  const containerPacking = asObject(instructions.containerPacking)
  const sharedProcedures = [...new Map(asObjects(instructions.samples).map(entry => asObject(entry.procedure)).filter(rule => rule.shippingProcedureId).map(rule => [text(rule.shippingProcedureId), rule])).values()]
  return <div className="space-y-8">
        <section className="packet-destination break-inside-avoid">
          <h2 className="text-xl font-semibold"><CustomerText message="m_9d4604b03cdc" /></h2>
          <div className="mt-3 text-sm leading-6">
            <p className="font-medium">{text(destination.recipientName)}</p>
            <p>{text(destination.organizationName)}</p>
            <p>{text(destination.addressLine1)}</p>
            {destination.addressLine2 ? <p>{text(destination.addressLine2)}</p> : null}
            <p>
              {text(destination.city)}, {text(destination.stateOrProvince)} {text(destination.postalCode)}
            </p>
            <p>{text(destination.countryCode)}</p>
            {destination.receivingPhone ? <p><CustomerText message="m_b8e5921a04f7" />{text(destination.receivingPhone)}</p> : null}
            {destination.receivingEmail ? <p><CustomerText message="m_620b685b667f" />{text(destination.receivingEmail)}</p> : null}
          </div>
          <Instruction label={__customerText('m_cbc9319052d8')} value={[text(destination.receivingHours), text(destination.timeZoneId)].filter(Boolean).join(' · ')} />
          <Instruction label={__customerText('m_749cd8a1a01e')} value={destination.closureInstructions} />
          <Instruction label={__customerText('m_0d47a57b5032')} value={destination.deliveryInstructions} />
          <Instruction label={__customerText('m_a13344e5100f')} value={destination.carrierRestrictions} />
        </section>

        <section className="packet-instructions">
          <h2 className="text-xl font-semibold"><CustomerText message="m_227f771bd4b8" /></h2>
          <p className="mt-2 text-sm text-muted-foreground">
            <CustomerText message="m_6a39dace3da3" /></p>
          <div className="mt-5 space-y-6">
            {sharedProcedures.map((rule, index) => <article key={text(rule.shippingProcedureId)} className="rounded-lg border p-4"><h3 className="font-semibold"><CustomerText message="m_3615e4f5f591" />{sharedProcedures.length > 1 ? ` ${index + 1}` : ''}</h3><p className="mt-1 text-sm text-muted-foreground"><CustomerText message="m_aadcbe973c99" />{[...new Set(asObjects(instructions.samples).filter(entry => asObject(entry.procedure).shippingProcedureId === rule.shippingProcedureId).map(entry => text(asObject(entry.sampleType).name)).filter(Boolean))].join(', ')}</p><ShippingSteps rule={rule} /></article>)}
            {containerPacking.temperatureControlInstructions ? <article className="rounded-lg border p-4"><h3 className="font-semibold"><CustomerText message="m_6b333d4fd405" /></h3><p className="mt-1 text-sm">{text(containerPacking.commonName)} <CustomerText message="m_3b0e4579f573" />{text(containerPacking.revision)}</p><Instruction label={__customerText('m_78a36a4738a8')} value={containerPacking.temperatureControlInstructions} /><Instruction label={__customerText('m_cc6ae75f7d94')} value={containerPacking.dryIceQuantity ? `${text(containerPacking.dryIceQuantity)} ${text(containerPacking.dryIceUnit)}` : "None"} /><Instruction label={__customerText('m_e9cce7d8bcf6')} value={containerPacking.packingInstructions} /></article> : null}
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
    const rule = asObject(entry.procedure)
    for (const value of [sampleType.temperatureRequirements, rule.temperatureInstructions, sampleType.safetyRequirements]) {
      const note = text(value).trim()
      if (note) notes.add(note)
    }
  }
  return [...notes]
}

function SampleInstructions({ entry, index, packing }: { entry: JsonObject; index: number; packing?: JsonObject }) {
  const __customerText = useCustomerText()

  const sampleType = asObject(entry.sampleType)
  const rule = asObject(entry.procedure)
  return (
    <article className="border-t pt-4">
      <h3 className="font-semibold">{text(sampleType.name) || `Sample type ${index + 1}`}</h3>
      <div className="packet-instruction-fields">
        <Instruction label={__customerText('m_616cb218a65b')} value={materialClassLabel(sampleType.materialClass)} />
        <Instruction label={__customerText('m_d841f514dcdc')} value={quantityRange(sampleType)} />
        <Instruction label={__customerText('m_55bc530e6fda')} value={sampleType.primaryContainerRequirements} />
        <Instruction label={__customerText('m_d8c56cf2a5ac')} value={sampleType.temperatureRequirements} />
        <Instruction label={__customerText('m_e70ba4b02564')} value={sampleType.stabilizerRequirements} />
        <Instruction label={__customerText('m_0db092f918e9')} value={text(sampleType.maximumTransitHours) ? `${text(sampleType.maximumTransitHours)} hours` : ''} />
        {!rule.shippingProcedureId ? <Instruction label={__customerText('m_249f4c00218f')} value={sampleType.packagingInstructions} /> : null}
        <Instruction label={__customerText('m_f94379a379e4')} value={sampleType.labelingInstructions} />
        <Instruction label={__customerText('m_8269b760353a')} value={sampleType.prohibitedIdentifiers} />
        <Instruction label={__customerText('m_726d11bd5b23')} value={sampleType.safetyRequirements} />
        <Instruction label={__customerText('m_a00980d4046a')} value={packing?.packingInstructions} />
        {!rule.shippingProcedureId ? <><Instruction label={__customerText('m_fa1992a6b49d')} value={sampleType.carrierRestrictions} /><ShippingSteps rule={rule} /></> : null}
        <Instruction label={__customerText('m_d681a19929b7')} value={rule.destinationInstructions} />
        <Instruction label={__customerText('m_52bfe584a5fc')} value={rule.deliveryInstructions} />
      </div>
    </article>
  )
}

function ShippingSteps({ rule }: { rule: JsonObject }) {
  const __customerText = useCustomerText()

  return <><Instruction label={__customerText('m_e14fc9d661dc')} value={rule.packingInstructions} /><Instruction label={__customerText('m_6f5671989f9c')} value={rule.temperatureInstructions} /><Instruction label={__customerText('m_271c535631ff')} value={rule.carrierInstructions} /><Instruction label={__customerText('m_783eaac18d95')} value={rule.dispatchInstructions} /><Instruction label={__customerText('m_b389f62a42cd')} value={rule.requiredDocuments} /><Instruction label={__customerText('m_a0c002f91bf9')} value={rule.exceptionInstructions} /><Instruction label={__customerText('m_ed01dad7b410')} value={rule.internationalCustomsInstructions} /></>
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
  return <BackLink asChild><Link to="/sample-shipping/$shipmentId" params={{ shipmentId }}><CustomerText message="m_e482a83daa99" /></Link></BackLink>
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
