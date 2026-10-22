import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import type { Entry, Experiment, Project } from '../src/features/research/research-api'

test.use({ timezoneId: 'America/Los_Angeles', screenshot: 'only-on-failure' })
const experimentId = '22222222-2222-2222-2222-222222222222'
const entryId = '33333333-3333-4333-8333-333333333333'
async function fixture(page: import('@playwright/test').Page, conflict: false | 'active' | 'complete' = false) {
  const html=await readFile(new URL('./fixtures/research.html',import.meta.url),'utf8')
  await page.route('**/e2e/fixtures/research.html*',route=>route.fulfill({contentType:'text/html',body:html}))
  const project: Project = { id: '11111111-1111-4111-8111-111111111111', name: 'Method development', description: '', updatedAt: '2026-10-16T12:00:00Z', version: 1 }
  const experiment: Experiment = { id: experimentId, researchProjectId: project.id, title: 'Extraction pilot', status: 'Active', experimentDate: '2026-10-16', lastActivityAtUtc: '2026-10-16T12:00:00Z', version: 1 }
  const entries: Entry[] = [{ id: entryId, researchExperimentId: experimentId, title: 'Pilot notebook', entryDate: '2026-10-16', version: 1, createdAt: '2026-10-16T12:00:00Z', updatedAt: '2026-10-16T12:00:00Z', createdByUserId: 'fixture-author', updatedByUserId: 'fixture-author', blocks: [
    { id: '44444444-4444-4444-8444-444444444444', kind: 'text', section: 'method', label: 'Method', text: 'Flexible pilot method', columns: null, rows: null, attachmentId: null },
  ] }]
  const authors = [{ id: 'fixture-author', name: 'Fixture Researcher' }]
  const metadata = () => ({ project, experiment, entryCount: entries.length })
  await page.route('**/api/research/**', async route => {
    const url = new URL(route.request().url())
    const path = url.pathname.replace('/api/research/', '')
    const selected = entries.find(entry => path.endsWith(`/entries/${entry.id}`)) ?? entries[0]
    let data: unknown
    if (route.request().method() === 'PUT') {
      if (conflict) {
        if (conflict === 'complete') experiment.status = 'Completed'; else selected.version++
        experiment.version++; conflict = false
        return route.fulfill({ status: 409, json: { success: false, error: { message: 'Another researcher saved first.' } } })
      }
      Object.assign(selected, route.request().postDataJSON(), { version: selected.version + 1 }); experiment.version++
    }
    if (path.endsWith('/transition')) { experiment.status = route.request().postDataJSON().action === 'complete' ? 'Completed' : 'Active'; experiment.version++ }
    if (path.endsWith('/copy')) data = { ...metadata(), experiment: { ...experiment, id: '55555555-5555-4555-8555-555555555555' } }
    else if (path === 'attachments/options') data = { maximumBytes: 104857600 }
    else if (path.endsWith('/attachments')) data = []
    else if (path === 'projects/choices') data = [{ id: project.id, name: project.name }]
    else if (path.endsWith('/entries') && route.request().method() === 'POST') {
      const payload = route.request().postDataJSON()
      const entry = { ...entries[0], ...payload, id: '66666666-6666-4666-8666-666666666666', version: 1 } as Entry
      entries.push(entry); experiment.version++; data = { experiment, entry, authors }
    } else if (path.endsWith('/entries')) {
      const pageNumber = Number(url.searchParams.get('page') || 1)
      const summaries = entries.slice((pageNumber - 1) * 25, pageNumber * 25).map(entry => ({ id: entry.id, researchExperimentId: entry.researchExperimentId, title: entry.title, entryDate: entry.entryDate, createdAt: entry.createdAt, updatedAt: entry.updatedAt, version: entry.version, createdByName: 'Fixture Researcher', updatedByName: 'Fixture Researcher' }))
      data = { items: summaries, totalCount: entries.length, page: pageNumber, pageSize: 25 }
    } else if (/\/entries\/[^/]+$/.test(path)) data = { experiment, entry: selected, authors }
    else data = metadata()
    await route.fulfill({ json: { success: true, data } })
  })
  return { experiment, entries }
}
async function keepDraft(page: import('@playwright/test').Page) {
  const review = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Review the latest saved notebook' }) })
  await review.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'I reviewed the latest entry; keep my edits' }).click()
}

test('structured editing retains a conflicted draft and saves only after review', async ({ page }, info) => {
  await fixture(page, 'active')
  await page.goto(`/e2e/fixtures/research.html?view=editor${info.project.name === 'mobile-chrome' ? '&dark=true' : ''}`)
  await page.getByLabel('Notes', { exact: true }).fill('Retain my observation: 5 µL')
  await page.getByRole('button', { name: 'Add table', exact: true }).click()
  await page.getByLabel('Row 1, Measurement (unit)', { exact: true }).fill('42')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Review the latest saved notebook' })).toBeVisible()
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Retain my observation: 5 µL')
  await expect(page.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  await keepDraft(page)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('heading', { name: 'Pilot notebook', exact: true })).toBeVisible()
  await expect(page.getByText('Retain my observation: 5 µL', { exact: true })).toBeVisible()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
})

