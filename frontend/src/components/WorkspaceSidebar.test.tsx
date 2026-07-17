import { fireEvent, render, screen, within } from '@testing-library/react'
import { Circle, Square } from 'lucide-react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WorkspaceSidebar, type WorkspaceSidebarItem } from './WorkspaceSidebar'

type Section = 'first' | 'second'

const sections: ReadonlyArray<WorkspaceSidebarItem<Section>> = [
  { value: 'first', label: 'First', description: 'First section', icon: Circle },
  { value: 'second', label: 'Second', description: 'Second section', icon: Square },
]

describe('WorkspaceSidebar', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubGlobal('matchMedia', () => ({
      matches: true,
      media: '(min-width: 64rem)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => vi.unstubAllGlobals())

  it('remembers pinning and uses the non-modal rail when the sidebar is unpinned', () => {
    render(<SidebarHarness />)

    const sidebar = screen.getByRole('complementary', { name: 'Example sidebar' })
    expect(within(sidebar).getByRole('heading', { name: 'Example' })).toBeTruthy()
    expect(within(sidebar).getByRole('button', { name: 'Unpin sidebar' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Example sections' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Unpin sidebar' }))

    expect(window.localStorage.getItem('phaeno:workspace-sidebar-pinned')).toBe('false')
    const edgeTab = screen.getByRole('button', {
      name: 'Open Example navigation; current selection: First',
    })
    fireEvent.mouseEnter(edgeTab)

    expect(screen.queryByRole('dialog')).toBe(null)
    expect(screen.getByRole('navigation', { name: 'Example sections' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Second/ }))

    expect(screen.getByText('Current section: second')).toBeTruthy()
    expect(screen.getByRole('button', {
      name: 'Open Example navigation; current selection: Second',
    })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', {
      name: 'Open Example navigation; current selection: Second',
    }))
    fireEvent.click(screen.getByRole('button', { name: 'Pin sidebar' }))

    expect(window.localStorage.getItem('phaeno:workspace-sidebar-pinned')).toBe('true')
    expect(screen.getByRole('navigation', { name: 'Example sections' })).toBeTruthy()
  })

  it('omits pin controls on narrow layouts', () => {
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      media: '(min-width: 64rem)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    render(<SidebarHarness />)
    fireEvent.click(screen.getByRole('button', {
      name: 'Open Example navigation; current selection: First',
    }))

    expect(screen.getByRole('heading', { name: 'Example' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Unpin sidebar' })).toBe(null)
    expect(screen.queryByRole('button', { name: 'Pin sidebar' })).toBe(null)

    fireEvent.mouseMove(document, { clientX: 500, clientY: 300 })
    expect(
      screen.queryByRole('navigation', { name: 'Example sections' }),
    ).toBe(null)
  })
})

function SidebarHarness() {
  const [section, setSection] = useState<Section>('first')

  return (
    <WorkspaceSidebar
      workspaceLabel="Example"
      items={sections}
      value={section}
      onValueChange={setSection}
    >
      <p>Current section: {section}</p>
    </WorkspaceSidebar>
  )
}
