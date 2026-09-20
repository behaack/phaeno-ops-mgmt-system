import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider, useParams } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SampleShippingConfigurationPanel } from './SampleShippingConfigurationPanel'

vi.mock('./ContainerSizesPanel', () => ({ ContainerSizesPanel: () => <div>Container sizes</div> }))

const apiMocks = vi.hoisted(() => ({
  createDestination: vi.fn(),
  createRule: vi.fn(),
  createSampleType: vi.fn(),
  getConfiguration: vi.fn(),
  preview: vi.fn(),
}))

vi.mock('#/api/sample-shipping', () => ({
  createSampleShippingDestination: apiMocks.createDestination,
  createSampleShippingInstructionRule: apiMocks.createRule,
  createSampleTypeDefinition: apiMocks.createSampleType,
  getSampleShippingConfiguration: apiMocks.getConfiguration,
  previewSampleShipping: apiMocks.preview,
}))

describe('SampleShippingConfigurationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getConfiguration.mockResolvedValue(configuration)
  })

  it('automatically previews the selected rule without asking for destination or sample again', async () => {
    apiMocks.preview.mockResolvedValue({
      effectiveAt: '2026-08-17T19:00:00Z',
      destination: configuration.destinations[0],
      compatibilityGroup: 'FROZEN_RNA',
      requiresSeparateShipment: false,
      sampleRules: [{
        sampleType: configuration.sampleTypes[0],
        packingInstructions: 'Use secondary containment.',
        temperatureInstructions: 'Keep frozen.',
        carrierInstructions: 'Use an approved carrier.',
        dispatchInstructions: 'Ship Monday through Wednesday.',
        deliveryInstructions: 'Deliver during receiving hours.',
        requiredDocuments: 'Include the current packet.',
        exceptionInstructions: 'Contact Phaeno if delayed.',
        internationalCustomsInstructions: null,
        requiresSeparateShipment: false,
      }],
    })

    renderPanel('instructions')
    const actions = await screen.findByRole('button', { name: 'Actions' })
    fireEvent.keyDown(actions, { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Preview instructions' }))
    expect(await screen.findByRole('dialog', { name: 'Instructions preview' })).toBeTruthy()
    expect(screen.queryByLabelText('Destination revision')).toBeNull()
    expect(screen.queryByLabelText('Effective at')).toBeNull()
    expect(await screen.findByText('Resolved packet instructions')).toBeTruthy()
    expect(apiMocks.preview).toHaveBeenCalledWith(expect.objectContaining({
      destinationId: configuration.destinations[0].id,
      sampleTypeDefinitionIds: [configuration.sampleTypes[0].id],
    }))
    expect(screen.getByText(/Ship Monday through Wednesday/)).toBeTruthy()
  })

  it('opens an immutable new revision instead of editing the current destination row', async () => {
    renderPanel('destinations')

    await screen.findByText('Ship-to destinations')
    fireEvent.click(screen.getAllByRole('button', { name: 'Create revision' })[0])

    expect(screen.getByRole('heading', { name: 'Create West laboratory revision 2' })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Destination code' })).toBeNull()
    apiMocks.createDestination.mockRejectedValue(new Error('Temporary save failure'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Display name' }), { target: { value: 'Renamed receiving lab' } })
    fireEvent.submit(document.getElementById('sample-shipping-destination-form')!)
    await waitFor(() => expect(apiMocks.createDestination).toHaveBeenCalledWith(expect.objectContaining({ code: configuration.destinations[0].code, name: 'Renamed receiving lab', supersedesDestinationId: configuration.destinations[0].id })))
    expect(screen.getByText(/current revision will end/i)).toBeTruthy()
  })

  it('generates a destination reference once and keeps it when retrying a failed save', async () => {
    apiMocks.createDestination.mockRejectedValue(new Error('Temporary save failure'))
    renderPanel('destinations')
    fireEvent.click(await screen.findByRole('button', { name: 'Add destination' }))
    expect(screen.queryByRole('textbox', { name: 'Destination code' })).toBeNull()
    for (const [label, value] of [
      ['Display name', 'Receiving lab'], ['Recipient or receiving team', 'Receiving team'],
      ['Receiving organization', 'Phaeno'], ['Address line 1', '123 Test Street'],
      ['City', 'Santa Barbara'], ['State, province, or region', 'CA'], ['Postal code', '93106'],
      ['Receiving hours', 'Monday-Friday, 9 AM-5 PM'], ['Detailed delivery instructions', 'Deliver to receiving.'],
    ]) fireEvent.change(screen.getByRole('textbox', { name: label }), { target: { value } })
    fireEvent.submit(document.getElementById('sample-shipping-destination-form')!)
    await waitFor(() => expect(apiMocks.createDestination).toHaveBeenCalledTimes(1))
    const code = apiMocks.createDestination.mock.calls[0][0].code
    expect(code).toMatch(/^DEST-[A-F0-9]{32}$/)
    await screen.findByText('Destination revision was not saved')
    fireEvent.submit(document.getElementById('sample-shipping-destination-form')!)
    await waitFor(() => expect(apiMocks.createDestination).toHaveBeenCalledTimes(2))
    expect(apiMocks.createDestination.mock.calls[1][0].code).toBe(code)
  })

  it('selects one sample identity and shows its latest active revision instead of a newer draft', async () => {
    const original = configuration.sampleTypes[0]
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, sampleTypes: [
      { ...original, effectiveTo: '2020-01-01T00:00:00Z' },
      { ...original, id: '22222222-2222-4222-8222-222222222223', revision: 2, name: 'Current Total RNA', effectiveFrom: '2020-01-01T00:00:00Z', effectiveTo: null },
      { ...original, id: '22222222-2222-4222-8222-222222222224', revision: 3, name: 'Draft RNA', isActive: false },
      { ...original, id: '22222222-2222-4222-8222-222222222225', revision: 4, name: 'Future RNA', effectiveFrom: '2099-01-01T00:00:00Z' },
    ] })
    renderPanel('instructions')
    fireEvent.click(await screen.findByRole('button', { name: 'Add instruction rule' }))
    const selector = screen.getByRole('combobox', { name: 'Sample type' })
    expect(within(selector).getAllByRole('option')).toHaveLength(2)
    expect(within(selector).getByRole('option', { name: 'Current Total RNA' })).toBeTruthy()
    fireEvent.change(selector, { target: { value: original.id } })
    expect(screen.getByText('Currently using revision 2 · Active')).toBeTruthy()
    expect(screen.getByText(/A shared handling label/)).toBeTruthy()
  })

  it('offers only sample-size units without symbol entries and defaults Min to one', async () => {
    renderPanel('sample-types')
    fireEvent.click(await screen.findByRole('button', { name: 'Add sample type' }))
    const unit = screen.getByRole('textbox', { name: 'Submission unit' }) as HTMLInputElement
    expect((screen.getByRole('textbox', { name: 'Min' }) as HTMLInputElement).value).toBe('1')
    expect((screen.getByRole('textbox', { name: 'Max (optional)' }) as HTMLInputElement).value).toBe('')
    expect(screen.queryByRole('button', { name: 'Choose submission unit' })).toBeNull()
    fireEvent.change(unit, { target: { value: '20  tube' } })
    unit.focus()
    unit.setSelectionRange(3, 3)
    fireEvent.select(unit)
    fireEvent.blur(unit)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Units for Submission unit' }), { key: 'ArrowDown' })
    expect(await screen.findByRole('menuitem', { name: 'µL' })).toBeTruthy()
    expect(screen.getAllByRole('menuitem').map(item => item.textContent)).toEqual(['µL', 'mL'])
    expect(screen.queryByText('Insert at cursor')).toBeNull()
    fireEvent.click(screen.getByRole('menuitem', { name: 'mL' }))
    await waitFor(() => expect(unit.value).toBe('20 mL tube'))
    expect(unit.selectionStart).toBe(5)
    expect(document.activeElement).toBe(unit)
    expect(apiMocks.createSampleType).not.toHaveBeenCalled()
  })

  it('inserts instruction units and symbols at the selection without replacing surrounding text', async () => {
    renderPanel('sample-types')
    fireEvent.click(await screen.findByRole('button', { name: 'Add sample type' }))
    for (const label of ['Primary-container requirements', 'Temperature requirements', 'Stabilizer requirements', 'Sample-type packaging instructions', 'Customer label instructions', 'Prohibited identifiers', 'Safety and hazard requirements', 'Carrier restrictions']) {
      expect(screen.getByRole('button', { name: `Units and symbols for ${label}` })).toBeTruthy()
    }
    const temperature = screen.getByRole('textbox', { name: 'Temperature requirements' }) as HTMLTextAreaElement
    fireEvent.change(temperature, { target: { value: 'Store at 4 degrees until arrival.' } })
    temperature.focus()
    temperature.setSelectionRange(11, 18)
    fireEvent.select(temperature)
    fireEvent.blur(temperature)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Units and symbols for Temperature requirements' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: '°C' }))
    await waitFor(() => expect(temperature.value).toBe('Store at 4 °C until arrival.'))
    expect(document.activeElement).toBe(temperature)
    expect(temperature.selectionStart).toBe(13)
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    temperature.setSelectionRange(9, 9)
    fireEvent.select(temperature)
    fireEvent.blur(temperature)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Units and symbols for Temperature requirements' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: '≤ Less than or equal to' }))
    await waitFor(() => expect(temperature.value).toBe('Store at ≤4 °C until arrival.'))
    expect(document.activeElement).toBe(temperature)
    expect(apiMocks.createSampleType).not.toHaveBeenCalled()
  })

  it.each([
    ['Min', '-1', 'Enter a whole number of 1 or more.'],
    ['Min', '0x10', 'Enter a whole number of 1 or more.'],
    ['Min', '1.5', 'Enter a whole number of 1 or more.'],
    ['Max (optional)', '0', 'Enter a whole number of 1 or more.'],
    ['Max (optional)', 'abc', 'Enter a whole number of 1 or more.'],
  ])('validates %s quantity %s on blur without saving', async (label, value, error) => {
    renderPanel('sample-types')
    fireEvent.click(await screen.findByRole('button', { name: 'Add sample type' }))
    const input = screen.getByRole('textbox', { name: label })
    fireEvent.change(input, { target: { value } })
    fireEvent.blur(input)
    expect(await screen.findByText(error)).toBeTruthy()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(apiMocks.createSampleType).not.toHaveBeenCalled()
  })

  it('rechecks the quantity range when Min changes and accepts whole-number and blank limits', async () => {
    apiMocks.createSampleType.mockRejectedValue(new Error('Save unavailable'))
    renderPanel('sample-types')
    fireEvent.click(await screen.findByRole('button', { name: 'Create revision' }))
    const min = screen.getByRole('textbox', { name: 'Min' })
    const max = screen.getByRole('textbox', { name: 'Max (optional)' })
    fireEvent.change(min, { target: { value: '11' } })
    fireEvent.blur(min)
    expect(await screen.findByText('Max must be greater than or equal to Min.')).toBeTruthy()
    fireEvent.change(min, { target: { value: '2' } })
    fireEvent.blur(min)
    await waitFor(() => expect(screen.queryByText('Max must be greater than or equal to Min.')).toBeNull())
    fireEvent.change(max, { target: { value: '   ' } })
    fireEvent.blur(max)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Create revision' }))
    await waitFor(() => expect(apiMocks.createSampleType).toHaveBeenCalledWith(expect.objectContaining({ minimumQuantity: 2, maximumQuantity: null })))
  })

  it('generates a sample reference without input and preserves it after a failed save', async () => {
    apiMocks.createSampleType.mockRejectedValue(new Error('Save unavailable'))
    renderPanel('sample-types')
    fireEvent.click(await screen.findByRole('button', { name: 'Add sample type' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Add sample type' }))
    expect(dialog.queryByLabelText(/Sample-type code/)).toBeNull()
    for (const [label, value] of [
      ['Name', 'Frozen RNA'], ['Material type', 'extracted_rna'], ['Submission unit', 'tube'],
      ['Primary-container requirements', 'Approved tubes'], ['Temperature requirements', 'Approved conditions'],
      ['Sample-type packaging instructions', 'Approved packing'], ['Customer label instructions', 'Use sample ID'],
      ['Prohibited identifiers', 'No personal identifiers'], ['Safety and hazard requirements', 'Reviewed handling'],
    ]) fireEvent.change(dialog.getByLabelText(new RegExp('^' + label)), { target: { value } })
    fireEvent.click(dialog.getByRole('button', { name: 'Add sample type' }))
    await screen.findByText('Sample-type revision was not saved')
    const first = apiMocks.createSampleType.mock.calls[0][0]
    expect(first.code).toMatch(/^SAMPLE-[A-F0-9]{32}$/)
    expect(first.materialClass).toBe('extracted_rna')
    expect(dialog.getByRole('option', { name: 'Total RNA' })).toBeTruthy()
    expect(dialog.getByRole('option', { name: 'Enriched RNA' })).toBeTruthy()
    expect(dialog.getAllByRole('option').filter(option => !(option as HTMLOptionElement).disabled)).toHaveLength(2)
    expect(first.supersedesSampleTypeId).toBeNull()
    fireEvent.click(dialog.getByRole('button', { name: 'Add sample type' }))
    await waitFor(() => expect(apiMocks.createSampleType).toHaveBeenCalledTimes(2))
    expect(apiMocks.createSampleType.mock.calls[1][0].code).toBe(first.code)
  })

  it('preserves an existing sample reference when a revision changes its name', async () => {
    apiMocks.createSampleType.mockRejectedValue(new Error('Save unavailable'))
    renderPanel('sample-types')
    fireEvent.click(await screen.findByRole('button', { name: 'Create revision' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Create Extracted RNA revision 2' }))
    expect(dialog.queryByLabelText(/Sample-type code/)).toBeNull()
    fireEvent.change(dialog.getByLabelText(/^Name/), { target: { value: 'Renamed RNA' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Create revision' }))
    await waitFor(() => expect(apiMocks.createSampleType).toHaveBeenCalledWith(expect.objectContaining({
      code: configuration.sampleTypes[0].code,
      name: 'Renamed RNA',
      materialClass: configuration.sampleTypes[0].materialClass,
      supersedesSampleTypeId: configuration.sampleTypes[0].id,
      supersededVersion: configuration.sampleTypes[0].version,
    })))
  })

  it('shows shared sample definitions without shipping lists on the sample-types page', async () => {
    renderPanel('sample-types')
    expect(await screen.findByText('Sample types')).toBeTruthy()
    expect(screen.getByText('Extracted RNA')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add sample type' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add destination' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add instruction rule' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Preview instructions' })).toBeNull()
  })

  it('shows instruction rules separately from the preview form', async () => {
    renderPanel('instructions')
    expect(await screen.findByText('West laboratory + Extracted RNA')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add instruction rule' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Preview instructions' })).toBeNull()
  })

  it('opens a shareable revision detail with full requirements and a return link', async () => {
    renderPanel('sample-types')
    fireEvent.click(await screen.findByRole('link', { name: 'Extracted RNA' }))
    expect(await screen.findByRole('heading', { name: 'Extracted RNA' })).toBeTruthy()
    expect(screen.getByText('Use an approved sealed primary tube.')).toBeTruthy()
    expect(screen.getByText('Do not include direct identifiers.')).toBeTruthy()
    expect(screen.getByText('48 hours')).toBeTruthy()
    expect(apiMocks.createSampleType).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('link', { name: 'Back to sample types' }))
    expect(await screen.findByRole('button', { name: 'Add sample type' })).toBeTruthy()
  })

  it('preserves exact historical links and offers revision creation only on the latest revision', async () => {
    const original = configuration.sampleTypes[0]
    const latest = { ...original, id: '22222222-2222-4222-8222-222222222223', revision: 2, name: 'Revised RNA' }
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, sampleTypes: [original, latest] })
    renderPanel('sample-types', original.id)
    expect(await screen.findByRole('heading', { name: 'Extracted RNA' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create revision' })).toBeNull()
    fireEvent.click(screen.getByRole('link', { name: 'View latest revision (2)' }))
    expect(await screen.findByRole('heading', { name: 'Revised RNA' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Create revision' })).toBeTruthy()
  })

  it('handles a missing direct-link record without displaying another sample type', async () => {
    renderPanel('sample-types', 'missing')
    expect(await screen.findByText('Sample type not found')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create revision' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to sample types' })).toBeTruthy()
  })
})

function renderPanel(section: 'destinations' | 'sample-types' | 'instructions', sampleTypeId?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const root = createRootRoute()
  const list = createRoute({ getParentRoute: () => root, path: '/order-configuration', component: () => <SampleShippingConfigurationPanel apiEnabled section={section} /> })
  function Detail() {
    const params = useParams({ strict: false })
    return <SampleShippingConfigurationPanel apiEnabled section="sample-types" sampleTypeId={params.sampleTypeId} />
  }
  const detail = createRoute({ getParentRoute: () => root, path: '/order-configuration/sample-types/$sampleTypeId', component: Detail })
  const router = createRouter({ routeTree: root.addChildren([list, detail]), history: createMemoryHistory({ initialEntries: [sampleTypeId ? `/order-configuration/sample-types/${sampleTypeId}` : '/order-configuration'] }) })
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
}

const configuration = {
  destinations: [{
    id: '11111111-1111-4111-8111-111111111111',
    definitionKey: '11111111-1111-4111-8111-111111111112',
    revision: 1,
    supersedesDestinationId: null,
    code: 'WEST_LAB',
    name: 'West laboratory',
    recipientName: 'Sample Receiving',
    organizationName: 'Phaeno',
    addressLine1: '123 Example Street',
    addressLine2: null,
    city: 'San Diego',
    stateOrProvince: 'CA',
    postalCode: '92101',
    countryCode: 'US',
    receivingPhone: null,
    receivingEmail: 'receiving@example.test',
    receivingHours: 'Monday-Friday, 8:00 AM-4:00 PM',
    timeZoneId: 'America/Los_Angeles',
    closureInstructions: 'Do not deliver on posted closures.',
    deliveryInstructions: 'Deliver to Sample Receiving.',
    carrierRestrictions: null,
    internationalShippingAllowed: false,
    effectiveFrom: '2026-08-01T00:00:00Z',
    effectiveTo: null,
    isActive: true,
    version: 1,
  }],
  sampleTypes: [{
    id: '22222222-2222-4222-8222-222222222221',
    definitionKey: '22222222-2222-4222-8222-222222222222',
    revision: 1,
    supersedesSampleTypeId: null,
    code: 'RNA',
    name: 'Extracted RNA',
    description: 'Approved synthetic fixture',
    materialClass: 'Nucleic acid',
    minimumQuantity: 1,
    maximumQuantity: 10,
    quantityUnit: 'tube',
    primaryContainerRequirements: 'Use an approved sealed primary tube.',
    temperatureRequirements: 'Keep frozen.',
    stabilizerRequirements: null,
    packagingInstructions: 'Use approved secondary containment.',
    labelingInstructions: 'Use the safe sample identifier.',
    prohibitedIdentifiers: 'Do not include direct identifiers.',
    safetyRequirements: 'Declare hazards before shipping.',
    carrierRestrictions: null,
    maximumTransitHours: 48,
    effectiveFrom: '2026-08-01T00:00:00Z',
    effectiveTo: null,
    isActive: true,
    version: 1,
  }],
  instructionRules: [{
    id: '33333333-3333-4333-8333-333333333331',
    definitionKey: '33333333-3333-4333-8333-333333333332',
    revision: 1,
    supersedesInstructionRuleId: null,
    destinationId: '11111111-1111-4111-8111-111111111111',
    destinationName: 'West laboratory',
    sampleTypeDefinitionId: '22222222-2222-4222-8222-222222222221',
    sampleTypeName: 'Extracted RNA',
    compatibilityGroup: 'FROZEN_RNA',
    packingInstructions: 'Use secondary containment.',
    temperatureInstructions: 'Keep frozen.',
    carrierInstructions: 'Use an approved carrier.',
    dispatchInstructions: 'Ship Monday through Wednesday.',
    deliveryInstructions: 'Deliver during receiving hours.',
    requiredDocuments: 'Include the current packet.',
    exceptionInstructions: 'Contact Phaeno if delayed.',
    internationalCustomsInstructions: null,
    requiresSeparateShipment: false,
    effectiveFrom: '2026-08-01T00:00:00Z',
    effectiveTo: null,
    isActive: true,
    version: 1,
  }],
}
