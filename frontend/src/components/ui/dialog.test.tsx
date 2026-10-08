import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Fragment, useState } from 'react'
import { vi } from 'vitest'

import { Alert } from './alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFeedback,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogReturnFocus,
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
  it('returns a menu-launched dialog to the surviving row control when its opener disappears', async () => {
    function MenuDialog() {
      const [open, setOpen] = useState(false)
      const [target, setTarget] = useState<HTMLButtonElement | null>(null)
      return <><button ref={setTarget}>Row Actions</button>{!open ? <button onClick={() => setOpen(true)}>Menu action</button> : null}
        <DialogReturnFocus target={target}><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Row action</DialogTitle><DialogDescription>Confirm this request.</DialogDescription></DialogHeader><div>Request contents</div><DialogFooter><button onClick={() => setOpen(false)}>Keep request</button></DialogFooter></DialogContent></Dialog></DialogReturnFocus></>
    }
    render(<MenuDialog />)
    screen.getByRole('button', { name: 'Menu action' }).focus()
    fireEvent.click(screen.getByRole('button', { name: 'Menu action' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep request' }))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Row Actions' })))
  })
  it('requires an explicit dismissal instead of closing on an outside click', () => {
    render(<TestDialog />)

    fireEvent.pointerDown(document.body)
    expect(screen.getByRole('dialog', { name: 'Example modal' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Example modal' })).toBeNull()
  })

  it('keeps direct headers and footers outside the scrolling body', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Structured modal</DialogTitle>
            <DialogDescription>Fixed regions</DialogDescription>
          </DialogHeader>
          <DialogFeedback>Persistent error</DialogFeedback>
          <div>Scrollable content</div>
          <DialogFooter>Fixed actions</DialogFooter>
        </DialogContent>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Structured modal' })
    const header = dialog.querySelector(':scope > [data-slot="dialog-header"]')
    const footer = dialog.querySelector(':scope > [data-slot="dialog-footer"]')
    expect(header).toBeTruthy()
    expect(header?.querySelector(':scope > [data-slot="dialog-feedback"]')).toBeTruthy()
    expect(header?.classList.contains('bg-muted/40')).toBe(true)
    expect(dialog.querySelector(':scope > [data-slot="dialog-body"]')).toBeTruthy()
    expect(footer).toBeTruthy()
    expect(footer?.classList.contains('bg-muted/40')).toBe(true)
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('same key')
    consoleError.mockRestore()
  })

  it('keeps nested conditional fragment actions fixed and sibling keys distinct', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conditional modal</DialogTitle>
            <DialogDescription>Fixed actions across steps</DialogDescription>
          </DialogHeader>
          <Fragment key="first">
            <div key="field">First field</div>
          </Fragment>
          <Fragment key="second">
            <div key="field">Second field</div>
            <>
              <DialogFooter><button type="button">Review</button></DialogFooter>
            </>
          </Fragment>
        </DialogContent>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Conditional modal' })
    expect(dialog.querySelector(':scope > [data-slot="dialog-footer"]')?.textContent).toBe('Review')
    const body = dialog.querySelector(':scope > [data-slot="dialog-body"]')
    expect(body?.textContent).toBe('First fieldSecond field')
    expect(body?.querySelector('[data-slot="dialog-footer"]')).toBeNull()
    expect(consoleError.mock.calls.flat().join(' ')).not.toContain('same key')
    consoleError.mockRestore()
  })

  it('does not render an empty scrolling body between a header and footer', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm action</DialogTitle>
            <DialogDescription>This action keeps its recorded history.</DialogDescription>
          </DialogHeader>
          <DialogFooter>Confirmation actions</DialogFooter>
        </DialogContent>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Confirm action' })
    expect(dialog.querySelector(':scope > [data-slot="dialog-header"]')).toBeTruthy()
    expect(dialog.querySelector(':scope > [data-slot="dialog-body"]')).toBeNull()
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
            <DialogFeedback>Persistent form error</DialogFeedback>
            <div>Scrollable fields</div>
            <DialogFooter>
              <button type="submit">Save</button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>,
    )

    const form = screen.getByRole('dialog', { name: 'Form modal' }).querySelector('form')
    const header = form?.querySelector(':scope > [data-slot="dialog-header"]')
    expect(header).toBeTruthy()
    expect(header?.querySelector(':scope > [data-slot="dialog-feedback"]')).toBeTruthy()
    expect(form?.querySelector(':scope > [data-slot="dialog-body"]')).toBeTruthy()
    expect(form?.querySelector(':scope > [data-slot="dialog-footer"]')).toBeTruthy()
  })

  it('moves direct destructive alerts into the fixed modal header by default', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Failed action</DialogTitle>
            <DialogDescription>Review the failed action before retrying.</DialogDescription>
          </DialogHeader>
          <Alert variant="destructive">The action failed.</Alert>
          <div>Scrollable content</div>
          <DialogFooter>Fixed actions</DialogFooter>
        </DialogContent>
      </Dialog>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Failed action' })
    const header = dialog.querySelector(':scope > [data-slot="dialog-header"]')
    expect(header?.querySelector(':scope > [data-slot="alert"]')).toBeTruthy()
    expect(dialog.querySelector(':scope > [data-slot="dialog-body"] [data-slot="alert"]')).toBeNull()
  })
})
