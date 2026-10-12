import { render, screen, within, fireEvent, waitFor } from '#/test-helpers/render-portal'
import { expect, it, vi } from 'vitest'
import { listGovernanceIncidentsPage, type GovernanceIncident } from '#/api/data-provisioning'
import { GovernancePanel } from './GovernancePanel'

vi.mock('#/api/data-provisioning', async original => ({ ...await original<typeof import('#/api/data-provisioning')>(),
  listGovernanceIncidentsPage: vi.fn(), listSourceSamples: async () => [], listDatasets: async () => [],
}))
it('keeps older incidents reachable and groups incident actions with keyboard focus return', async () => {
  const incident: GovernanceIncident = { id: 'incident', sourceSampleId: 'source', sourceSampleLabel: 'Synthetic source', category: 'Ownership', status: 'Open', reason: 'Review rights', externalGuidance: 'Wait for clearance', internalNotes: 'Synthetic fixture', attestationDueAt: '2026-10-20', affectedDatasetVersionIds: ['version'], affectedOrganizations: [], followUps: [], resolvedAt: null, resolution: null, createdAt: '2026-10-11', version: 1 }
  vi.mocked(listGovernanceIncidentsPage).mockImplementation(async (page = 1) => ({ items: [{ ...incident, id: `incident-${page}`, sourceSampleLabel: page === 1 ? 'Synthetic source' : 'Older source' }], page, pageSize: 25, totalCount: 505 }))
  render(<GovernancePanel apiEnabled />)
  const trigger = await screen.findByRole('button', { name: 'Actions for Synthetic source' })
  expect(trigger.querySelectorAll('svg')).toHaveLength(1)
  expect(screen.queryByRole('button', { name: 'Clear unchanged' })).toBeNull()
  trigger.focus()
  fireEvent.keyDown(trigger, { key: 'Enter' })
  const menu = await screen.findByRole('menu')
  expect(within(menu).getByRole('menuitem', { name: 'Follow-up' })).toBeTruthy()
  expect(within(menu).getByRole('menuitem', { name: 'Confirm unsafe' })).toBeTruthy()
  fireEvent.keyDown(menu, { key: 'Escape' })
  await waitFor(() => expect(trigger).toBe(document.activeElement))
  const pages = screen.getByRole('navigation', { name: 'Governance incident pages' })
  expect(pages.textContent).toContain('505 records')
  fireEvent.click(within(pages).getByRole('button', { name: 'Next' }))
  expect(await screen.findByRole('button', { name: 'Actions for Older source' })).toBeTruthy()
  expect(listGovernanceIncidentsPage).toHaveBeenLastCalledWith(2)
})

it('keeps dirty governance notes on dismissal and restores the Actions control after explicit discard', async () => {
  render(<GovernancePanel apiEnabled />)
  const trigger = await screen.findByRole('button', { name: 'Actions for Synthetic source' })
  trigger.focus(); fireEvent.keyDown(trigger,{key:'Enter'})
  fireEvent.click(await screen.findByRole('menuitem',{name:'Follow-up'}))
  const dialog = await screen.findByRole('dialog',{name:'Add investigation follow-up'})
  const notes = within(dialog).getByRole('textbox',{name:'Notes'})
  fireEvent.change(notes,{target:{value:'TEST ONLY retained note'}})
  fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}))
  const discard = await screen.findByRole('dialog',{name:'Discard unsaved changes?'})
  fireEvent.click(within(discard).getByRole('button',{name:'Keep editing'}))
  expect((notes as HTMLTextAreaElement).value).toBe('TEST ONLY retained note')
  fireEvent.click(within(dialog).getByRole('button',{name:'Cancel'}))
  fireEvent.click(within(await screen.findByRole('dialog',{name:'Discard unsaved changes?'})).getByRole('button',{name:'Discard changes'}))
  await waitFor(()=>expect(screen.queryByRole('dialog',{name:'Add investigation follow-up'})).toBeNull())
  await waitFor(()=>expect(document.activeElement).toBe(trigger))
})
