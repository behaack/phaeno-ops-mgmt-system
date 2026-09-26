import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider, useSearch } from '@tanstack/react-router'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SampleShippingConfigurationPanel } from './SampleShippingConfigurationPanel'
import { parseSampleTypeListSearch } from './sample-type-list-navigation'
import { parseDestinationListSearch } from './destination-list-navigation'

vi.mock('#/api/shipping-containers', () => ({ getShippingContainerDefinitions: async () => [] }))

vi.mock('./ContainerSizesPanel', () => ({ ContainerSizesPanel: () => <div>Kit specifications</div> }))

const apiMocks = vi.hoisted(() => ({
  createDestination: vi.fn(),
  createProcedure: vi.fn(),
  setProcedureStatus: vi.fn(),
  createRule: vi.fn(),
  createSampleType: vi.fn(),
  setSampleTypeStatus: vi.fn(),
  setDestinationStatus: vi.fn(),
  setDefaultDestination: vi.fn(),
  setAssignmentStatus: vi.fn(),
  getConfiguration: vi.fn(),
  preview: vi.fn(),
}))

vi.mock('#/api/sample-shipping', () => ({
  createSampleShippingProcedure: apiMocks.createProcedure,
  setSampleShippingProcedureStatus: apiMocks.setProcedureStatus,
  createSampleShippingDestination: apiMocks.createDestination,
  createSampleShippingInstructionRule: apiMocks.createRule,
  createSampleTypeDefinition: apiMocks.createSampleType,
  setSampleTypeStatus: apiMocks.setSampleTypeStatus,
  setShippingDestinationStatus: apiMocks.setDestinationStatus,
  setDefaultShippingDestination: apiMocks.setDefaultDestination,
  setShippingAssignmentStatus: apiMocks.setAssignmentStatus,
  getSampleShippingConfiguration: apiMocks.getConfiguration,
  previewSampleShipping: apiMocks.preview,
}))