test('reopens a completed experiment while retaining its unsaved scientific draft', async ({ page }) => {
  await fixture(page, 'complete'); await page.goto('/e2e/fixtures/research.html?view=editor')
  await page.getByLabel('Notes', { exact: true }).fill('Keep this measurement')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.getByRole('button', { name: 'Reopen experiment', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Reopen experiment?' })
  await expect(dialog.locator('[data-slot="dialog-body"]')).toContainText('Your unsaved entry remains')
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()
  await dialog.getByRole('button', { name: 'Reopen experiment' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByLabel('Notes', { exact: true })).toHaveValue('Keep this measurement')
  await keepDraft(page)
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByText('Keep this measurement', { exact: true })).toBeVisible()
})

test('completion confirmation has body, Cancel focus and focus return; completed entries are read-only', async ({ page }) => {
  await fixture(page); await page.goto('/e2e/fixtures/research.html')
  await page.locator('#research-experiment-actions').click()
  await page.getByRole('menuitem', { name: 'Complete experiment', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Complete experiment?' })
  await expect(dialog.locator('[data-slot="dialog-body"]')).toContainText('read-only until reopened')
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible(); await expect(page.locator('#research-experiment-actions')).toBeFocused()
  await page.locator('#research-experiment-actions').click()
  await page.getByRole('menuitem', { name: 'Complete experiment', exact: true }).click()
  await page.getByRole('button', { name: 'Complete experiment', exact: true }).click()
  await expect(page.getByText('Reopen the experiment to add or edit entries.')).toBeVisible()
  await page.getByRole('link', { name: 'Pilot notebook' }).click()
  await expect(page.getByRole('button', { name: 'View history', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Edit entry', exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('canceling Add entry leaves no permanent record and creation uses the local calendar day', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-17T02:30:00Z') })
  const state = await fixture(page); await page.goto('/e2e/fixtures/research.html')
  await page.getByRole('button', { name: 'Add entry', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Add notebook entry' })
  await expect(dialog.getByLabel('Entry date')).toHaveValue('2026-10-16')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  expect(state.entries).toHaveLength(1)
  await page.getByRole('button', { name: 'Add entry', exact: true }).click()
  await dialog.getByRole('button', { name: 'Create entry', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Edit: Entry 2', exact: true })).toBeVisible()
  expect(state.entries).toHaveLength(2)
  expect(state.entries[1].entryDate).toBe('2026-10-16')
})

test('copy without an experiment date sends the same local initial entry date', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-17T02:30:00Z') })
  await fixture(page); await page.goto('/e2e/fixtures/research.html')
  await page.locator('#research-experiment-actions').click(); await page.getByRole('menuitem', { name: 'Copy setup', exact: true }).click()
  const request = page.waitForRequest(request => request.method() === 'POST' && request.url().includes('/copy'))
  await page.getByRole('dialog', { name: 'Copy experiment setup' }).getByRole('button', { name: 'Copy setup', exact: true }).click()
  expect((await request).postDataJSON()).toMatchObject({ experimentDate: null, initialEntryDate: '2026-10-16' })
})

test('invalid section labels announce and focus their specific error', async ({ page }) => {
  await fixture(page); await page.goto('/e2e/fixtures/research.html?view=editor')
  const label = page.getByLabel('Section label')
  await label.fill(''); await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(label).toBeFocused(); await expect(label).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Enter a section label.', { exact: true })).toBeVisible()
  await label.fill('Corrected method')
  await expect(page.getByText('Enter a section label.', { exact: true })).not.toBeVisible()
})

test('experiment pages fetch summaries and load one entry only after opening it', async ({ page }) => {
  const state = await fixture(page)
  for (let index = 1; index <= 26; index++) state.entries.push({ ...state.entries[0], id: `77777777-7777-4777-8777-${String(index).padStart(12, '0')}`, title: `Long notebook entry ${index}` })
  const entryReads: string[] = []
  page.on('request', request => { if (/\/api\/research\/experiments\/[^/]+\/entries\/[^/?]+(?:\?|$)/.test(request.url())) entryReads.push(request.url()) })
  await page.goto('/e2e/fixtures/research.html')
  await expect(page.getByRole('link', { name: 'Pilot notebook' })).toBeVisible()
  expect(entryReads).toHaveLength(0)
  await expect(page.getByText('Flexible pilot method', { exact: true })).toHaveCount(0)
  await page.getByRole('navigation', { name: 'Notebook entry pages' }).getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Long notebook entry 26', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Long notebook entry 26', exact: true }).click()
  await expect(page.getByText('Flexible pilot method', { exact: true })).toBeVisible()
  expect(entryReads).toHaveLength(1)
})

test('R&D hides notebooks from unauthorized or external organization contexts', async ({ page }) => {
  await fixture(page)
  for (const query of ['denied=true', 'external=true']) {
    await page.goto(`/e2e/fixtures/research.html?${query}`)
    await expect(page.getByText('Select Phaeno with an assigned Researcher role or platform administrator access.')).toBeVisible()
    await expect(page.getByText('Flexible pilot method')).toHaveCount(0)
  }
})
