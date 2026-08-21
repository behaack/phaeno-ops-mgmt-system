import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Label } from '#/components/ui/label'
import { RequiredDialogFooter } from '#/components/ui/required-field'

describe('required field presentation', () => {
  it('keeps a legacy label marker adjacent while hiding it from the accessible name', () => {
    const { container } = render(
      <>
        <Label htmlFor="first-name">First name *</Label>
        <input id="first-name" />
      </>,
    )

    expect(screen.getByLabelText('First name')).toBeTruthy()

    const fieldName = container.querySelector('[data-slot="required-field-name"]')
    const marker = fieldName?.querySelector('[data-slot="required-mark"]')
    expect(fieldName?.textContent).toBe('First name*')
    expect(marker?.getAttribute('aria-hidden')).toBe('true')
  })

  it('places the required legend before the modal action group', () => {
    const { container } = render(
      <RequiredDialogFooter>
        <button type="button">Cancel</button>
        <button type="submit">Save</button>
      </RequiredDialogFooter>,
    )

    const footer = container.querySelector('[data-slot="dialog-footer"]')
    const legend = container.querySelector('[data-slot="required-legend"]')
    const actions = legend?.nextElementSibling

    expect(footer?.firstElementChild).toBe(legend)
    expect(legend?.textContent).toBe('* Required')
    expect(actions?.contains(screen.getByRole('button', { name: 'Cancel' }))).toBe(true)
    expect(actions?.contains(screen.getByRole('button', { name: 'Save' }))).toBe(true)
  })
})