describe('SampleShippingConfigurationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.getConfiguration.mockResolvedValue(configuration)
  })

  it('offers procedure revision and confirmed deactivation from row Actions', async () => {
    const procedure = configuration.procedures[0]
    const inactive = { ...procedure, isActive: false, version: procedure.version + 1 }
    apiMocks.setProcedureStatus.mockImplementation(async () => {
      apiMocks.getConfiguration.mockResolvedValue({ ...configuration, procedures: [inactive] })
      return inactive
    })
    renderPanel('procedures')
    const actions = await screen.findByRole('button', { name: `Actions for ${procedure.name}` })
    fireEvent.keyDown(actions, { key: 'ArrowDown' })
    expect(await screen.findByRole('menuitem', { name: 'Create revision' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Deactivate' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Deactivate shipping procedure?' }))
    expect(dialog.getByText(new RegExp(`revision ${procedure.revision}`))).toBeTruthy()
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }))
    expect(apiMocks.setProcedureStatus).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('button', { name: `Actions for ${procedure.name}` }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(apiMocks.setProcedureStatus).toHaveBeenCalledWith(procedure.id, { isActive: false, version: procedure.version }))
    expect(await screen.findByText('Inactive')).toBeTruthy()
  })

  it('shows procedure description and its current Sample types', async () => {
    renderPanel('procedures')
    expect(await screen.findByText('Shared steps for synthetic receiving.')).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Approved shared procedure' }))
    expect(await screen.findByRole('heading', { name: 'Sample types using this procedure' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Extracted RNA' })).toBeTruthy()
  })

  it('defaults a procedure revision to Active and accepts an Inactive selection', async () => {
    apiMocks.createProcedure.mockRejectedValue(new Error('Save unavailable'))
    renderPanel('procedures')
    fireEvent.keyDown(await screen.findByRole('button', { name: `Actions for ${configuration.procedures[0].name}` }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Create revision' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Create Approved shared procedure revision 2' }))
    expect((dialog.getByRole('textbox', { name: 'Description' }) as HTMLTextAreaElement).value).toBe('Shared steps for synthetic receiving.')
    const status = dialog.getByRole('combobox', { name: 'Status' }) as HTMLSelectElement
    expect(status.value).toBe('active')
    fireEvent.change(dialog.getByRole('textbox', { name: 'Name' }), { target: { value: 'Updated shared procedure' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Create revision' }))
    await waitFor(() => expect(apiMocks.createProcedure).toHaveBeenCalledWith(expect.objectContaining({ isActive: true, supersedesProcedureId: configuration.procedures[0].id })))
    fireEvent.change(status, { target: { value: 'inactive' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Create revision' }))
    await waitFor(() => expect(apiMocks.createProcedure).toHaveBeenCalledTimes(2))
    expect(apiMocks.createProcedure.mock.calls[1][0].isActive).toBe(false)
  })

  it('keeps earlier procedure availability visible and groups prior revisions like Sample types', async () => {
    const active = configuration.procedures[0]
    const draft = { ...active, id: 'procedure-draft', revision: 2, isActive: false }
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, procedures: [active, draft] })
    renderPanel('procedures')
    expect(await screen.findByText(/Revision 1 is still Active for new work/)).toBeTruthy()
    expect(screen.getByText('Show 1 prior revision')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('button', { name: `Actions for ${draft.name}` }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Activate' }))
    expect(screen.getByRole('dialog', { name: 'Activate shipping procedure?' }).textContent).toContain('deactivates any earlier active revision')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('link', { name: draft.name }))
    expect(await screen.findByRole('heading', { name: 'Revision history' })).toBeTruthy()
    expect(screen.getByRole('link', { name: `Revision 1 · ${active.name}` })).toBeTruthy()
    expect(screen.getByText('Viewing')).toBeTruthy()
  })

  it('treats an older active flag as superseded when the latest procedure is Active', async () => {
    const active = configuration.procedures[0]
    const latest = { ...active, id: 'procedure-active-2', revision: 2 }
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, procedures: [active, latest] })
    renderPanel('procedures')
    expect(await screen.findByRole('link', { name: latest.name })).toBeTruthy()
    expect(screen.queryByText(/Revision 1 is also Active for new assignments/)).toBeNull()
    fireEvent.keyDown(screen.getByRole('button', { name: `Actions for ${latest.name}` }), { key: 'ArrowDown' })
    expect(await screen.findAllByRole('menuitem', { name: 'Deactivate' })).toHaveLength(1)
    expect(screen.queryByRole('menuitem', { name: 'Deactivate revision 1' })).toBeNull()
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    fireEvent.click(screen.getByText('Show 1 prior revision'))
    expect(await screen.findByText(/revision 1 · superseded/)).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: latest.name }))
    expect(await screen.findByRole('link', { name: 'Extracted RNA' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: `Revision 1 · ${active.name}` }))
    expect(screen.getByRole('link', { name: 'Extracted RNA' })).toBeTruthy()
    expect(await screen.findByText('You are viewing a historical revision.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: `Actions for ${active.name}` })).toBeNull()
  })

  it('opens an immutable new revision instead of editing the current destination row', async () => {
    renderPanel('destinations')

    await screen.findByText('Phaeno ship-to destinations')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Create revision' }))

    expect(screen.getByRole('heading', { name: 'Create West laboratory revision 2' })).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Destination code' })).toBeNull()
    expect((screen.getByRole('combobox', { name: 'Status' }) as HTMLSelectElement).value).toBe('active')
    apiMocks.createDestination.mockRejectedValue(new Error('Temporary save failure'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Display name' }), { target: { value: 'Renamed receiving lab' } })
    fireEvent.submit(document.getElementById('sample-shipping-destination-form')!)
    await waitFor(() => expect(apiMocks.createDestination).toHaveBeenCalledWith(expect.objectContaining({ code: configuration.destinations[0].code, name: 'Renamed receiving lab', supersedesDestinationId: configuration.destinations[0].id, isActive: true })))
    fireEvent.change(screen.getByRole('combobox', { name: 'Status' }), { target: { value: 'inactive' } })
    fireEvent.submit(document.getElementById('sample-shipping-destination-form')!)
    await waitFor(() => expect(apiMocks.createDestination).toHaveBeenCalledTimes(2))
    expect(apiMocks.createDestination.mock.calls[1][0].isActive).toBe(false)
  })

  it('generates a destination reference once and keeps it when retrying a failed save', async () => {
    apiMocks.createDestination.mockRejectedValue(new Error('Temporary save failure'))
    renderPanel('destinations')
    fireEvent.click(await screen.findByRole('button', { name: 'Add destination' }))
    expect(screen.queryByRole('textbox', { name: 'Destination code' })).toBeNull()
    expect((screen.getByRole('combobox', { name: 'Status' }) as HTMLSelectElement).value).toBe('active')
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
    expect(apiMocks.createDestination.mock.calls[1][0].isActive).toBe(true)
  })

  it('keeps an inactive destination successor visible with the active predecessor and exact history', async () => {
    const active = configuration.destinations[0]
    const draft = { ...active, id: 'destination-draft', revision: 2, name: 'Updated receiving lab', isActive: false }
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, destinations: [active, draft] })
    renderPanel('destinations')
    expect(await screen.findByRole('link', { name: draft.name })).toBeTruthy()
    expect(screen.getByText('Rev 2')).toBeTruthy()
    expect(screen.queryByText(`${active.code} · rev 2`)).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Show inactive' }).getAttribute('data-state')).toBe('unchecked')
    expect(screen.getByText(/Revision 1 \(West laboratory\) is currently Active/)).toBeTruthy()
    expect(screen.getByText('Show 1 prior revision')).toBeTruthy()
    fireEvent.click(screen.getByText('Show 1 prior revision'))
    expect(screen.getByText(/West laboratory · revision 1 · active now/)).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search ship-to destinations' }), { target: { value: active.name } })
    expect(await screen.findByRole('link', { name: draft.name })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: draft.name }))
    expect(await screen.findByRole('heading', { name: 'Revision history' })).toBeTruthy()
    expect(screen.getByRole('link', { name: `Revision 1 · ${active.name}` })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: `Revision 1 · ${active.name}` }))
    expect(await screen.findByText(/You are viewing a historical revision/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: `Actions for ${active.name}` })).toBeNull()
  })

  it('sets the default from destination Actions with the saved configuration version', async () => {
    const destination = configuration.destinations[0]
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, defaultDestinationVersion: 7 })
    apiMocks.setDefaultDestination.mockResolvedValue({ ...configuration,
      defaultDestinationDefinitionKey: destination.definitionKey, defaultDestinationVersion: 8,
    })
    renderPanel('destinations')
    expect(await screen.findByText('No default Phaeno ship-to destination')).toBeTruthy()
    expect(screen.queryByRole('combobox', { name: 'Default Phaeno ship-to destination' })).toBeNull()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Set as default' }))
    await waitFor(() => expect(apiMocks.setDefaultDestination).toHaveBeenCalledWith(destination.definitionKey, 7))
    expect(await screen.findByText('Default')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    expect(screen.queryByRole('menuitem', { name: 'Set as default' })).toBeNull()
  })

  it('warns before finalization when no default destination is configured', async () => {
    renderPanel('destinations')
    expect(await screen.findByText('No default Phaeno ship-to destination')).toBeTruthy()
  })

  it('filters inactive destinations, searches receiving locations, and paginates the latest revisions', async () => {
    const destinations = Array.from({ length: 14 }, (_, index) => ({
      ...configuration.destinations[0],
      id: `destination-${index + 1}`,
      definitionKey: `destination-definition-${index + 1}`,
      name: `Receiving site ${index + 1}`,
      code: `SITE_${index + 1}`,
      city: index === 13 ? 'Sacramento' : 'San Diego',
      isActive: index !== 13,
    }))
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, destinations })
    renderPanel('destinations')

    expect(await screen.findByRole('link', { name: 'Receiving site 1' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Receiving site 14' })).toBeNull()
    expect(screen.getByText('13 destinations · Page 1 of 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('link', { name: 'Receiving site 13' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Receiving site 1' })).toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Show inactive' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search ship-to destinations' }), { target: { value: 'Sacramento' } })
    expect(await screen.findByRole('link', { name: 'Receiving site 14' })).toBeTruthy()
    expect(screen.getByText('Inactive')).toBeTruthy()
    expect(screen.getByText('1 destination · Page 1 of 1')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Show inactive' }).getAttribute('data-state')).toBe('checked')
  })

  it('returns focus to destination search after deactivation hides the row', async () => {
    const original = configuration.destinations[0]
    apiMocks.setDestinationStatus.mockImplementation(async () => {
      const updated = { ...original, isActive: false, version: original.version + 1 }
      apiMocks.getConfiguration.mockResolvedValue({ ...configuration, destinations: [updated] })
      return updated
    })
    renderPanel('destinations')
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }))
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Deactivate destination?' })).getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(screen.queryByText('West laboratory')).toBeNull())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search ship-to destinations' })))
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
    for (const label of ['Sample tube or vessel requirements', 'Preservation requirements', 'Stabilizer requirements', 'Customer label instructions', 'Prohibited identifiers', 'Safety and hazard requirements']) {
      expect(screen.getByRole('button', { name: `Units and symbols for ${label}` })).toBeTruthy()
    }
    const temperature = screen.getByRole('textbox', { name: 'Preservation requirements' }) as HTMLTextAreaElement
    fireEvent.change(temperature, { target: { value: 'Store at 4 degrees until arrival.' } })
    temperature.focus()
    temperature.setSelectionRange(11, 18)
    fireEvent.select(temperature)
    fireEvent.blur(temperature)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Units and symbols for Preservation requirements' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: '°C' }))
    await waitFor(() => expect(temperature.value).toBe('Store at 4 °C until arrival.'))
    expect(document.activeElement).toBe(temperature)
    expect(temperature.selectionStart).toBe(13)
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
    temperature.setSelectionRange(9, 9)
    fireEvent.select(temperature)
    fireEvent.blur(temperature)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Units and symbols for Preservation requirements' }), { key: 'ArrowDown' })
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
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Create revision' }))
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
    expect((dialog.getByRole('combobox', { name: 'Status' }) as HTMLSelectElement).value).toBe('active')
    fireEvent.change(dialog.getByRole('combobox', { name: 'Shared shipping procedure' }), { target: { value: configuration.procedures[0].id } })
    for (const [label, value] of [
      ['Name', 'Frozen RNA'], ['Material type', 'extracted_rna'], ['Submission unit', 'tube'],
      ['Sample tube or vessel requirements', 'Approved tubes'], ['Preservation requirements', 'Approved conditions'],
      ['Customer label instructions', 'Use sample ID'],
      ['Prohibited identifiers', 'No personal identifiers'], ['Safety and hazard requirements', 'Reviewed handling'],
    ]) fireEvent.change(dialog.getByLabelText(new RegExp('^' + label)), { target: { value } })
    fireEvent.click(dialog.getByRole('button', { name: 'Add sample type' }))
    await screen.findByText('Sample-type revision was not saved')
    const first = apiMocks.createSampleType.mock.calls[0][0]
    expect(first.code).toMatch(/^SAMPLE-[A-F0-9]{32}$/)
    expect(first.isActive).toBe(true)
    expect(first.materialClass).toBe('extracted_rna')
    expect(dialog.getByRole('option', { name: 'Total RNA' })).toBeTruthy()
    expect(dialog.getByRole('option', { name: 'Enriched RNA' })).toBeTruthy()
    expect(Array.from((dialog.getByLabelText(/^Material type/) as HTMLSelectElement).options).filter(option => !option.disabled)).toHaveLength(2)
    expect(first.supersedesSampleTypeId).toBeNull()
    fireEvent.change(dialog.getByRole('combobox', { name: 'Status' }), { target: { value: 'inactive' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Add sample type' }))
    await waitFor(() => expect(apiMocks.createSampleType).toHaveBeenCalledTimes(2))
    expect(apiMocks.createSampleType.mock.calls[1][0].code).toBe(first.code)
    expect(apiMocks.createSampleType.mock.calls[1][0].isActive).toBe(false)
  })

  it('preserves an existing sample reference when a revision changes its name', async () => {
    apiMocks.createSampleType.mockRejectedValue(new Error('Save unavailable'))
    renderPanel('sample-types')
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Create revision' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Create Extracted RNA revision 2' }))
    expect(dialog.queryByLabelText(/Sample-type code/)).toBeNull()
    expect((dialog.getByRole('combobox', { name: 'Status' }) as HTMLSelectElement).value).toBe('active')
    fireEvent.change(dialog.getByLabelText(/^Name/), { target: { value: 'Renamed RNA' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Create revision' }))
    await waitFor(() => expect(apiMocks.createSampleType).toHaveBeenCalledWith(expect.objectContaining({
      code: configuration.sampleTypes[0].code,
      name: 'Renamed RNA',
      materialClass: configuration.sampleTypes[0].materialClass,
      supersedesSampleTypeId: configuration.sampleTypes[0].id,
      supersededVersion: configuration.sampleTypes[0].version,
      isActive: true,
    })))
    fireEvent.change(dialog.getByRole('combobox', { name: 'Status' }), { target: { value: 'inactive' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Create revision' }))
    await waitFor(() => expect(apiMocks.createSampleType).toHaveBeenCalledTimes(2))
    expect(apiMocks.createSampleType.mock.calls[1][0].isActive).toBe(false)
  })

  it('shows shared sample definitions without shipping lists on the sample-types page', async () => {
    renderPanel('sample-types')
    expect(await screen.findByText('Sample types')).toBeTruthy()
    expect(screen.getByText('Extracted RNA')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add sample type' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add destination' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add assignment' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Preview shared steps' })).toBeNull()
  })

  it('filters inactive sample types, searches, paginates, and restores the list after detail', async () => {
    const sampleTypes = Array.from({ length: 14 }, (_, index) => ({
      ...configuration.sampleTypes[0],
      id: `sample-${index + 1}`,
      definitionKey: `definition-${index + 1}`,
      name: `Reference ${index + 1}`,
      code: `REF_${index + 1}`,
      isActive: index !== 13,
    }))
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, sampleTypes })
    renderPanel('sample-types')

    expect(await screen.findByRole('link', { name: 'Reference 1' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Reference 14' })).toBeNull()
    expect(screen.getByText('13 sample types · Page 1 of 2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByRole('link', { name: 'Reference 13' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Reference 1' })).toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Show inactive' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Search sample types' }), { target: { value: 'Reference 14' } })
    expect(await screen.findByRole('link', { name: 'Reference 14' })).toBeTruthy()
    expect(screen.getByText('Inactive')).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Reference 14' }))
    expect(await screen.findByRole('heading', { name: 'Reference 14' })).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Back to sample types' }))
    expect(await screen.findByRole('link', { name: 'Reference 14' })).toBeTruthy()
    expect((screen.getByRole('textbox', { name: 'Search sample types' }) as HTMLInputElement).value).toBe('Reference 14')
    expect(screen.getByRole('checkbox', { name: 'Show inactive' }).getAttribute('data-state')).toBe('checked')
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
    fireEvent.keyDown(within(screen.getByRole('heading', { name: 'Revised RNA' }).closest('[data-slot="card"]')!).getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    expect(await screen.findByRole('menuitem', { name: 'Create revision' })).toBeTruthy()
  })

  it.each([false, true])('changes availability in place from active=%s without creating a revision', async isActive => {
    const original = { ...configuration.sampleTypes[0], isActive }
    const updated = { ...original, isActive: !isActive, version: original.version + 1 }
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, sampleTypes: [original] })
    apiMocks.setSampleTypeStatus.mockImplementation(async () => {
      apiMocks.getConfiguration.mockResolvedValue({ ...configuration, sampleTypes: [updated] })
      return updated
    })
    renderPanel('sample-types')
    if (!isActive) fireEvent.click(await screen.findByRole('checkbox', { name: 'Show inactive' }))
    const action = isActive ? 'Deactivate' : 'Activate'
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: action }))
    const dialog = within(await screen.findByRole('dialog', { name: `${action} sample type?` }))
    expect(apiMocks.setSampleTypeStatus).not.toHaveBeenCalled()
    fireEvent.click(dialog.getByRole('button', { name: action }))
    await waitFor(() => expect(apiMocks.setSampleTypeStatus).toHaveBeenCalledWith(original.id, { isActive: !isActive, version: original.version }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    if (isActive) {
      expect(screen.queryByText(`Rev ${original.revision}`)).toBeNull()
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Search sample types' })))
    } else {
      expect(screen.getByText('Active')).toBeTruthy()
      expect(screen.getByText(`Rev ${original.revision}`)).toBeTruthy()
      expect(screen.queryByText(`${original.code} · rev ${original.revision}`)).toBeNull()
      await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Actions' })))
    }
    expect(apiMocks.createSampleType).not.toHaveBeenCalled()
  })

  it('keeps a failed status confirmation open and allows cancellation without saving', async () => {
    apiMocks.setSampleTypeStatus.mockRejectedValue(new Error('This configuration changed. Refresh before making changes.'))
    renderPanel('sample-types', configuration.sampleTypes[0].id)
    const heading = await screen.findByRole('heading', { name: 'Extracted RNA' })
    fireEvent.keyDown(within(heading.closest('[data-slot="card"]')!).getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Deactivate' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }))
    expect(await screen.findByText('Sample-type status was not changed')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Refresh sample types' })).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(apiMocks.setSampleTypeStatus).toHaveBeenCalledTimes(1)
    expect(apiMocks.createSampleType).not.toHaveBeenCalled()
  })

  it('exposes the earlier active revision when a newer inactive revision exists', async () => {
    const active = configuration.sampleTypes[0]
    const draft = { ...active, id: 'draft', revision: 2, name: 'Updated RNA', isActive: false }
    const unrelated = { ...active, id: 'other', definitionKey: 'other-family', code: 'OTHER', name: 'Other material' }
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, sampleTypes: [active, draft, unrelated] })
    renderPanel('sample-types')
    expect(await screen.findByRole('link', { name: draft.name })).toBeTruthy()
    expect(screen.getByText('Inactive')).toBeTruthy()
    expect(screen.getByRole('checkbox', { name: 'Show inactive' }).getAttribute('data-state')).toBe('unchecked')
    expect(await screen.findByText(/Revision 1 is currently active for new shipments/)).toBeTruthy()
    fireEvent.change(screen.getByRole('textbox', { name: 'Search sample types' }), { target: { value: active.name } })
    await waitFor(() => expect(screen.queryByRole('link', { name: unrelated.name })).toBeNull())
    expect(screen.getByRole('link', { name: draft.name })).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    expect(await screen.findByRole('menuitem', { name: 'Activate' })).toBeTruthy()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Deactivate revision 1' }))
    expect(screen.getByRole('dialog').textContent).toContain('Extracted RNA · revision 1')
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    expect(apiMocks.setSampleTypeStatus).not.toHaveBeenCalled()
  })

  it('does not offer activation for ended history or an approval checkbox in the content editor', async () => {
    const ended = { ...configuration.sampleTypes[0], effectiveFrom: '2019-01-01T00:00:00Z', effectiveTo: '2020-01-01T00:00:00Z' }
    apiMocks.getConfiguration.mockResolvedValue({ ...configuration, sampleTypes: [ended] })
    renderPanel('sample-types', ended.id)
    const heading = await screen.findByRole('heading', { name: ended.name })
    fireEvent.keyDown(within(heading.closest('[data-slot="card"]')!).getByRole('button', { name: 'Actions' }), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Create revision' }))
    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.queryByRole('checkbox', { name: 'Approved for new shipments' })).toBeNull()
    expect(dialog.getByRole('button', { name: 'Create revision' })).toHaveProperty('disabled', true)
  })

  it('handles a missing direct-link record without displaying another sample type', async () => {
    renderPanel('sample-types', 'missing')
    expect(await screen.findByText('Sample type not found')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Create revision' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to sample types' })).toBeTruthy()
  })
})

