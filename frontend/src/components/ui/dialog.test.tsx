import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'

function TestDialog() {
  const [open, setOpen] = useState(true)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Example modal</DialogTitle>
        <DialogDescription>Example content</DialogDescription>
      </DialogContent>
    </Dialog>
  )
}

describe('DialogContent', () => {
  it('requires an explicit dismissal instead of closing on an outside click', () => {
    render(<TestDialog />)

    fireEvent.pointerDown(document.body)
    expect(screen.getByRole('dialog', { name: 'Example modal' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Example modal' })).toBeNull()
  })

  it('keeps direct headers and footers outside the scrolling body', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Structured modal</DialogTitle>
            <DialogDescription>Fixed regions</DialogDescription>
          </DialogHeader>
          <div>Scrollable content</div>
          <DialogFooter>Fixed actions</DialogFooter>
        </DialogContent>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Structured modal' })
    expect(dialog.querySelector(':scope > [data-slot="dialog-header"]')).toBeTruthy()
    expect(dialog.querySelector(':scope > [data-slot="dialog-body"]')).toBeTruthy()
    expect(dialog.querySelector(':scope > [data-slot="dialog-footer"]')).toBeTruthy()
  })

  it('keeps form-wrapped headers and footers fixed without moving actions out of the form', () => {
    render(
      <Dialog open>
        <DialogContent>
          <form>
            <DialogHeader>
              <DialogTitle>Form modal</DialogTitle>
              <DialogDescription>Fixed form regions</DialogDescription>
            </DialogHeader>
            <div>Scrollable fields</div>
            <DialogFooter>
              <button type="submit">Save</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>,
    )

    const form = screen.getByRole('dialog', { name: 'Form modal' }).querySelector('form')
    expect(form?.querySelector(':scope > [data-slot="dialog-header"]')).toBeTruthy()
    expect(form?.querySelector(':scope > [data-slot="dialog-body"]')).toBeTruthy()
    expect(form?.querySelector(':scope > [data-slot="dialog-footer"]')).toBeTruthy()
  })
})
