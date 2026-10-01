import { createRef, type ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChevronDown } from 'lucide-react'
import { Button } from './button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './dropdown-menu'

function Menu({ children, triggerRef }: { children: ReactNode; triggerRef?: React.Ref<HTMLButtonElement> }) {
  return <ActionMenu><DropdownMenuTrigger asChild><Button ref={triggerRef} size="icon-sm" aria-label="Record actions">Actions</Button></DropdownMenuTrigger><DropdownMenuContent>{children}</DropdownMenuContent></ActionMenu>
}
describe('record action presentation', () => {
  it('surfaces a single visible action and preserves its callback and focus ref', () => {
    const select = vi.fn(); const ref = createRef<HTMLButtonElement>()
    render(<Menu triggerRef={ref}><DropdownMenuLabel>Record</DropdownMenuLabel><>{null}<DropdownMenuItem onSelect={select}>Edit record</DropdownMenuItem></><DropdownMenuSeparator /></Menu>)
    const button = screen.getByRole('button', { name: 'Edit record' })
    expect(button.getAttribute('aria-haspopup')).toBeNull()
    expect(ref.current).toBe(button)
    fireEvent.click(button)
    expect(select).toHaveBeenCalledTimes(1)
    ref.current?.focus(); expect(document.activeElement).toBe(button)
  })
  it('retains a dropdown for multiple actions including disabled actions', () => {
    render(<Menu><DropdownMenuItem>Edit</DropdownMenuItem><DropdownMenuItem disabled>Delete</DropdownMenuItem></Menu>)
    const trigger = screen.getByRole('button', { name: 'Record actions' })
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    const indicator = trigger.querySelector('svg.lucide-chevron-down')
    expect(indicator).not.toBeNull()
    expect(indicator?.getAttribute('aria-hidden')).toBe('true')
    expect(trigger.getAttribute('data-size')).toBe('sm')
  })
  it('does not duplicate a chevron already supplied by the screen', () => {
    render(<ActionMenu><DropdownMenuTrigger asChild><Button>Actions <ChevronDown aria-hidden="true" /></Button></DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem>Edit</DropdownMenuItem><DropdownMenuItem>Delete</DropdownMenuItem></DropdownMenuContent></ActionMenu>)
    expect(screen.getByRole('button', { name: 'Actions' }).querySelectorAll('svg.lucide-chevron-down')).toHaveLength(1)
  })
  it('adds or removes the dropdown cue as permission-dependent actions change', () => {
    const ref = createRef<HTMLButtonElement>()
    const { rerender } = render(<Menu triggerRef={ref}><DropdownMenuItem>Edit record</DropdownMenuItem></Menu>)
    expect(ref.current?.querySelector('svg.lucide-chevron-down')).toBeNull()
    rerender(<Menu triggerRef={ref}><DropdownMenuItem>Edit record</DropdownMenuItem><DropdownMenuItem>Delete record</DropdownMenuItem></Menu>)
    const trigger = screen.getByRole('button', { name: 'Record actions' })
    expect(ref.current).toBe(trigger)
    expect(trigger.querySelectorAll('svg.lucide-chevron-down')).toHaveLength(1)
    rerender(<Menu triggerRef={ref}><DropdownMenuItem>Edit record</DropdownMenuItem></Menu>)
    const direct = screen.getByRole('button', { name: 'Edit record' })
    expect(ref.current).toBe(direct)
    expect(direct.getAttribute('aria-haspopup')).toBeNull()
    expect(direct.querySelector('svg.lucide-chevron-down')).toBeNull()
  })
  it('does not render an empty action group', () => {
    render(<Menu>{null}</Menu>)
    expect(screen.queryByRole('button')).toBeNull()
  })
  it('keeps a disabled destructive action disabled', () => {
    const select = vi.fn()
    render(<Menu><DropdownMenuItem disabled variant="destructive" onSelect={select}>Retire</DropdownMenuItem></Menu>)
    const button = screen.getByRole('button', { name: 'Retire' })
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('data-variant')).toBe('destructive')
    fireEvent.click(button); expect(select).not.toHaveBeenCalled()
  })
  it('preserves link destinations', () => {
    render(<Menu><DropdownMenuItem asChild><a href="/record">Review record</a></DropdownMenuItem></Menu>)
    expect(screen.getByRole('link', { name: 'Review record' }).getAttribute('href')).toBe('/record')
  })
  it('removes navigation from a disabled link action', () => {
    render(<Menu><DropdownMenuItem asChild disabled><a href="/record">Review record</a></DropdownMenuItem></Menu>)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('button', { name: 'Review record' }).hasAttribute('disabled')).toBe(true)
  })
})
