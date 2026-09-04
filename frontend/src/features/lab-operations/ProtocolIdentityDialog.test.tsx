import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { LabProtocol } from '#/api/lab-operations'

import { ProtocolIdentityDialog } from './ProtocolIdentityDialog'

const protocol: LabProtocol = {
  id: 'protocol-1',
  key: 'reference-library-preparation',
  name: 'Reference library preparation',
  description: 'Original description',
  latestVersion: 1,
  versions: [],
  version: 3,
}

describe('Protocol identity dialog', () => {
  it('edits identifying details while presenting the immutable key as read-only text', async () => {
    const onSubmit = vi.fn()
    render(
      <ProtocolIdentityDialog
        protocol={protocol}
        isPending={false}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByText(protocol.key)).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Protocol key' })).toBeNull()

    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Updated preparation protocol' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(
      {
        name: 'Updated preparation protocol',
        description: 'Original description',
      },
      expect.anything(),
    ))
  })
})
