import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
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

    expect(screen.getByRole('heading', { name: 'Create WEST_LAB revision 2' })).toBeTruthy()
    expect((document.getElementById('destination-code') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText(/current revision will end/i)).toBeTruthy()
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
})

function renderPanel(section: 'destinations' | 'sample-types' | 'instructions') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><SampleShippingConfigurationPanel apiEnabled section={section} /></QueryClientProvider>)
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
