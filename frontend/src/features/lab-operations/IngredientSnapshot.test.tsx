import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { IngredientSnapshot } from './IngredientSnapshot'

it('shows the frozen conditions and their historical meaning', () => {
  render(<IngredientSnapshot snapshot={JSON.stringify({ schemaVersion: 2, lotNumber: 'LOT-ORIGINAL', capturedAtUtc: '2026-10-20T10:00:00Z', qcDisposition: 'Passed',
    definition: { name: 'Original reagent' }, supplier: { name: 'Original supplier' }, product: { productNumber: 'P-1', description: 'Original catalog' }, storage: { name: 'Original freezer' }, expirationOrRetestDate: '2026-11-01' })} />)
  expect(screen.getByText('Original supplier')).toBeDefined()
  expect(screen.getByText('Passed')).toBeDefined()
  expect(screen.getByText(/Later lot or catalog changes/)).toBeDefined()
})
it('keeps missing historical capture explicitly unknown', () => {
  render(<IngredientSnapshot snapshot={null} />)
  expect(screen.getByText(/Historical lot conditions unknown/)).toBeDefined()
})
it('reports malformed saved evidence instead of current-condition substitution', () => {
  render(<IngredientSnapshot snapshot="invalid" />)
  expect(screen.getByRole('alert').textContent).toContain('could not be read')
})