function renderPanel(section: 'destinations' | 'sample-types' | 'procedures', sampleTypeId?: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const root = createRootRoute()
  function Page() {
    const search = useSearch({ strict: false })
    return <SampleShippingConfigurationPanel apiEnabled section={section} sampleTypeId={search.sampleTypeId} destinationId={search.destinationId} procedureId={search.procedureId} />
  }
  const page = createRoute({ getParentRoute: () => root, path: '/sample-shipping-settings', validateSearch: (search: Record<string, unknown>) => ({ ...parseSampleTypeListSearch(search), ...parseDestinationListSearch(search), sampleTypeId: typeof search.sampleTypeId === 'string' ? search.sampleTypeId : undefined, destinationId: typeof search.destinationId === 'string' ? search.destinationId : undefined, procedureId: typeof search.procedureId === 'string' ? search.procedureId : undefined }), component: Page })
  const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: [sampleTypeId ? `/sample-shipping-settings?sampleTypeId=${sampleTypeId}` : '/sample-shipping-settings'] }) })
  return render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>)
}

const configuration = {
  procedures: [{ id: '44444444-4444-4444-8444-444444444444', definitionKey: '44444444-4444-4444-8444-444444444445', supersedesProcedureId: null, name: 'Approved shared procedure', description: 'Shared steps for synthetic receiving.', revision: 1, isActive: true, version: 1, packingInstructions: 'Shared packing', temperatureInstructions: 'Maintain sample conditions', carrierInstructions: 'Approved carrier', dispatchInstructions: 'Dispatch guidance', requiredDocuments: 'Insert', exceptionInstructions: 'Contact receiving', internationalCustomsInstructions: null }],
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
    shippingProcedureId: '44444444-4444-4444-8444-444444444444',
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
