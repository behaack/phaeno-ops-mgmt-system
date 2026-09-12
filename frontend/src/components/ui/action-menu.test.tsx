import { createRef, type ReactNode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
    expect(screen.getByRole('button', { name: 'Record actions' }).getAttribute('aria-haspopup')).toBe('menu')
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
