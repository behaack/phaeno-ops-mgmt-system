import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { LifecycleActionDialog } from './LifecycleActionDialog'

describe('LifecycleActionDialog', () => {
  it('requires and returns an entitlement end reason', async () => {
    const onConfirm = vi.fn()

    render(
      <LifecycleActionDialog
        action={{
          kind: 'end-entitlement',
          organizationName: 'Atlas Research',
          serviceName: 'PSeq Lab Service',
        }}
        isPending={false}
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'End entitlement' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Record why the entitlement is ending.',
    )
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/End reason/), {
      target: { value: 'Commercial term ended.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'End entitlement' }))

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith('Commercial term ended.'),
    )
  })

  it('names the membership and organization before deactivation', () => {
    render(
      <LifecycleActionDialog
        action={{
          kind: 'deactivate-member',
          memberEmail: 'member@example.com',
          organizationName: 'Atlas Research',
        }}
        isPending={false}
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('dialog', { name: 'Deactivate membership' }),
    ).toBeTruthy()
    expect(screen.getByText(/member@example.com.*Atlas Research/)).toBeTruthy()
  })
})
